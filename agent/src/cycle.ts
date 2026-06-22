import 'dotenv/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import * as tools from './tools.js';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});
const MODEL = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

const SYSTEM = `You are ProofYield, an autonomous oracle + treasury agent on Casper testnet. No human approves your actions; you decide and act through tools.

Each cycle, for the given parking asset:
1. Call read_revenue and read_attestation_history.
2. ANOMALY CHECK: if the revenue is outside the typical range or looks unverifiable, do NOT attest — explain why. Otherwise call attest with the EXACT period, amount, and source_hash from read_revenue.
3. Call read_treasury and read_venue_state.
4. TREASURY DECISION: decide whether to reinvest. Only act if you have at least the 500 CSPR stake minimum liquid. Prefer WiseLending stake (CSPR->sCSPR, growing yield); native delegation is the fallback. Restraint is valid: if conditions do not clearly warrant moving capital this cycle, HOLD. Keep any amount conservative (representative testnet sizing, e.g. 500 CSPR).
5. If you reinvest: call reinvest(action, amount_cspr), then record_reinvest with a one-sentence justification. If you HOLD: call record_reinvest with venue="hold", amount_in=0, amount_out=0, and your reasoning.
6. Finish with a short summary of what you did and why.

Be decisive and use tool outputs as ground truth.`;

const toolSchemas: ChatCompletionTool[] = [
  { type: 'function', function: { name: 'read_revenue', description: 'Fetch the latest parking revenue reading for an asset (period, amount in cents, provenance source_hash).', parameters: { type: 'object', properties: { asset_id: { type: 'string' } }, required: ['asset_id'] } } },
  { type: 'function', function: { name: 'read_attestation_history', description: 'Typical revenue range for the asset, to anomaly-check a new reading.', parameters: { type: 'object', properties: { asset_id: { type: 'string' } }, required: ['asset_id'] } } },
  { type: 'function', function: { name: 'read_treasury', description: 'The agent treasury: liquid CSPR and sCSPR holdings.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'read_venue_state', description: 'Available DeFi venues for reinvesting (WiseLending stake, native delegation).', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'attest', description: 'Attest a revenue figure on-chain (only for clean, non-anomalous data).', parameters: { type: 'object', properties: { asset_id: { type: 'string' }, period: { type: 'number' }, amount: { type: 'number' }, source_hash: { type: 'string' } }, required: ['asset_id', 'period', 'amount', 'source_hash'] } } },
  { type: 'function', function: { name: 'reinvest', description: 'Move treasury capital into a venue, or hold.', parameters: { type: 'object', properties: { action: { type: 'string', enum: ['stake', 'delegate', 'hold'] }, amount_cspr: { type: 'number' } }, required: ['action', 'amount_cspr'] } } },
  { type: 'function', function: { name: 'record_reinvest', description: 'Record the reinvestment decision + reasoning on-chain (TreasuryVault).', parameters: { type: 'object', properties: { venue: { type: 'string' }, amount_in: { type: 'number' }, amount_out: { type: 'number' }, reasoning: { type: 'string' } }, required: ['venue', 'amount_in', 'amount_out', 'reasoning'] } } },
];

const dispatch: Record<string, (a: any) => Promise<unknown>> = {
  read_revenue: (a) => tools.readRevenue(a.asset_id),
  read_attestation_history: (a) => tools.readAttestationHistory(a.asset_id),
  read_treasury: () => tools.readTreasury(),
  read_venue_state: () => tools.readVenueState(),
  attest: (a) => tools.attest(a.asset_id, a.period, a.amount, a.source_hash),
  reinvest: (a) => tools.reinvest(a.action, a.amount_cspr),
  record_reinvest: (a) => tools.recordReinvest(a.venue, a.amount_in, a.amount_out, a.reasoning),
};

const asset = process.argv[2] ?? 'sd-parking-101';
const messages: ChatCompletionMessageParam[] = [
  { role: 'system', content: SYSTEM },
  { role: 'user', content: `Run one autonomous cycle for asset "${asset}". Decide and act.` },
];

for (let step = 0; step < 14; step++) {
  const res = await client.chat.completions.create({ model: MODEL, messages, tools: toolSchemas, tool_choice: 'auto' });
  const msg = res.choices[0].message;
  messages.push(msg);
  if (msg.content) console.log(`\n[agent] ${msg.content}`);
  if (!msg.tool_calls?.length) break;
  for (const tc of msg.tool_calls) {
    if (tc.type !== 'function') continue;
    console.log(`  -> ${tc.function.name}(${tc.function.arguments})`);
    let result: unknown;
    try {
      result = await dispatch[tc.function.name](JSON.parse(tc.function.arguments || '{}'));
    } catch (e) {
      result = { error: (e as Error).message };
    }
    console.log(`     ${JSON.stringify(result)}`);
    messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
  }
}
