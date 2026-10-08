/**
 * lib/ai.ts
 * Server-only Anthropic SDK integration.
 *
 * Rules:
 * - AI NEVER changes numbers. Numbers come only from model.ts / pricing.ts.
 * - Every call is logged to ai_logs (prompt, response, latency, fallback used).
 * - 4-second timeout; on failure, returns the template fallback.
 * - Prompts are named constants for auditability.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

// ── Prompt templates (named constants — do not inline inline) ──────────────

const INSIGHT_PROMPT_TEMPLATE = (
  produceType: string,
  qtyKg: number,
  origin: string,
  destination: string,
  remainingLifeH: number,
  etaH: number,
  tier: string,
  readingsSummary: string
) => `You are an expert cold-chain logistics analyst.

Shipment details:
- Produce: ${produceType} (${qtyKg} kg)
- Route: ${origin} → ${destination} (${etaH}h ETA)
- Current remaining shelf life: ${remainingLifeH.toFixed(1)}h
- Risk tier: ${tier}

Recent temperature/humidity readings summary:
${readingsSummary}

Write 2-3 sentences in plain English:
1. Diagnose what happened (e.g. suspected cooling failure window and its timing).
2. Give one concrete recommended action (reroute, accelerate delivery, sell locally, etc.).

Rules:
- Do NOT mention specific numbers unless they are given above.
- Do NOT speculate beyond the data provided.
- No bullet points. Flowing prose only.
- Maximum 60 words.`;

const RETAILER_MSG_PROMPT_TEMPLATE = (
  produceType: string,
  qtyKg: number,
  remainingLifeH: number,
  originalPrice: number,
  discountedPrice: number,
  discountPct: number
) => `Write a short, urgent, friendly retail markdown message for Indian grocery retailers.

Details:
- Produce: ${produceType} (${qtyKg} kg available)
- Freshness remaining: ${remainingLifeH.toFixed(0)}h
- Original price: ₹${originalPrice}/kg
- New price: ₹${discountedPrice}/kg (${discountPct}% off)

Rules:
- Maximum 30 words.
- Use ₹ symbol for prices.
- Friendly, urgent tone. Emphasize freshness window and savings.
- No hashtags. No emojis. Plain text output only.`;

// ── Template fallbacks (used when AI fails or times out) ──────────────────

export function insightFallback(
  produceType: string,
  remainingLifeH: number,
  tier: string
): string {
  return `${produceType} shipment has ${remainingLifeH.toFixed(0)}h shelf life remaining (${tier} tier). ` +
    `Temperature excursion detected. Recommend expediting delivery or redirecting to nearest retail partner.`;
}

export function retailerMsgFallback(
  produceType: string,
  remainingLifeH: number,
  discountedPrice: number,
  discountPct: number
): string {
  return `Fresh ${produceType} now at ₹${discountedPrice}/kg — ${discountPct}% off. ` +
    `Only ${Math.floor(remainingLifeH)}h freshness left. Buy now before stock runs out.`;
}

// ── AI client ──────────────────────────────────────────────────────────────

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

/** Call Claude with a 4s timeout; returns text or null on failure */
async function callClaude(prompt: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const client = getClient();
    const msg = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 150,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal as AbortSignal }
    );
    const text =
      msg.content[0]?.type === "text" ? msg.content[0].text.trim() : null;
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Log ai call to ai_logs table */
async function logAiCall(
  kind: string,
  prompt: string,
  response: string,
  latencyMs: number,
  usedFallback: boolean
): Promise<void> {
  await db.from("ai_logs").insert({
    kind,
    prompt: prompt.slice(0, 4000),     // trim for storage
    response: response.slice(0, 2000),
    latency_ms: latencyMs,
    used_fallback: usedFallback,
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface InsightParams {
  produceType: string;
  qtyKg: number;
  origin: string;
  destination: string;
  remainingLifeH: number;
  etaH: number;
  tier: string;
  readingsSummary: string; // pre-formatted by pipeline
}

/** Generate an AI insight or return template fallback */
export async function generateInsight(params: InsightParams): Promise<string> {
  const prompt = INSIGHT_PROMPT_TEMPLATE(
    params.produceType,
    params.qtyKg,
    params.origin,
    params.destination,
    params.remainingLifeH,
    params.etaH,
    params.tier,
    params.readingsSummary
  );

  const start = Date.now();
  const aiResponse = await callClaude(prompt);
  const latencyMs = Date.now() - start;
  const usedFallback = !aiResponse;
  const response =
    aiResponse ?? insightFallback(params.produceType, params.remainingLifeH, params.tier);

  // Fire-and-forget logging
  logAiCall("insight", prompt, response, latencyMs, usedFallback).catch(
    (e) => console.error("[ai] log error:", e)
  );

  return response;
}

export interface RetailerMsgParams {
  produceType: string;
  qtyKg: number;
  remainingLifeH: number;
  originalPrice: number;
  discountedPrice: number;
  discountPct: number;
}

/** Generate a retailer-facing markdown message or return template fallback */
export async function generateRetailerMessage(
  params: RetailerMsgParams
): Promise<string> {
  const prompt = RETAILER_MSG_PROMPT_TEMPLATE(
    params.produceType,
    params.qtyKg,
    params.remainingLifeH,
    params.originalPrice,
    params.discountedPrice,
    params.discountPct
  );

  const start = Date.now();
  const aiResponse = await callClaude(prompt);
  const latencyMs = Date.now() - start;
  const usedFallback = !aiResponse;
  const response =
    aiResponse ??
    retailerMsgFallback(
      params.produceType,
      params.remainingLifeH,
      params.discountedPrice,
      params.discountPct
    );

  logAiCall("retailer_message", prompt, response, latencyMs, usedFallback).catch(
    (e) => console.error("[ai] log error:", e)
  );

  return response;
}
