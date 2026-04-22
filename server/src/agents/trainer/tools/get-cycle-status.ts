import { eq } from 'drizzle-orm';
import { db, schema } from '../../../db/index.js';
import type { Tool } from '../../shared/types.js';
import { getCycleStatusDef } from '../tool-definitions.js';

/**
 * Life-stage-aware cycle status.
 *
 * Reads `menstrual_status`, `last_period_start`, `cycle_length_days`, and
 * `menopause_onset_date` directly off the user's profile. The agent gets one
 * structured shape regardless of life stage so it can branch on `tracking` and
 * `status` rather than guessing from the user's `conditions` free-text.
 *
 * Phase mapping (when tracking):
 *   day  1– 5 → menstrual
 *   day  6–13 → follicular
 *   day 14–16 → ovulatory
 *   day 17+   → luteal
 *
 * Apple Health integration is still pending; for now `last_period_start` is
 * captured at onboarding / via manual edit.
 */

const DEFAULT_CYCLE_LENGTH = 28;

type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown';

type CycleStatus = {
  tracking: boolean;
  status:
    | 'cycling'
    | 'irregular'
    | 'perimenopause'
    | 'menopause'
    | 'pregnancy'
    | 'not_applicable'
    | 'unknown';
  phase?: Phase;
  cycle_day?: number | null;
  cycle_length_days?: number | null;
  days_until_next?: number | null;
  years_since_menopause?: number | null;
  note?: string;
  reference: string;
};

function daysBetween(fromIso: string, toIso: string): number {
  const fromMs = Date.parse(`${fromIso}T00:00:00Z`);
  const toMs = Date.parse(`${toIso}T00:00:00Z`);
  return Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

export const getCycleStatusTool: Tool = {
  definition: getCycleStatusDef,
  execute: async (_input, ctx): Promise<CycleStatus> => {
    const userId = ctx.invocation.user_id;
    const rows = await db
      .select()
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, userId))
      .limit(1);

    const profile = rows[0];
    const today = new Date().toISOString().slice(0, 10);

    if (!profile || !profile.menstrualStatus) {
      return {
        tracking: false,
        status: 'unknown',
        note: 'menstrual status not captured in profile yet',
        reference: 'user_profiles.menstrual_status',
      };
    }

    const status = profile.menstrualStatus as CycleStatus['status'];

    if (status === 'menopause') {
      let yearsSince: number | null = null;
      if (profile.menopauseOnsetDate) {
        yearsSince = Math.floor(
          daysBetween(profile.menopauseOnsetDate, today) / 365.25,
        );
      }
      return {
        tracking: false,
        status: 'menopause',
        years_since_menopause: yearsSince,
        note:
          'Post-menopausal: no cycle phase. Frame guidance around lean-mass preservation, bone density, joint care, and post-menopausal body composition. Hormonal sensitivity to load/recovery still matters but not on a 28-day cadence.',
        reference: 'user_profiles.menstrual_status',
      };
    }

    if (status === 'pregnancy') {
      return {
        tracking: false,
        status: 'pregnancy',
        note:
          'Pregnant: defer to OB clearance. Frame guidance around safe-for-pregnancy movement, avoid programming around cycle phase.',
        reference: 'user_profiles.menstrual_status',
      };
    }

    if (status === 'not_applicable') {
      return {
        tracking: false,
        status: 'not_applicable',
        note: 'Cycle tracking not applicable for this user.',
        reference: 'user_profiles.menstrual_status',
      };
    }

    if (status === 'perimenopause') {
      return {
        tracking: false,
        status: 'perimenopause',
        note:
          'Cycle phase tracking unreliable in perimenopause; expect irregularity. Frame guidance around perimenopausal symptoms (hot flashes, sleep disruption, etc.).',
        reference: 'user_profiles.menstrual_status',
      };
    }

    // 'cycling' | 'irregular' — compute phase if we have a starting point.
    if (!profile.lastPeriodStart) {
      return {
        tracking: false,
        status,
        note:
          'User cycles but no last_period_start on file. Ask the user when their last period started before framing guidance around phase.',
        reference: 'user_profiles.last_period_start',
      };
    }

    const cycleLength = profile.cycleLengthDays ?? DEFAULT_CYCLE_LENGTH;
    const daysSince = daysBetween(profile.lastPeriodStart, today);
    const cycleDay = ((daysSince % cycleLength) + cycleLength) % cycleLength + 1;
    const daysUntilNext = cycleLength - cycleDay + 1;

    let phase: Phase;
    if (cycleDay <= 5) phase = 'menstrual';
    else if (cycleDay <= 13) phase = 'follicular';
    else if (cycleDay <= 16) phase = 'ovulatory';
    else phase = 'luteal';

    return {
      tracking: true,
      status,
      phase,
      cycle_day: cycleDay,
      cycle_length_days: cycleLength,
      days_until_next: daysUntilNext,
      note:
        status === 'irregular'
          ? 'User reports irregular cycles — treat phase as approximate and expect drift.'
          : undefined,
      reference: 'user_profiles.last_period_start (manual; Apple Health integration pending)',
    };
  },
};
