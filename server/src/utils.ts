import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Compute current program week from start date.
 * Capped at 12 — new cycle logic deferred.
 */
export function computeCurrentWeek(startDate: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const week = Math.ceil(diffDays / 7);
  return Math.min(Math.max(week, 1), 12);
}

/**
 * Load and cache TRAINER_INSTRUCTIONS.md content.
 */
let cachedInstructions: string | null = null;

export function loadTrainerInstructions(): string {
  if (cachedInstructions) return cachedInstructions;

  const path = resolve(__dirname, '../../docs/TRAINER_INSTRUCTIONS.md');
  cachedInstructions = readFileSync(path, 'utf-8');
  return cachedInstructions;
}

/**
 * Standard error response shape.
 */
export interface ApiError {
  error: string;
  code: string;
}
