import { and, eq } from 'drizzle-orm';
import { db, schema } from '../../db/index.js';

/**
 * Trainer memory persistence.
 *
 * Memory is a per-user key/value store backed by the `trainer_memory` Postgres
 * table (Drizzle table: `schema.trainerMemory`). It's loaded into the agent's
 * context blob at the start of each invocation and updated via the
 * `record_pattern_detection` tool (and any other write paths) during the loop.
 */

/**
 * Load every memory entry for a user as a flat object keyed by `key`.
 * Returns an empty object if the user has no memory yet.
 */
export async function loadMemory(userId: number): Promise<Record<string, unknown>> {
  const rows = await db
    .select()
    .from(schema.trainerMemory)
    .where(eq(schema.trainerMemory.userId, userId));

  const memory: Record<string, unknown> = {};
  for (const row of rows) {
    memory[row.key] = row.value as unknown;
  }
  return memory;
}

/**
 * Upsert a single memory key for a user. Updates `last_updated` to now.
 */
export async function saveMemoryKey(
  userId: number,
  key: string,
  value: unknown,
): Promise<void> {
  const now = new Date();
  await db
    .insert(schema.trainerMemory)
    .values({
      userId,
      key,
      value: value as any,
      lastUpdated: now,
    })
    .onConflictDoUpdate({
      target: [schema.trainerMemory.userId, schema.trainerMemory.key],
      set: {
        value: value as any,
        lastUpdated: now,
      },
    });
}

/**
 * Upsert multiple memory keys in one batch. Each key is upserted independently
 * so a partial failure of one key doesn't roll back the others — but this is
 * a single round-trip per key against the DB pool.
 */
export async function saveMemory(
  userId: number,
  updates: Record<string, unknown>,
): Promise<void> {
  const entries = Object.entries(updates);
  if (entries.length === 0) return;

  const now = new Date();
  await Promise.all(
    entries.map(([key, value]) =>
      db
        .insert(schema.trainerMemory)
        .values({
          userId,
          key,
          value: value as any,
          lastUpdated: now,
        })
        .onConflictDoUpdate({
          target: [schema.trainerMemory.userId, schema.trainerMemory.key],
          set: {
            value: value as any,
            lastUpdated: now,
          },
        }),
    ),
  );
}

// `and` is intentionally re-exported so callers that need composite predicates
// can use the same drizzle operator instance. Keeping it imported keeps the
// memory module a one-stop import surface for trainer_memory access.
export { and };
