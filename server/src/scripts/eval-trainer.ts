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
 * Eval user id:
 *   Uses user_id = 999. Intentionally far from Jessica's real user_id = 1
 *   so a rogue reset cannot nuke her data.
 */

import 'dotenv/config';

import { invokeTrainer } from '../agents/trainer/index.js';
import { loadMemory } from '../agents/shared/memory.js';
import {
  TrainerResponseSchema,
  type Invocation,
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

const EVAL_USER_ID = 999;

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
 * the post-run memory blob so must_pattern_detect can look at trainer_memory
 * entries written mid-loop, not just patterns_noticed on the response.
 */
function evaluateExpectations(
  scenario: EvalScenario,
  response: TrainerResponse,
  postMemory: Record<string, unknown>,
): string[] {
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

  // 7. custom_assertion.
  if (exp.custom_assertion) {
    const { pass, detail } = exp.custom_assertion(response);
    if (!pass) {
      failures.push(`custom: ${detail}`);
    }
  }

  // NOTE on iterations:
  //   invokeTrainer() deliberately returns only TrainerResponse (not iteration
  //   count). Per-scenario min/max iteration expectations are therefore NOT
  //   enforced here. To enforce them we'd need to call runAgentLoop directly,
  //   which the task brief told us to avoid. The field is kept on the scenario
  //   type as a TODO for when the invokeTrainer contract widens.
  //   (Silent skip — documented here rather than shouting on every scenario.)

  return failures;
}

// ---------------------------------------------------------------------------
// Seeding
// ---------------------------------------------------------------------------

async function seedScenario(scenario: EvalScenario): Promise<void> {
  const userId = EVAL_USER_ID;
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
): Promise<{ pass: boolean; failures: string[] }> {
  await seedScenario(scenario);

  const invocation: Invocation = {
    invocation_id: `eval_${scenario.id}_${Date.now()}`,
    user_id: EVAL_USER_ID,
    invocation_type: scenario.invocation.invocation_type,
    trigger_payload: scenario.invocation.trigger_payload,
  };

  try {
    const response = await invokeTrainer(invocation);
    const postMemory = await loadMemory(EVAL_USER_ID);
    const failures = evaluateExpectations(scenario, response, postMemory);
    return { pass: failures.length === 0, failures };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      pass: false,
      failures: [`invokeTrainer threw: ${msg}`],
    };
  }
}

async function main(): Promise<void> {
  console.log(`\nCrea Trainer Eval Harness`);
  console.log('='.repeat(40));
  console.log(`Scenarios: ${scenarios.length}`);
  console.log(`Eval user: ${EVAL_USER_ID}`);
  console.log('');

  const results: Array<{ id: string; pass: boolean; failures: string[] }> = [];

  for (const scenario of scenarios) {
    process.stdout.write(`[${scenario.id}] running... `);
    const { pass, failures } = await runScenario(scenario);
    results.push({ id: scenario.id, pass, failures });

    if (pass) {
      console.log('✓ PASS');
    } else {
      console.log('✗ FAIL');
      for (const f of failures) {
        console.log(`    - ${f}`);
      }
    }
  }

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
