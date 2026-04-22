/**
 * Crea Trainer Agent — Eval Harness
 *
 * Runs every scenario in eval-scenarios.ts through the Trainer agent with a
 * fresh DB state, and asserts the response against scenario-specific
 * expectations. This is the guardrail for future agent changes.
 *
 * Usage:
 *   npx tsx src/scripts/eval-trainer.ts
 *
 * Cost estimate:
 *   Each scenario calls invokeTrainer, which issues multiple Anthropic
 *   messages.create calls (one per loop turn). Empirically each scenario
 *   costs roughly $0.05–$0.20 on Sonnet 4.6. A full 20-scenario run is
 *   therefore $1–$4 of Anthropic spend. Do not wire this into anything
 *   that auto-runs without human approval until cache + cost controls are
 *   in place.
 *
 * Exit code:
 *   0 if all scenarios pass, 1 if any scenario fails.
 *
 * Eval user ids:
 *   Each scenario gets a unique user_id of `EVAL_USER_BASE + index` (e.g.
 *   1000–1019 for the current 20 scenarios). The base is intentionally far
 *   from Jessica's real user_id = 1 so a rogue reset cannot nuke her data,
 *   and disjoint per-scenario ids let scenarios run concurrently against the
 *   same dev DB without colliding on rows.
 *
 * Concurrency:
 *   Up to CONCURRENCY scenarios run in parallel via a small promise pool
 *   (see runAllScenarios). With CONCURRENCY = 5, wall time drops from the
 *   ~5 min sequential baseline to roughly ~1 min, with no change in
 *   Anthropic API spend.
 */

import 'dotenv/config';

import { invokeTrainer } from '../agents/trainer/index.js';
import { loadMemory } from '../agents/shared/memory.js';
import {
  TrainerResponseSchema,
  type Invocation,
  type LoopResult,
  type TrainerResponse,
} from '../agents/shared/types.js';

import {
  resetEvalUser,
  seedBlocks,
  seedCheckIns,
  seedMemory,
  seedMetrics,
  seedProfile,
  seedWorkoutLogs,
  seedWorkoutModifications,
} from './eval-fixtures.js';
import {
  BANNED_PHRASES,
  scenarios,
  type EvalScenario,
} from './eval-scenarios.js';

// Each scenario gets `EVAL_USER_BASE + index` as its user_id so they can run
// concurrently without data collision. 1000 keeps us well clear of real users.
const EVAL_USER_BASE = 1000;

// Cap concurrent scenarios to stay comfortably inside Anthropic rate limits.
// Each scenario fans out into multiple messages.create calls; 5 in flight
// gives a ~5x wall-time win without thrashing the rate limiter.
const CONCURRENCY = 5;

// ---------------------------------------------------------------------------
// Assertion helpers
// ---------------------------------------------------------------------------

type Failure = { scenario: string; detail: string };

