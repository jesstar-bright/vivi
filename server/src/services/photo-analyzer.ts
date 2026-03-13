import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { loadTrainerInstructions } from '../utils.js';

export interface PhotoAnalysis {
  observations: {
    muscle_groups: Record<string, { development: string; change_vs_last: string }>;
    estimated_body_fat_trend: string;
    posture_notes: string;
  };
  gap_analysis: {
    priority_focus: string[];
    on_track: string[];
    reasoning: string;
  };
  recommended_adjustments: {
    add_volume: string[];
    maintain_volume: string[];
    reduce_volume: string[];
    nutrition_flag: string | null;
  };
}

// Load goal reference images at startup
let goalImages: Array<{ data: string; media_type: string }> = [];

function loadGoalImages() {
  if (goalImages.length > 0) return goalImages;

  const refDir = resolve(__dirname, '../../../docs/body-reference');
  try {
    const files = readdirSync(refDir).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
    goalImages = files.map((file) => {
      const buffer = readFileSync(resolve(refDir, file));
      const ext = file.split('.').pop()?.toLowerCase();
      const mediaType = ext === 'png' ? 'image/png' : 'image/jpeg';
      return { data: buffer.toString('base64'), media_type: mediaType };
    });
  } catch {
    console.warn('Could not load goal reference images from docs/body-reference/');
  }

  return goalImages;
}

export async function analyzeProgressPhoto(params: {
  currentPhoto: Buffer;
  previousPhoto?: Buffer;
}): Promise<PhotoAnalysis> {
  const client = new Anthropic();
  const trainerInstructions = loadTrainerInstructions();
  const goals = loadGoalImages();

  const content: Anthropic.MessageCreateParams['messages'][0]['content'] = [];

  // Add goal reference images
  for (const img of goals) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.media_type as 'image/png' | 'image/jpeg', data: img.data },
    });
  }
  if (goals.length > 0) {
    content.push({ type: 'text', text: 'Above: Goal physique reference images.' });
  }

  // Add previous photo if available
  if (params.previousPhoto) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: params.previousPhoto.toString('base64') },
    });
    content.push({ type: 'text', text: 'Above: Previous check-in photo.' });
  }

  // Add current photo
  content.push({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: params.currentPhoto.toString('base64') },
  });
  content.push({ type: 'text', text: 'Above: Current progress photo. Analyze this against the goal physique.' });

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2000,
    system: `You are a professional celebrity fitness trainer analyzing progress photos.

${trainerInstructions}

Analyze the current progress photo compared to the goal physique reference images. If a previous check-in photo is provided, note changes.

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "observations": {
    "muscle_groups": {
      "shoulders": { "development": "low|moderate|high", "change_vs_last": "improving|stable|declining|not_visible" },
      "arms": { ... },
      "core": { ... },
      "glutes": { ... },
      "legs": { ... },
      "back": { ... }
    },
    "estimated_body_fat_trend": "decreasing|stable|increasing",
    "posture_notes": "string"
  },
  "gap_analysis": {
    "priority_focus": ["muscle_group1", "muscle_group2"],
    "on_track": ["muscle_group1"],
    "reasoning": "string"
  },
  "recommended_adjustments": {
    "add_volume": ["muscle_group_or_exercise"],
    "maintain_volume": ["muscle_group"],
    "reduce_volume": [],
    "nutrition_flag": "string or null"
  }
}`,
    messages: [{ role: 'user', content }],
  });

  const text = response.content[0];
  if (text.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  return JSON.parse(text.text) as PhotoAnalysis;
}
