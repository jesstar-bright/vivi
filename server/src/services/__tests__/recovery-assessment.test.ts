import { describe, it, expect } from 'vitest';
import { assessRecovery } from '../recovery-assessment.js';

const greenMetrics = {
  sleep_avg: 7.5,
  body_battery_avg: 55,
  hrv_current: 45,
  hrv_prior_week: 44,
  stress_avg: 35,
};

const greenSelfReport = { energy: 4, motivation: 4 };

describe('assessRecovery', () => {
  it('returns rampup when post-op not cleared in weeks 1-3', () => {
    const result = assessRecovery({
      weeklyMetrics: greenMetrics,
      selfReport: greenSelfReport,
      weekNumber: 2,
      postOpCleared: false,
    });
    expect(result.mode).toBe('rampup');
    expect(result.reasoning).toContain('post-op');
  });

  it('does NOT force rampup when post-op is cleared in week 2', () => {
    const result = assessRecovery({
      weeklyMetrics: greenMetrics,
      selfReport: greenSelfReport,
      weekNumber: 2,
      postOpCleared: true,
    });
    expect(result.mode).toBe('push');
  });

  it('returns maintain when sleep avg < 6.5', () => {
    const result = assessRecovery({
      weeklyMetrics: { ...greenMetrics, sleep_avg: 6.0 },
      selfReport: greenSelfReport,
      weekNumber: 5,
      postOpCleared: true,
    });
    expect(result.mode).toBe('maintain');
    expect(result.reasoning).toContain('Sleep');
  });

  it('returns maintain when body battery avg < 30', () => {
    const result = assessRecovery({
      weeklyMetrics: { ...greenMetrics, body_battery_avg: 25 },
      selfReport: greenSelfReport,
      weekNumber: 5,
      postOpCleared: true,
    });
    expect(result.mode).toBe('maintain');
    expect(result.reasoning).toContain('Body battery');
  });

  it('returns maintain when HRV dropped > 15%', () => {
    const result = assessRecovery({
      weeklyMetrics: { ...greenMetrics, hrv_current: 36, hrv_prior_week: 45 },
      selfReport: greenSelfReport,
      weekNumber: 5,
      postOpCleared: true,
    });
    expect(result.mode).toBe('maintain');
    expect(result.reasoning).toContain('HRV');
  });

  it('returns maintain when stress avg > 60', () => {
    const result = assessRecovery({
      weeklyMetrics: { ...greenMetrics, stress_avg: 65 },
      selfReport: greenSelfReport,
      weekNumber: 5,
      postOpCleared: true,
    });
    expect(result.mode).toBe('maintain');
    expect(result.reasoning).toContain('Stress');
  });

  it('returns maintain when energy self-report < 3', () => {
    const result = assessRecovery({
      weeklyMetrics: greenMetrics,
      selfReport: { energy: 2, motivation: 4 },
      weekNumber: 5,
      postOpCleared: true,
    });
    expect(result.mode).toBe('maintain');
    expect(result.reasoning).toContain('Energy');
  });

  it('returns push when all signals are green', () => {
    const result = assessRecovery({
      weeklyMetrics: greenMetrics,
      selfReport: greenSelfReport,
      weekNumber: 5,
      postOpCleared: true,
    });
    expect(result.mode).toBe('push');
    expect(result.reasoning).toContain('green');
  });

  it('returns maintain with combined reasoning for multiple triggers', () => {
    const result = assessRecovery({
      weeklyMetrics: { ...greenMetrics, sleep_avg: 5.5, stress_avg: 70 },
      selfReport: { energy: 2, motivation: 3 },
      weekNumber: 5,
      postOpCleared: true,
    });
    expect(result.mode).toBe('maintain');
    expect(result.reasoning).toContain('Sleep');
    expect(result.reasoning).toContain('Stress');
    expect(result.reasoning).toContain('Energy');
  });
});
