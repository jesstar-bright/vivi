import Anthropic from '@anthropic-ai/sdk';

export interface GarminMetrics {
  date_range: { start: string; end: string };
  daily_metrics: Array<{
    date: string;
    rhr: number | null;
    hrv: number | null;
    sleep_score: number | null;
    sleep_hours: number | null;
    body_battery: number | null;
    steps: number | null;
    vigorous_minutes: number | null;
    stress_avg: number | null;
  }>;
  weekly_averages: {
    rhr: number;
    hrv: number;
    sleep_score: number;
    sleep_hours: number;
    body_battery: number;
    steps: number;
    vigorous_minutes: number;
    stress_avg: number;
  };
}

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
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `You are a health data extraction assistant. Given the text of a Garmin weekly health summary email, extract all health metrics into structured JSON.

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
    messages: [
      {
        role: 'user',
        content: `Extract health metrics from this Garmin weekly summary email:\n\n${emailContent}`,
      },
    ],
  });

  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return JSON.parse(text.text) as GarminMetrics;
}
