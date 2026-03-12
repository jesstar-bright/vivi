import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/pg-core';
import { userProfiles } from './schema.js';

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  await db.insert(userProfiles).values({
    name: 'Jessica',
    startDate: '2026-03-09',
    height: 67, // inches
    conditions: 'PCOS, Mirena IUD',
    goalWeight: 140,
    currentWeight: 152,
    postOpDate: '2026-03-09',
    postOpCleared: false,
  });

  console.log('Seeded user profile for Jessica');
  await pool.end();
}

seed().catch(console.error);
