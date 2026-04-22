import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Placeholder onboarding flow.
 *
 * REPLACE THIS WITH THE CLAUDE-DESIGN-BUILT MULTI-STEP ONBOARDING UI.
 *
 * Contract:
 *   - Endpoint: PATCH /api/onboarding/profile
 *   - Body: any subset of these fields (all optional):
 *       name, dateOfBirth, menstrualStatus, lastPeriodStart,
 *       cycleLengthDays, menopauseOnsetDate, conditions, medications,
 *       sensitivities, activityBaseline, goalsText, equipmentAccess,
 *       height, currentWeight, goalWeight
 *   - menstrualStatus enum: 'cycling' | 'irregular' | 'perimenopause' |
 *       'menopause' | 'pregnancy' | 'not_applicable'
 *   - activityBaseline enum: 'sedentary' | 'light' | 'moderate' | 'active'
 *   - "Profile complete" gate (in /api/auth/me) requires BOTH
 *     menstrualStatus AND activityBaseline to be set. Until both are
 *     present, the user is bounced back here.
 *   - On successful patch, invalidate the 'currentUser' query so the
 *     auth gate re-checks and routes to the real app.
 */
export default function OnboardingPage() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bare-bones submit so the gate works end-to-end. The real UI replaces this.
  async function quickComplete() {
    setSubmitting(true);
    setError(null);
    try {
      await api.patch('/api/onboarding/profile', {
        menstrualStatus: 'not_applicable',
        activityBaseline: 'sedentary',
      });
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-semibold">Welcome to Crea</h1>
        <p className="text-muted-foreground">
          Onboarding UI is being built. For now, click below to set minimum
          defaults so you can explore the app.
        </p>
        <button
          onClick={quickComplete}
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? 'Saving…' : 'Continue with defaults'}
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
