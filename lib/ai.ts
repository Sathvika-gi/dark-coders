/**
 * lib/ai.ts
 * AI utilities for generating insights and markup context via Google Gemini API.
 * This file is server-only and handles the timeout/fallback logic.
 */
import "server-only";
import { db } from "./db";
import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
function getGenAIClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      // Create a dummy client to avoid crashing if no key is supplied.
      // Callers will fail gracefully and fallback.
      return {
        getGenerativeModel: () => ({
          generateContent: async () => ({ response: { text: () => "" } })
        })
      } as unknown as GoogleGenerativeAI;
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

const INSIGHT_PROMPT_TEMPLATE = `
You are an expert cold-chain logistics analyst.

Shipment details:
- Produce: {produce} ({qty} kg)
- Route: {origin} → {destination} ({eta}h ETA)
- Current remaining shelf life: {remaining}h
- Risk tier: {tier}

Recent temperature/humidity readings summary:
{readingsSummary}

Write 2-3 sentences in plain English:
1. Diagnose what happened (e.g. suspected cooling failure window and its timing).
2. Give one concrete recommended action (reroute, accelerate delivery, sell locally, etc.).

Rules:
- Do NOT mention specific numbers unless given above.
- Do NOT speculate beyond data provided.
- No bullet points. Flowing prose only.
- Maximum 60 words.
`;

const RETAILER_MSG_PROMPT_TEMPLATE = `
Write a short, urgent, friendly retail markdown message for Indian grocery retailers.

Details:
- Produce: {produce} ({qty} kg available)
- Freshness remaining: {remaining}h
- Original price: ₹{original}/kg
- New price: ₹{discounted}/kg ({pct}% off)

Rules:
- Maximum 30 words.
- Use ₹ symbol for prices.
- Friendly, urgent tone. Emphasize freshness window and savings.
- No hashtags. No emojis. Plain text output only.
`;

// Helper: withTimeout guarantees the AI call doesn't hold up the pipeline
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function askGemini(prompt: string, maxTokens = 150): Promise<{ text: string; latency_ms: number }> {
  try {
    const ai = getGenAIClient();
    const modelContext = ai.getGenerativeModel({ model: "gemini-1.5-flash" }); // Fast, capable model
    
    const start = Date.now();
    const result = await withTimeout(
      modelContext.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 }
      }),
      4000
    );
    return {
      text: result.response.text(),
      latency_ms: Date.now() - start,
    };
  } catch (e) {
    if ((e as Error).message === "AI timeout") throw e;
    console.error("[ai] Gemini Error:", e);
    throw new Error("Gemini API Error");
  }
}

export function insightFallback(produceType: string, remainingLifeH: number, tier: string): string {
  return `${produceType} shipment has ${remainingLifeH.toFixed(0)}h shelf life remaining (${tier} tier). Temperature excursion detected. Recommend expediting delivery or redirecting to nearest retail partner.`;
}

export function retailerMsgFallback(produceType: string, discountedPrice: number, discountPct: number, remainingLifeH: number): string {
  return `Fresh ${produceType} now at ₹${discountedPrice}/kg — ${discountPct}% off. Only ${remainingLifeH.toFixed(0)}h freshness left. Buy now before stock runs out.`;
}

/**
 * Generate (or use fallback) an analytical insight for the dashboard.
 */
export async function generateInsight(
  produceType: string,
  qtyKg: number,
  origin: string,
  destination: string,
  remainingLifeH: number,
  etaH: number,
  tier: string,
  readingsSummary: string
): Promise<string> {
  let prompt = INSIGHT_PROMPT_TEMPLATE;
  prompt = prompt.replace("{produce}", produceType);
  prompt = prompt.replace("{qty}", qtyKg.toString());
  prompt = prompt.replace("{origin}", origin);
  prompt = prompt.replace("{destination}", destination);
  prompt = prompt.replace("{remaining}", remainingLifeH.toFixed(1));
  prompt = prompt.replace("{eta}", etaH.toString());
  prompt = prompt.replace("{tier}", tier);
  prompt = prompt.replace("{readingsSummary}", readingsSummary);

  const fallback = insightFallback(produceType, remainingLifeH, tier);

  try {
    const { text, latency_ms } = await askGemini(prompt, 100);
    await db.from("ai_logs").insert({
      kind: "insight",
      prompt,
      response: text,
      latency_ms,
      used_fallback: false,
    });
    return text;
  } catch (e) {
    console.warn("[ai] Insight fallback triggered:", (e as Error).message);
    await db.from("ai_logs").insert({
      kind: "insight",
      prompt,
      response: fallback,
      latency_ms: 0,
      used_fallback: true,
    });
    return fallback;
  }
}

/**
 * Generate (or use fallback) a retailer-facing markdown alert.
 */
export async function generateRetailerMessage(
  produceType: string,
  qtyKg: number,
  remainingLifeH: number,
  originalPrice: number,
  discountedPrice: number,
  discountPct: number
): Promise<string> {
  let prompt = RETAILER_MSG_PROMPT_TEMPLATE;
  prompt = prompt.replace("{produce}", produceType);
  prompt = prompt.replace("{qty}", qtyKg.toString());
  prompt = prompt.replace("{remaining}", remainingLifeH.toFixed(0));
  prompt = prompt.replace("{original}", originalPrice.toString());
  prompt = prompt.replace("{discounted}", discountedPrice.toString());
  prompt = prompt.replace("{pct}", discountPct.toString());

  const fallback = retailerMsgFallback(produceType, discountedPrice, discountPct, remainingLifeH);

  try {
    const { text, latency_ms } = await askGemini(prompt, 80);
    await db.from("ai_logs").insert({
      kind: "retailer_message",
      prompt,
      response: text,
      latency_ms,
      used_fallback: false,
    });
    return text.trim().replace(/^"|"$/g, ""); // Strip quotes if any
  } catch (e) {
    console.warn("[ai] Retailer message fallback triggered:", (e as Error).message);
    await db.from("ai_logs").insert({
      kind: "retailer_message",
      prompt,
      response: fallback,
      latency_ms: 0,
      used_fallback: true,
    });
    return fallback;
  }
}