function containsCI(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function checkBannedPhrases(message: string): string[] {
  const hits: string[] = [];
  for (const phrase of BANNED_PHRASES) {
    if (containsCI(message, phrase)) hits.push(phrase);
  }
  return hits;
}

/**
 * Run every expectation for a scenario against the response. Also accepts
 * the post-run memory blob (so must_pattern_detect can look at trainer_memory
 * entries written mid-loop) and the tool_calls log (so custom_assertion can
 * introspect what the agent actually called).
 */
function evaluateExpectations(
  scenario: EvalScenario,
  loopResult: LoopResult,
  postMemory: Record<string, unknown>,
): string[] {
  const response = loopResult.response;
  const toolCalls = loopResult.tool_calls;
  const iterations = loopResult.iterations;
  const failures: string[] = [];
  const exp = scenario.expectations;

  // 1. Schema validation.
  const parsed = TrainerResponseSchema.safeParse(response);
  if (!parsed.success) {
    failures.push(
      `schema: ${parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }

  // 2. Voice rules — banned phrases.
  const banned = checkBannedPhrases(response.message);
  if (banned.length > 0) {
    failures.push(`banned phrases in message: ${banned.join(', ')}`);
  }

  // 3. must_have_proposal_type.
  if (exp.must_have_proposal_type) {
    const proposals = response.proposals ?? [];
    const has = proposals.some(
      (p) => p.proposal_type === exp.must_have_proposal_type,
    );
    if (!has) {
      failures.push(
        `missing proposal of type '${exp.must_have_proposal_type}' (got: ${
          proposals.map((p) => p.proposal_type).join(', ') || 'none'
        })`,
      );
    }
  }

  // 4. must_mention_keywords — at least one must appear.
  if (exp.must_mention_keywords && exp.must_mention_keywords.length > 0) {
    const msg = response.message;
    const hit = exp.must_mention_keywords.find((k) => containsCI(msg, k));
    if (!hit) {
      failures.push(
        `message mentions none of: ${exp.must_mention_keywords.join(', ')}`,
      );
    }
  }

  // 5. must_not_mention_keywords — none may appear.
  if (exp.must_not_mention_keywords && exp.must_not_mention_keywords.length > 0) {
    const msg = response.message;
    const hits = exp.must_not_mention_keywords.filter((k) =>
      containsCI(msg, k),
    );
    if (hits.length > 0) {
      failures.push(`message contains forbidden keywords: ${hits.join(', ')}`);
    }
  }

  // 6. must_pattern_detect — look in response.patterns_noticed AND in memory
  //    (record_pattern_detection writes into trainer_memory).
  if (exp.must_pattern_detect && exp.must_pattern_detect.length > 0) {
    const patternsText = JSON.stringify(response.patterns_noticed ?? []);
    const memoryText = JSON.stringify(postMemory ?? {});
    const combined = `${patternsText} ${memoryText}`.toLowerCase();
    const matched = exp.must_pattern_detect.some((needle) =>
      combined.includes(needle.toLowerCase()),
    );
    if (!matched) {
      failures.push(
        `no pattern matching any of [${exp.must_pattern_detect.join(
          ', ',
        )}] in patterns_noticed or memory`,
      );
    }
  }

  // 7. custom_assertion (now receives tool_calls for tool-level introspection).
  if (exp.custom_assertion) {
    const { pass, detail } = exp.custom_assertion(response, toolCalls);
    if (!pass) {
      failures.push(`custom: ${detail}`);
    }
  }

  // 8. min_iterations / max_iterations — sanity that the loop actually ran
  //    tools (or didn't thrash). invokeTrainer now widens its return to the
  //    full LoopResult so we can enforce these.
  if (exp.min_iterations !== undefined && iterations < exp.min_iterations) {
    failures.push(
      `iterations ${iterations} below min_iterations ${exp.min_iterations}`,
    );
  }
  if (exp.max_iterations !== undefined && iterations > exp.max_iterations) {
    failures.push(
      `iterations ${iterations} above max_iterations ${exp.max_iterations}`,
    );
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

async function seedScenario(
  scenario: EvalScenario,
  userId: number,
): Promise<void> {
  await resetEvalUser(userId);
  await seedProfile(userId, scenario.fixture.profile ?? {});

  if (scenario.fixture.check_ins) {
    await seedCheckIns(userId, scenario.fixture.check_ins);
  }
  if (scenario.fixture.workout_logs) {
    await seedWorkoutLogs(userId, scenario.fixture.workout_logs);
  }
  if (scenario.fixture.metrics) {
    await seedMetrics(userId, scenario.fixture.metrics);
  }
  if (scenario.fixture.blocks) {
    await seedBlocks(userId, scenario.fixture.blocks);
  }
  if (scenario.fixture.modifications) {
    await seedWorkoutModifications(userId, scenario.fixture.modifications);
  }
  if (scenario.fixture.memory) {
    await seedMemory(userId, scenario.fixture.memory);
  }
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runScenario(
  scenario: EvalScenario,
  userId: number,
): Promise<{ pass: boolean; failures: string[] }> {
  await seedScenario(scenario, userId);

  const invocation: Invocation = {
    invocation_id: `eval_${scenario.id}_${Date.now()}`,
    user_id: userId,
    invocation_type: scenario.invocation.invocation_type,
    trigger_payload: scenario.invocation.trigger_payload,
  };

  try {
    const loopResult = await invokeTrainer(invocation);
    const postMemory = await loadMemory(userId);
    const failures = evaluateExpectations(scenario, loopResult, postMemory);
    return { pass: failures.length === 0, failures };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      pass: false,
      failures: [`invokeTrainer threw: ${msg}`],
    };
  }
}

type ScenarioResult = { id: string; pass: boolean; failures: string[] };

/**
 * Run all scenarios with a bounded promise pool so that at most CONCURRENCY
 * scenarios are in flight at once. Results are written back into a
 * pre-allocated array at the scenario's original index, so the Summary
 * section can still print them in definition order even though they finish
 * out of order.
 */
async function runAllScenarios(): Promise<ScenarioResult[]> {
  const results: ScenarioResult[] = new Array(scenarios.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex++;
      if (i >= scenarios.length) return;
      const scenario = scenarios[i];
      const userId = EVAL_USER_BASE + i;
      process.stdout.write(`[${scenario.id}] (user=${userId}) starting...\n`);
      const { pass, failures } = await runScenario(scenario, userId);
      results[i] = { id: scenario.id, pass, failures };
      const mark = pass ? '✓' : '✗';
      process.stdout.write(`[${scenario.id}] ${mark} ${pass ? 'PASS' : 'FAIL'}\n`);
      if (!pass) {
        for (const f of failures) process.stdout.write(`    - ${f}\n`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  console.log(`\nCrea Trainer Eval Harness`);
  console.log('='.repeat(40));
  console.log(`Scenarios:   ${scenarios.length}`);
  console.log(
    `Eval users:  ${EVAL_USER_BASE}–${EVAL_USER_BASE + scenarios.length - 1}`,
  );
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log('');

  const results = await runAllScenarios();

  // --- Final report ---
  const passed = results.filter((r) => r.pass).length;
  const total = results.length;

  console.log('');
  console.log('-'.repeat(40));
  console.log('Summary');
  console.log('-'.repeat(40));
  for (const r of results) {
    const mark = r.pass ? '✓' : '✗';
    console.log(`  ${mark} ${r.id}`);
  }
  console.log('');
  console.log(`${passed === total ? '✓' : '✗'} ${passed}/${total} scenarios passed`);
  console.log('');

  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error in eval harness:', err);
  process.exit(1);
});
