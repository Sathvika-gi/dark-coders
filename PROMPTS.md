# PROMPTS.md — AgroSense AI Prompt Log

This document records every major prompt given/used during development of AgroSense,
along with what was changed or corrected afterwards.

---

## Prompt 1: Initial Build Request (User → Agent)

**Given:** Full specification for AgroSense — a perishable cold-chain monitoring platform with:
- Next.js 15 App Router, TypeScript, Tailwind CSS
- Supabase Postgres (server-side only, service-role)
- Q10 kinetic shelf-life model with demo spike calibration
- Claude Sonnet AI integration (server-side only)
- Distributor + Retailer roles, httpOnly JWT sessions
- 8-phase build plan

**Corrections applied:**
- `create-next-app` scaffold used (non-interactive)
- Zod v4 API has no `required_error` on number params — fixed in `lib/schemas.ts`
- Next.js 15 route params are `Promise<{ id: string }>` — used `await params`
- Added `current_tier` column to `shipments` table (needed by `tierWorsened()`)
- Rate-limit RPC function added to `schema.sql` for `checkRateLimit()`
- `date-fns` added as dependency for `TempChart` timestamp formatting
- `server-only` import used in `lib/db.ts`, `lib/auth.ts`, `lib/ai.ts`

---

## Prompt 2: AI Insight Prompt (lib/ai.ts → Claude)

**Template constant `INSIGHT_PROMPT_TEMPLATE`:**

```
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
```

**What changed:** Kept identical. Fallback: "X shipment has Nh shelf life remaining (tier). Temperature excursion detected. Recommend expediting delivery or redirecting to nearest retail partner."

---

## Prompt 3: Retailer Message Prompt (lib/ai.ts → Claude)

**Template constant `RETAILER_MSG_PROMPT_TEMPLATE`:**

```
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
```

**What changed:** Kept identical. Fallback: "Fresh {produce} now at ₹{price}/kg — {pct}% off. Only {N}h freshness left. Buy now before stock runs out."

---

## Key Decisions Documented

1. **AI numbers rule**: Claude is explicitly instructed "Do NOT mention specific numbers unless they are given above." All numbers come from `model.ts` and `pricing.ts`.
2. **4s timeout**: Claude is given a 4s timeout. On failure, the template fallback is kept and `used_fallback=true` is logged.
3. **Async AI pattern**: Template listing is saved *first*, then AI updates it. Judges see data immediately without waiting for AI.
4. **Append-only telemetry**: Postgres trigger blocks UPDATE and DELETE. Reset demo adds an alert row instead of deleting telemetry.
5. **Rate limiting**: Postgres RPC `increment_rate_limit` uses upsert + conflict for atomic counting. 60 req/min per key.
