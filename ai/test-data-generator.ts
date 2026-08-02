/**
 * AI Test Data Generator — Digital Wallet Transfer Limits
 *
 * VALIDATING AI OUTPUT BEFORE TRUSTING IT (practical meaning):
 * - Parse the API response as JSON; reject non-JSON or wrong top-level shape.
 * - Assert every scenario has required fields (tier, amounts, expectedOutcome).
 * - Cross-check generated amounts against spec tier caps (20k/50k, 200k/500k, 5M daily).
 * - Flag impossible states (e.g. Tier 1 "accept" with transfer > 20,000 per transaction).
 * - Attach validationWarnings to the output file so humans/CI see issues before use.
 * Validation does NOT mean "AI is always wrong" — it means treat AI as an untrusted input source.
 *
 * WHAT COULD GO WRONG WITHOUT VALIDATION:
 * - Tests pass/fail against wrong oracles (e.g. 25,000 accepted on Tier 1 when spec says 20,000 max).
 * - Automation consumes hallucinated fields (fake statuses, invented tier names) and flakes silently.
 * - False confidence: green CI on nonsense data while real limit bugs ship to production.
 * - Wasted debugging time chasing "failures" that are bad test data, not product defects.
 *
 * WHEN THIS UTILITY IS USEFUL VS WASTES TIME:
 * - USEFUL: seeding edge-case matrices (boundary amounts, midnight timestamps, concurrent pairs)
 *   before manual review; exploring combinatorial data you'd otherwise hand-type slowly.
 * - WASTES TIME: replacing human risk analysis; generating data for oracles you haven't confirmed
 *   with product; running in CI without validation gates; re-generating when static tables suffice.
 *
 * Usage:
 *   npm run generate:data -- boundary
 *   npm run generate:data -- concurrent
 *   npm run generate:data -- schedule
 *   npm run generate:data -- reversal
 *
 * Requires OPENAI_API_KEY (or ANTHROPIC_API_KEY with AI_PROVIDER=anthropic) in .env at repo root.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Spec constants (source of truth for validation) ─────────────────────────

const WALLET_SPEC = `
Digital Wallet Transfer Limits:
- Tier 1: max 20,000 per transaction, 50,000 per day.
- Tier 2: max 200,000 per transaction, 500,000 per day.
- Tier 3: no per-transaction limit, 5,000,000 per day.
- Daily limit resets at midnight.
- Pending transfers count toward daily limit; failed/reversed amounts return to available limit.
- Transfers to user's own linked bank accounts are exempt from all limits.
- Scheduled transfers execute at 8:00 AM on the scheduled day.
- Tier upgrade on KYC completion takes effect immediately.
- Transfers exceeding remaining daily limit are rejected with error showing remaining limit.
`.trim();

const TIER_LIMITS = {
  1: { perTransaction: 20_000, daily: 50_000 },
  2: { perTransaction: 200_000, daily: 500_000 },
  3: { perTransaction: null as number | null, daily: 5_000_000 },
} as const;

const SCENARIO_TYPES = ['boundary', 'concurrent', 'schedule', 'reversal'] as const;
type ScenarioType = (typeof SCENARIO_TYPES)[number];

const OUTPUT_PATH = path.join(__dirname, 'generated-test-data.json');

// ─── Types ───────────────────────────────────────────────────────────────────

interface BaseScenario {
  id: string;
  tier: 1 | 2 | 3;
  description: string;
  expectedOutcome: 'accept' | 'reject' | 'pending' | 'reversed' | 'scheduled';
}

interface BoundaryScenario extends BaseScenario {
  transferAmount: number;
  dailySpentBefore: number;
  recipientType: 'wallet' | 'third_party_bank' | 'own_linked_bank';
}

interface ConcurrentScenario extends BaseScenario {
  transfers: Array<{ label: string; amount: number; offsetMs: number }>;
  dailySpentBefore: number;
  recipientType: 'wallet' | 'third_party_bank';
}

interface ScheduleScenario extends BaseScenario {
  transferAmount: number;
  scheduledDate: string;
  scheduledTimeLocal: string;
  dailySpentOnExecutionDay: number;
  recipientType: 'wallet' | 'third_party_bank';
}

interface ReversalScenario extends BaseScenario {
  transferAmount: number;
  dailySpentBefore: number;
  initialStatus: 'pending' | 'completed';
  reversalTrigger: string;
  recipientType: 'wallet' | 'third_party_bank';
}

interface GeneratedPayload {
  scenarioType: ScenarioType;
  scenarios: unknown[];
}

interface OutputFile {
  scenarioType: ScenarioType;
  generatedAt: string;
  provider: string;
  model: string;
  scenarios: BoundaryScenario[] | ConcurrentScenario[] | ScheduleScenario[] | ReversalScenario[];
  validationWarnings: string[];
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

function buildPrompt(scenarioType: ScenarioType): string {
  const common = `
You are a QA test-data generator. Use this product spec:
${WALLET_SPEC}

Return ONLY valid JSON (no markdown fences, no prose) matching this shape:
{
  "scenarioType": "${scenarioType}",
  "scenarios": [ ... ]
}
Use realistic edge-case values: amounts at/just under/just over limits, precise timestamps near midnight or 8:00 AM.
Currency: single unnamed unit (integer amounts only, no decimals).
Each scenario must include: id, tier (1|2|3), description, expectedOutcome.
`.trim();

  const shapes: Record<ScenarioType, string> = {
    boundary: `
Generate exactly 6 boundary scenarios (2 per tier) for scenarioType "boundary".
Each scenario fields: id, tier, description, transferAmount, dailySpentBefore, recipientType ("wallet"|"third_party_bank"|"own_linked_bank"), expectedOutcome ("accept"|"reject").
Include: at-limit, just-under, just-over per-transaction and daily cases. Tier 3 has no per-transaction cap.
Include at least one own_linked_bank exempt case above Tier 1 caps.`,
    concurrent: `
Generate exactly 4 concurrent scenarios for scenarioType "concurrent".
Each scenario fields: id, tier, description, dailySpentBefore, recipientType, expectedOutcome,
transfers: array of { label, amount, offsetMs } with 2-3 transfers submitted within 500ms.
Focus on race conditions where combined amounts exceed remaining daily limit.`,
    schedule: `
Generate exactly 4 scheduled transfer scenarios for scenarioType "schedule".
Each scenario fields: id, tier, description, transferAmount, scheduledDate (ISO date), scheduledTimeLocal ("08:00:00"),
dailySpentOnExecutionDay, recipientType, expectedOutcome ("scheduled"|"accept"|"reject").
Include edge dates: end of month, day before/after daily exhaustion, near midnight booking vs 8AM execution.`,
    reversal: `
Generate exactly 4 reversal scenarios for scenarioType "reversal".
Each scenario fields: id, tier, description, transferAmount, dailySpentBefore, initialStatus ("pending"|"completed"),
reversalTrigger, recipientType, expectedOutcome ("pending"|"reversed"|"accept").
Cover pending-then-failed and completed-then-reversed limit restoration.`,
  };

  return `${common}\n\n${shapes[scenarioType]}`;
}

// ─── API clients ─────────────────────────────────────────────────────────────

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY is missing. Set it in .env (see .env.example).');
  }

  const client = new OpenAI({ apiKey });
  const model = 'gpt-4o-mini';

  const response = await client.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You output strict JSON only. Never invent tier limits different from the spec. Never wrap JSON in markdown.',
      },
      { role: 'user', content: prompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned empty content.');
  }

  return content;
}

async function callAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('ANTHROPIC_API_KEY is missing. Set it in .env or use OpenAI.');
  }

  const model = 'claude-3-5-haiku-20241022';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.3,
      system:
        'You output strict JSON only. Never invent tier limits different from the spec. Never wrap JSON in markdown.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((block) => block.type === 'text')?.text;
  if (!text) {
    throw new Error('Anthropic returned empty content.');
  }

  // Strip accidental markdown fences if present
  return text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
}

async function callLlm(prompt: string): Promise<{ raw: string; provider: string; model: string }> {
  const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();

  if (provider === 'anthropic') {
    return { raw: await callAnthropic(prompt), provider: 'anthropic', model: 'claude-3-5-haiku-20241022' };
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    return { raw: await callOpenAI(prompt), provider: 'openai', model: 'gpt-4o-mini' };
  }

  if (process.env.ANTHROPIC_API_KEY?.trim()) {
    console.warn('OPENAI_API_KEY unset — falling back to Anthropic.');
    return { raw: await callAnthropic(prompt), provider: 'anthropic', model: 'claude-3-5-haiku-20241022' };
  }

  throw new Error('No API key found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env');
}

// ─── Validation ──────────────────────────────────────────────────────────────

function isTier(value: unknown): value is 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function parsePayload(raw: string, expectedType: ScenarioType): GeneratedPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI response is not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response JSON must be an object.');
  }

  const payload = parsed as Record<string, unknown>;

  if (payload.scenarioType !== expectedType) {
    throw new Error(`Expected scenarioType "${expectedType}", got "${String(payload.scenarioType)}".`);
  }

  if (!Array.isArray(payload.scenarios) || payload.scenarios.length === 0) {
    throw new Error('AI response must include a non-empty "scenarios" array.');
  }

  return {
    scenarioType: payload.scenarioType as ScenarioType,
    scenarios: payload.scenarios,
  };
}

function validateScenarioShape(scenarioType: ScenarioType, scenario: unknown, index: number): string[] {
  const warnings: string[] = [];
  const prefix = `Scenario[${index}]`;

  if (!scenario || typeof scenario !== 'object') {
    return [`${prefix}: not an object`];
  }

  const s = scenario as Record<string, unknown>;
  const requiredBase = ['id', 'tier', 'description', 'expectedOutcome'];

  for (const field of requiredBase) {
    if (!(field in s)) {
      warnings.push(`${prefix}: missing required field "${field}"`);
    }
  }

  if (!isTier(s.tier)) {
    warnings.push(`${prefix}: invalid tier "${String(s.tier)}" — must be 1, 2, or 3`);
    return warnings;
  }

  switch (scenarioType) {
    case 'boundary':
      validateBoundary(s, prefix, warnings);
      break;
    case 'concurrent':
      validateConcurrent(s, prefix, warnings);
      break;
    case 'schedule':
      validateSchedule(s, prefix, warnings);
      break;
    case 'reversal':
      validateReversal(s, prefix, warnings);
      break;
  }

  return warnings;
}

function validateBoundary(s: Record<string, unknown>, prefix: string, warnings: string[]): void {
  const fields = ['transferAmount', 'dailySpentBefore', 'recipientType'];
  for (const field of fields) {
    if (!(field in s)) {
      warnings.push(`${prefix}: missing "${field}"`);
    }
  }

  if (!isPositiveInteger(s.transferAmount)) {
    warnings.push(`${prefix}: transferAmount must be a positive integer`);
  }
  if (typeof s.dailySpentBefore === 'number' && s.dailySpentBefore < 0) {
    warnings.push(`${prefix}: dailySpentBefore cannot be negative`);
  }

  if (isTier(s.tier) && isPositiveInteger(s.transferAmount)) {
    validateAmountsAgainstSpec(s.tier, s.transferAmount as number, s.dailySpentBefore as number, s.recipientType, s.expectedOutcome, prefix, warnings);
  }
}

function validateConcurrent(s: Record<string, unknown>, prefix: string, warnings: string[]): void {
  if (!Array.isArray(s.transfers) || s.transfers.length < 2) {
    warnings.push(`${prefix}: concurrent scenario needs transfers array with ≥2 items`);
    return;
  }

  let total = 0;
  for (const [i, t] of (s.transfers as unknown[]).entries()) {
    if (!t || typeof t !== 'object') {
      warnings.push(`${prefix}.transfers[${i}]: not an object`);
      continue;
    }
    const tr = t as Record<string, unknown>;
    if (!isPositiveInteger(tr.amount)) {
      warnings.push(`${prefix}.transfers[${i}]: amount must be positive integer`);
    } else {
      total += tr.amount as number;
    }
  }

  if (isTier(s.tier) && s.recipientType !== 'own_linked_bank') {
    const limits = TIER_LIMITS[s.tier];
    const spent = typeof s.dailySpentBefore === 'number' ? s.dailySpentBefore : 0;
    if (spent + total > limits.daily && s.expectedOutcome === 'accept') {
      warnings.push(
        `${prefix}: possible hallucination — combined concurrent total (${spent + total}) exceeds Tier ${s.tier} daily cap (${limits.daily}) but expectedOutcome is "accept"`,
      );
    }
  }
}

function validateSchedule(s: Record<string, unknown>, prefix: string, warnings: string[]): void {
  for (const field of ['transferAmount', 'scheduledDate', 'scheduledTimeLocal', 'dailySpentOnExecutionDay', 'recipientType']) {
    if (!(field in s)) {
      warnings.push(`${prefix}: missing "${field}"`);
    }
  }

  if (typeof s.scheduledDate === 'string' && Number.isNaN(Date.parse(s.scheduledDate))) {
    warnings.push(`${prefix}: scheduledDate "${s.scheduledDate}" is not a valid ISO date`);
  }

  if (isTier(s.tier) && isPositiveInteger(s.transferAmount)) {
    validateAmountsAgainstSpec(
      s.tier,
      s.transferAmount as number,
      (s.dailySpentOnExecutionDay as number) ?? 0,
      s.recipientType,
      s.expectedOutcome,
      prefix,
      warnings,
    );
  }
}

function validateReversal(s: Record<string, unknown>, prefix: string, warnings: string[]): void {
  for (const field of ['transferAmount', 'dailySpentBefore', 'initialStatus', 'reversalTrigger', 'recipientType']) {
    if (!(field in s)) {
      warnings.push(`${prefix}: missing "${field}"`);
    }
  }

  if (isTier(s.tier) && isPositiveInteger(s.transferAmount)) {
    validateAmountsAgainstSpec(s.tier, s.transferAmount as number, s.dailySpentBefore as number, s.recipientType, 'pending', prefix, warnings);
  }
}

function validateAmountsAgainstSpec(
  tier: 1 | 2 | 3,
  transferAmount: number,
  dailySpentBefore: number,
  recipientType: unknown,
  expectedOutcome: unknown,
  prefix: string,
  warnings: string[],
): void {
  if (recipientType === 'own_linked_bank') {
    return; // exempt from limits
  }

  const limits = TIER_LIMITS[tier];
  const spent = typeof dailySpentBefore === 'number' ? dailySpentBefore : 0;

  if (limits.perTransaction !== null && transferAmount > limits.perTransaction) {
    if (expectedOutcome === 'accept') {
      warnings.push(
        `${prefix}: possible hallucination — Tier ${tier} transfer ${transferAmount} exceeds per-transaction limit ${limits.perTransaction} but expectedOutcome is "accept"`,
      );
    }
  }

  if (spent + transferAmount > limits.daily) {
    if (expectedOutcome === 'accept') {
      warnings.push(
        `${prefix}: possible hallucination — total ${spent + transferAmount} exceeds Tier ${tier} daily limit ${limits.daily} but expectedOutcome is "accept"`,
      );
    }
  }

  if (spent > limits.daily) {
    warnings.push(
      `${prefix}: dailySpentBefore (${spent}) already exceeds Tier ${tier} daily limit (${limits.daily}) — unrealistic precondition`,
    );
  }

  // Spec uses round limits; suspicious if AI emits odd unrelated caps
  const suspiciousCaps = [25_000, 100_000, 1_000_000];
  if (tier === 1 && suspiciousCaps.includes(transferAmount) && transferAmount !== 20_000 && transferAmount !== 19_999 && transferAmount !== 20_001) {
    warnings.push(`${prefix}: transferAmount ${transferAmount} may be hallucinated — not a known Tier 1 boundary value`);
  }
}

function validateAll(scenarioType: ScenarioType, scenarios: unknown[]): string[] {
  return scenarios.flatMap((scenario, index) => validateScenarioShape(scenarioType, scenario, index));
}

// ─── Main ────────────────────────────────────────────────────────────────────

function printUsage(): void {
  console.log(`
Usage: npm run generate:data -- <scenario-type>

Scenario types:
  boundary    Boundary amounts for all 3 tiers
  concurrent  Simultaneous transfer race scenarios
  schedule    Scheduled transfer edge-case dates/times
  reversal    Pending-then-reversed transfer scenarios
`.trim());
}

async function main(): Promise<void> {
  const scenarioArg = process.argv[2]?.toLowerCase();

  if (!scenarioArg || !SCENARIO_TYPES.includes(scenarioArg as ScenarioType)) {
    printUsage();
    process.exit(1);
  }

  const scenarioType = scenarioArg as ScenarioType;
  console.log(`Generating "${scenarioType}" test data via LLM...`);

  const prompt = buildPrompt(scenarioType);
  const { raw, provider, model } = await callLlm(prompt);
  const payload = parsePayload(raw, scenarioType);
  const validationWarnings = validateAll(scenarioType, payload.scenarios);

  if (validationWarnings.length > 0) {
    console.warn(`\n⚠ Validation warnings (${validationWarnings.length}):`);
    for (const warning of validationWarnings) {
      console.warn(`  - ${warning}`);
    }
  } else {
    console.log('✓ Structure and tier-limit checks passed with no warnings.');
  }

  const output: OutputFile = {
    scenarioType,
    generatedAt: new Date().toISOString(),
    provider,
    model,
    scenarios: payload.scenarios as OutputFile['scenarios'],
    validationWarnings,
  };

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf-8');
  console.log(`\nWrote ${payload.scenarios.length} scenario(s) to ${OUTPUT_PATH}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nError: ${message}`);
  process.exit(1);
});
