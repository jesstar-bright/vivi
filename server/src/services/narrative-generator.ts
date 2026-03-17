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

  const prompt = `Write a short progress note for a client currently on Week ${input.weekNumber} of their fitness program.

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
- Maximum 5-6 sentences total — NOT paragraphs, sentences
- Conversational and warm, like a text from your trainer
- Write in second person ("you", "your")
- Lead with one specific win or insight pulled from the data above
- Then one forward-looking sentence about what's next
- End with a WEEKLY INTENTION: 1-2 sentences giving her something specific to focus on or remember this week. This should feel like a mantra or mindset anchor — something she can come back to when motivation dips. Examples: "This week, remember: every rep you do in ramp-up is teaching your body to trust the process again." or "Your intention this week: prioritize protein at every meal — it's the one thing that protects your muscle while the fat comes off."
- Weave in 1-2 specific numbers naturally
- Plain text only — no markdown, no headers, no bullet points

Example of the right length and tone:
"Two weeks in and you're already building the foundation — your sleep is averaging 9.4 hours and your body battery is recovering well between sessions. The ramp-up phase is doing exactly what it should: getting your muscles used to load without pushing recovery. Next week we start adding real weight."

Write the narrative now.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    system: trainerInstructions,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return text.text.trim();
}
