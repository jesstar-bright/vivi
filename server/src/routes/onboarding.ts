import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import type { AppEnv } from '../types/hono-env.js';

/**
 * Onboarding endpoint — accepts a partial profile patch from the
 * Claude-Design-built onboarding UI and writes it to user_profiles. Auth is
 * required (per-user token); the user can only patch their own row.
 *
 * PATCH semantics: only fields present in the body are updated. Pass null to
 * explicitly clear a field.
 */
export const onboardingRouter = new Hono<AppEnv>();

const ProfilePatchSchema = z.object({
  name: z.string().min(1).optional(),
  dateOfBirth: z.string().nullable().optional(),
  menstrualStatus: z
    .enum([
      'cycling',
      'irregular',
      'perimenopause',
      'menopause',
      'pregnancy',
      'not_applicable',
    ])
    .nullable()
    .optional(),
  lastPeriodStart: z.string().nullable().optional(),
  cycleLengthDays: z.number().int().min(14).max(60).nullable().optional(),
  menopauseOnsetDate: z.string().nullable().optional(),
  conditions: z.string().nullable().optional(),
  medications: z.string().nullable().optional(),
  sensitivities: z.string().nullable().optional(),
  activityBaseline: z
    .enum(['sedentary', 'light', 'moderate', 'active'])
    .nullable()
    .optional(),
  goalsText: z.string().nullable().optional(),
  equipmentAccess: z.string().nullable().optional(),
  height: z.number().nullable().optional(),
  currentWeight: z.number().nullable().optional(),
  goalWeight: z.number().nullable().optional(),
});

onboardingRouter.patch('/profile', async (c) => {
  const userId = c.get('user_id');
  if (typeof userId !== 'number') {
    return c.json({ error: 'no user context' }, 400);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = ProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: 'invalid profile patch',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      400,
    );
  }

  const updates = parsed.data;
  if (Object.keys(updates).length === 0) {
    return c.json({ error: 'empty patch' }, 400);
  }

  await db
    .update(schema.userProfiles)
    .set(updates)
    .where(eq(schema.userProfiles.id, userId));

  const rows = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.id, userId))
    .limit(1);

  return c.json({ profile: rows[0] });
});
