import * as dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: '.env.local' });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  const sql = postgres(connectionString, {
    prepare: false,
    ssl: 'require',
    connect_timeout: 10,
  });

  try {
    console.log('Connecting to Supabase PostgreSQL database...');

    const tables = [
      'tool_types',
      'fusion_jobs',
      'magazines',
      'magazine_pockets',
      'tools',
      'purchases',
    ];

    for (const table of tables) {
      console.log(`Enabling RLS on public.${table}...`);
      await sql.unsafe(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
    }

    console.log('\nChecking RLS status for all public tables:');
    const result = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.table(result);
    console.log('\nSuccessfully enabled RLS on all tables!');
  } catch (err) {
    console.error('Error executing SQL:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();

