import { and, gte, desc, eq } from 'drizzle-orm';
import { db, schema } from '../../../db/index.js';
import type { Tool } from '../../shared/types.js';
import { getHealthBaselineDef } from '../tool-definitions.js';

type HealthBaselineInput = {
  days?: number;
};

/**
 * Aggregate Apple Health metrics over the last N days (default 30).
 *
 * Returns averaged headline numbers plus the raw daily rows so the agent can
 * spot intra-window dips without re-querying. If the window is empty we
 * short-circuit with a `note` so the model can adapt without hallucinating
 * an "improving HRV trend" off zero data points.
 *
 * Scoped by `ctx.invocation.user_id` so parallel eval scenarios don't see
 * each other's data.
 */
export const getHealthBaselineTool: Tool = {
  definition: getHealthBaselineDef,
  execute: async (input: HealthBaselineInput, ctx) => {
    const days = input?.days ?? 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const rows = await db
      .select()
      .from(schema.weeklyMetrics)
      .where(
        and(
          eq(schema.weeklyMetrics.userId, ctx.invocation.user_id),
          gte(schema.weeklyMetrics.date, sinceStr),
        ),
      )
      .orderBy(desc(schema.weeklyMetrics.date));

    if (rows.length === 0) {
      return {
        days_returned: 0,
        raw_days: [],
        note: 'No metrics in window',
      };
    }

    const avg = (key: keyof typeof rows[number]) => {
      const vals = rows
        .map((r) => r[key])
        .filter((v): v is number => typeof v === 'number');
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    const sum = (key: keyof typeof rows[number]) => {
      const vals = rows
        .map((r) => r[key])
        .filter((v): v is number => typeof v === 'number');
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0);
    };

    // rows are sorted DESC by date, so the first row carries the latest weight
    // (skip nulls so we don't claim "no weight logged" when one is two days back).
    const latestWeight =
      rows.find((r) => typeof r.weight === 'number')?.weight ?? null;

    return {
      days_returned: rows.length,
      avg_sleep_hours: avg('sleepHours'),
      avg_hrv: avg('hrv'),
      avg_rhr: avg('rhr'),
      avg_body_battery: avg('bodyBattery'),
      avg_steps: avg('steps'),
      avg_stress: avg('stressAvg'),
      total_vigorous_minutes: sum('vigorousMinutes'),
      latest_weight: latestWeight,
      raw_days: rows,
    };
  },
};
