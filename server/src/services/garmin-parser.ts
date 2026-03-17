import { z } from 'zod';
import { generateWithSchema } from './ai-generate.js';

const DailyMetricsSchema = z.object({
  date: z.string(),
  rhr: z.number().nullable(),
  hrv: z.number().nullable(),
  sleep_score: z.number().nullable(),
  sleep_hours: z.number().nullable(),
  body_battery: z.number().nullable(),
  steps: z.number().nullable(),
  vigorous_minutes: z.number().nullable(),
  stress_avg: z.number().nullable(),
});

const WeeklyAveragesSchema = z.object({
  rhr: z.number(),
  hrv: z.number(),
  sleep_score: z.number(),
  sleep_hours: z.number(),
  body_battery: z.number(),
  steps: z.number(),
  vigorous_minutes: z.number(),
  stress_avg: z.number(),
});

const GarminMetricsSchema = z.object({
  date_range: z.object({ start: z.string(), end: z.string() }),
  daily_metrics: z.array(DailyMetricsSchema),
  weekly_averages: WeeklyAveragesSchema,
});

export type GarminMetrics = z.infer<typeof GarminMetricsSchema>;

/**
 * Fetch the latest Garmin weekly summary email from Gmail.
 * TODO: Wire up actual Gmail integration (Claude Gmail MCP or API).
 * For now, returns null — caller should fall back to manual input.
 */
export async function fetchLatestGarminEmail(): Promise<string | null> {
  // Placeholder — Gmail integration to be implemented
  // Would search: from:noreply@garmin.com subject:"weekly" newer_than:7d
  return null;
}

/**
 * Parse a Garmin weekly summary email into structured metrics using Claude.
 */
export async function parseGarminEmail(emailContent: string): Promise<GarminMetrics> {
  return generateWithSchema({
    model: 'claude-sonnet-4-6',
    maxTokens: 2000,
    system: `You are a health data extraction assistant. Given the text of a Garmin weekly health summary email, extract all health metrics into structured JSON.

The current year is ${new Date().getFullYear()}. If the email does not include a year, assume all dates are in ${new Date().getFullYear()}.

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "date_range": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "daily_metrics": [
    {
      "date": "YYYY-MM-DD",
      "rhr": <number or null>,
      "hrv": <number or null>,
      "sleep_score": <number or null>,
      "sleep_hours": <number or null>,
      "body_battery": <number or null>,
      "steps": <number or null>,
      "vigorous_minutes": <number or null>,
      "stress_avg": <number or null>
    }
  ],
  "weekly_averages": {
    "rhr": <number>,
    "hrv": <number>,
    "sleep_score": <number>,
    "sleep_hours": <number>,
    "body_battery": <number>,
    "steps": <number>,
    "vigorous_minutes": <number>,
    "stress_avg": <number>
  }
}

If a metric is not mentioned in the email for a given day, use null.
For weekly averages, compute the mean of available daily values.
If the email doesn't contain enough data for a field, use 0 for averages.`,
    prompt: `Extract health metrics from this Garmin weekly summary email:\n\n${emailContent}`,
    schema: GarminMetricsSchema,
    label: 'GarminParse',
  });
}
