import pg from 'pg';
import { readFile } from 'node:fs/promises';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required.');
const client = new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(await readFile(new URL('../commerce/schema.sql',import.meta.url),'utf8'));
  await client.query('COMMIT');
  console.log('Commerce schema ready.');
} catch(e) { await client.query('ROLLBACK');throw e; } finally { await client.end(); }
