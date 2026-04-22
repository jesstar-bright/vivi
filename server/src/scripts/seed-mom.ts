import 'dotenv/config';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

/**
 * One-shot seed for Jessica's mother + per-user auth tokens.
 *
 * Run with: `npx tsx src/scripts/seed-mom.ts`
 *
 * Idempotent: re-running will not duplicate Mom's profile (we look up by
 * `name = 'Mom'`). We always issue NEW tokens on each run — the old tokens in
 * the table remain valid until manually revoked. This is intentional so
 * Jessica can re-run the script when she needs a fresh device-bound token
 * without invalidating the one already in use.
 *
 * Outputs both tokens to stdout. CRITICAL: capture them — they are not
 * recoverable from the DB in any meaningful sense (well, you can SELECT them,
 * but the script's output is the canonical handoff).
 */

const MOM_PROFILE = {
  name: 'Mom',
  startDate: new Date().toISOString().slice(0, 10),
  dateOfBirth: '1972-06-15',
  menstrualStatus: 'menopause' as const,
  menopauseOnsetDate: '2012-06-15',
  conditions:
    'post-menopausal (since age 40, early menopause), history of gestational diabetes (2 of 6 pregnancies), eczema (flares with sweat/heat)',
  medications: 'GLP-1 (weight loss)',
  sensitivities: 'claustrophobic about sweating, eczema flares with sweat and skin heat',
  activityBaseline: 'light',
  goalsText:
    'preserve lean mass, manage post-menopausal body composition, sustainable activity she actually enjoys',
  equipmentAccess: 'gym access, walking outdoors, Apple Watch (data connection pending)',
  postOpCleared: true,
};

function newToken(): string {
  // 24 random bytes → 32-char base64url. Safe in URLs and headers, no padding.
  return randomBytes(24).toString('base64url');
}

async function getOrCreateMom(): Promise<number> {
  const existing = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.name, MOM_PROFILE.name))
    .limit(1);

  if (existing[0]) {
    console.log(`Mom profile already exists (user_id=${existing[0].id}); skipping insert.`);
    return existing[0].id;
  }

  const [inserted] = await db
    .insert(schema.userProfiles)
    .values(MOM_PROFILE)
    .returning({ id: schema.userProfiles.id });
  console.log(`Inserted Mom profile (user_id=${inserted.id}).`);
  return inserted.id;
}

async function issueToken(userId: number, label: string): Promise<string> {
  const token = newToken();
  await db.insert(schema.authTokens).values({ userId, token, label });
  return token;
}

async function main() {
  const momId = await getOrCreateMom();
  const momToken = await issueToken(momId, "mom's first device");

  // Jessica is user_id=1 by convention (the seed in index.ts assigns id=1 on
  // first boot). If that profile doesn't exist for any reason, skip rather
  // than creating a stub.
  const jessicaRows = await db
    .select()
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.id, 1))
    .limit(1);

  let jessicaToken: string | null = null;
  if (jessicaRows[0]) {
    jessicaToken = await issueToken(1, "jessica's localhost");
  } else {
    console.log('No user_id=1 found; skipping Jessica token issuance.');
  }

  console.log('\n========== TOKENS ==========');
  console.log(`Mom (user_id=${momId}): ${momToken}`);
  if (jessicaToken) {
    console.log(`Jessica (user_id=1): ${jessicaToken}`);
  }
  console.log('============================\n');
  console.log('Save these now — re-run the script to mint additional tokens.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('seed-mom failed:', err);
    process.exit(1);
  });
