import { eq } from 'drizzle-orm';
import { db, schema } from '../../../db/index.js';
import type { Tool } from '../../shared/types.js';
import { getCycleStatusDef } from '../tool-definitions.js';

/**
 * Compute current menstrual-cycle phase from a hardcoded reference point.
 *
 * Real Apple Health integration is pending — the spec calls this out and asks
 * the tool to surface that via the `reference` field so the agent doesn't
 * over-trust the number. If the user's `conditions` string mentions "no period"
 * or "menopause" we stop tracking.
 *
 * Phase mapping (28-day reference cycle):
 *   day  1– 5 → menstrual
 *   day  6–13 → follicular
 *   day 14–16 → ovulatory
 *   day 17–28 → luteal
 */
const LAST_PERIOD_START = '2026-03-23';
const CYCLE_LENGTH = 28;

type CycleStatus = {
  tracking: boolean;
  phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown';
  cycle_day: number | null;
  days_until_next: number | null;
  reference: string;
};

export const getCycleStatusTool: Tool = {
  definition: getCycleStatusDef,
  execute: async (_input, ctx): Promise<CycleStatus> => {
    const userId = ctx.invocation.user_id;
    const rows = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, userId))
      .limit(1);

    const conditions = (rows[0]?.conditions ?? '').toLowerCase();
    if (conditions.includes('no period') || conditions.includes('menopause')) {
      return {
        tracking: false,
        phase: 'unknown',
        cycle_day: null,
        days_until_next: null,
        reference: 'hardcoded — Apple Health integration pending',
      };
    }

    const startMs = Date.parse(`${LAST_PERIOD_START}T00:00:00Z`);
    const todayMs = Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
    const daysSince = Math.floor((todayMs - startMs) / (1000 * 60 * 60 * 24));
    // cycle_day is 1-indexed; modulo handles multi-cycle spans cleanly.
    const cycleDay = ((daysSince % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH + 1;
    const daysUntilNext = CYCLE_LENGTH - cycleDay + 1;

    let phase: CycleStatus['phase'];
    if (cycleDay <= 5) phase = 'menstrual';
    else if (cycleDay <= 13) phase = 'follicular';
    else if (cycleDay <= 16) phase = 'ovulatory';
    else phase = 'luteal';

    return {
      tracking: true,
      phase,
      cycle_day: cycleDay,
      days_until_next: daysUntilNext,
      reference: 'hardcoded — Apple Health integration pending',
    };
  },
};
