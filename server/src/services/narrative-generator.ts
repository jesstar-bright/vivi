import Anthropic from '@anthropic-ai/sdk';
import { loadTrainerInstructions } from '../utils.js';

export interface NarrativeInput {
  weekNumber: number;
  mode: string;
  currentMetrics: {
    rhr?: number | null;
    hrv?: number | null;
    sleepHours?: number | null;
    stressAvg?: number | null;
  };
  firstWeekMetrics: {
    rhr?: number | null;
    hrv?: number | null;
    sleepHours?: number | null;
    stressAvg?: number | null;
  };
  strengthGains: Array<{
    exercise: string;
    current_weight: string;
    start_weight: string;
    change: string;
    sessions: number;
  }>;
  modeHistory: string[];
  energyAvg: number | null;
  motivationAvg: number | null;
}

export async function generateProgressNarrative(input: NarrativeInput): Promise<string> {
  const client = new Anthropic();
  const trainerInstructions = loadTrainerInstructions();

  const strengthSummary = input.strengthGains.length > 0
    ? input.strengthGains
        .map((g) => `- ${g.exercise}: ${g.start_weight} → ${g.current_weight} (${g.change} over ${g.sessions} sessions)`)
        .join('\n')
    : 'No strength data available yet.';

  const modeHistorySummary = input.modeHistory.length > 0
    ? input.modeHistory.join(', ')
    : 'No prior mode history.';

  const prompt = `Write a 3-paragraph progress narrative for a client currently on Week ${input.weekNumber} of their fitness program.

CURRENT PROGRAM MODE: ${input.mode}

METRICS COMPARISON:
First week averages:
- Resting HR: ${input.firstWeekMetrics.rhr?.toFixed(1) ?? 'N/A'} bpm
- HRV: ${input.firstWeekMetrics.hrv?.toFixed(1) ?? 'N/A'} ms
- Sleep: ${input.firstWeekMetrics.sleepHours?.toFixed(1) ?? 'N/A'} hrs
- Stress avg: ${input.firstWeekMetrics.stressAvg?.toFixed(1) ?? 'N/A'}

Current averages (last 7 days):
- Resting HR: ${input.currentMetrics.rhr?.toFixed(1) ?? 'N/A'} bpm
- HRV: ${input.currentMetrics.hrv?.toFixed(1) ?? 'N/A'} ms
- Sleep: ${input.currentMetrics.sleepHours?.toFixed(1) ?? 'N/A'} hrs
- Stress avg: ${input.currentMetrics.stressAvg?.toFixed(1) ?? 'N/A'}

STRENGTH GAINS:
${strengthSummary}

TRAINING HISTORY:
- Mode progression: ${modeHistorySummary}
- Average energy (1-10): ${input.energyAvg?.toFixed(1) ?? 'N/A'}
- Average motivation (1-10): ${input.motivationAvg?.toFixed(1) ?? 'N/A'}

NARRATIVE RULES:
- Write in second person ("you", "your")
- Exactly 3 paragraphs
- Use a warm but direct trainer voice
- Weave in specific numbers from the data above
- Paragraph 1: what you've accomplished physically so far
- Paragraph 2: how your body has adapted (metrics changes)
- Paragraph 3: forward-looking insight — where you're headed next
- Plain text only — no markdown, no headers, no bullet points

Write the narrative now.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: trainerInstructions,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return text.text.trim();
}
