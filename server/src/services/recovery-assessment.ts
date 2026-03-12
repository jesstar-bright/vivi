export interface WeeklyMetrics {
  sleep_avg: number;
  body_battery_avg: number;
  hrv_current: number;
  hrv_prior_week: number;
  stress_avg: number;
}

export interface SelfReport {
  energy: number; // 1-5
  motivation: number; // 1-5
}

export interface RecoveryAssessment {
  mode: 'push' | 'maintain' | 'rampup';
  reasoning: string;
}

export function assessRecovery(params: {
  weeklyMetrics: WeeklyMetrics;
  selfReport: SelfReport;
  weekNumber: number;
  postOpCleared: boolean;
}): RecoveryAssessment {
  const { weeklyMetrics, selfReport, weekNumber, postOpCleared } = params;
  const maintainReasons: string[] = [];

  // Post-op check (highest priority)
  if (weekNumber <= 3 && !postOpCleared) {
    return {
      mode: 'rampup',
      reasoning: `Week ${weekNumber} of post-op recovery. Keeping intensity low — no heavy Valsalva, no inversions. Gradual ramp-up until cleared.`,
    };
  }

  // Recovery signal checks
  if (weeklyMetrics.sleep_avg < 6.5) {
    maintainReasons.push(`Sleep averaged ${weeklyMetrics.sleep_avg.toFixed(1)} hours (under 6.5 target)`);
  }

  if (weeklyMetrics.body_battery_avg < 30) {
    maintainReasons.push(`Body battery averaged ${weeklyMetrics.body_battery_avg.toFixed(0)} (under 30 threshold)`);
  }

  if (weeklyMetrics.hrv_prior_week > 0) {
    const hrvDrop = (weeklyMetrics.hrv_prior_week - weeklyMetrics.hrv_current) / weeklyMetrics.hrv_prior_week;
    if (hrvDrop > 0.15) {
      maintainReasons.push(`HRV dropped ${(hrvDrop * 100).toFixed(0)}% from last week (${weeklyMetrics.hrv_prior_week.toFixed(0)} → ${weeklyMetrics.hrv_current.toFixed(0)})`);
    }
  }

  if (weeklyMetrics.stress_avg > 60) {
    maintainReasons.push(`Stress averaged ${weeklyMetrics.stress_avg.toFixed(0)} (over 60 threshold)`);
  }

  if (selfReport.energy < 3) {
    maintainReasons.push(`Energy self-report was ${selfReport.energy}/5 — body needs recovery`);
  }

  if (maintainReasons.length > 0) {
    return {
      mode: 'maintain',
      reasoning: `Switching to a Maintain week. ${maintainReasons.join('. ')}. Recovery is where gains happen — let's keep moving but not push through fatigue.`,
    };
  }

  return {
    mode: 'push',
    reasoning: 'All recovery signals look green — sleep, HRV, body battery, and stress are in range. Energy is solid. Let\'s push this week.',
  };
}
