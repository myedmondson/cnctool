import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import * as dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false, ssl: 'require' });
const db = drizzle(client, { schema });

function cleanTnum(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  // Strip leading T or t if present, e.g. T1 -> 1, T207 -> 207
  if (trimmed.toUpperCase().startsWith('T')) {
    return trimmed.substring(1).trim();
  }
  return trimmed;
}

function cleanNum(val: string | undefined): string | null {
  if (!val) return null;
  const cleaned = val.trim().replace(/[^\d.-]/g, '');
  if (!cleaned || isNaN(Number(cleaned))) return null;
  return cleaned;
}

async function runSeed() {
  console.log('--- Starting Database Seeding ---');

  // 1. Seed Tool Types
  console.log('1. Seeding Tool Types...');
  const defaultTypes = [
    'endmill',
    'drill',
    'ball',
    'bull_nose',
    'thread_mill',
    'tap',
    'special',
  ];

  for (const typeName of defaultTypes) {
    const existing = await db
      .select()
      .from(schema.toolTypes)
      .where(eq(schema.toolTypes.name, typeName))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.toolTypes).values({ name: typeName });
    }
  }
  console.log(`✓ Ensured ${defaultTypes.length} tool types.`);

  // 2. Read CSVs
  const cutterCsvPath = path.resolve(process.cwd(), 'antigravinputs/Tooling - cutterlog.csv');
  const magCsvPath = path.resolve(process.cwd(), 'antigravinputs/Tooling - Magazine.csv');

  const cutRows: string[][] = parse(fs.readFileSync(cutterCsvPath, 'utf-8'), {
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const magRows: string[][] = parse(fs.readFileSync(magCsvPath, 'utf-8'), {
    skip_empty_lines: true,
    relax_column_count: true,
  });

  // Collect tools metadata from Magazine.csv (Master tool list is index 8 onwards)
  // [8: Column 1 (Tnum), 9: Tool, 10: Use, 11: Dia, 12: Loc, 13: Holder, 14: Holder Class, 15: Collet, 16: Assy, 17: Pocket]
  interface MasterMeta {
    description?: string;
    cutDia?: string | null;
    loc?: string | null;
    holder?: string;
    collet?: string;
    isAssembled?: boolean;
    initialPocket?: number;
  }
  const masterMetaMap = new Map<string, MasterMeta>();

  for (let i = 2; i < magRows.length; i++) {
    const row = magRows[i];
    const rawTnum = row[8];
    const tnum = cleanTnum(rawTnum);
    if (!tnum) continue;

    const desc = row[9]?.trim();
    const dia = cleanNum(row[11]);
    const loc = cleanNum(row[12]);
    const holder = row[13]?.trim() || undefined;
    const collet = row[15]?.trim() || undefined;
    const assy = row[16]?.trim().toLowerCase() === 'y';
    const pocketNum = parseInt(row[17]?.trim() || '0', 10);

    masterMetaMap.set(tnum, {
      description: desc,
      cutDia: dia,
      loc: loc,
      holder,
      collet,
      isAssembled: assy,
      initialPocket: pocketNum > 0 ? pocketNum : undefined,
    });
  }

  // Active magazine pockets mapping from Magazine.csv (indexes 1: Pocket, 2: TNum)
  const activePocketLoadout = new Map<number, string>();
  for (let i = 2; i < magRows.length; i++) {
    const row = magRows[i];
    const pocketStr = row[1]?.trim();
    const pocketNum = parseInt(pocketStr || '0', 10);
    const rawTnum = row[2]?.trim();
    const tnum = cleanTnum(rawTnum);

    if (pocketNum >= 1 && pocketNum <= 21 && tnum) {
      activePocketLoadout.set(pocketNum, tnum);
    }
  }

  // 3. Process tools from cutterlog.csv & masterMetaMap
  console.log('2. Aggregating tool catalog...');
  const toolsMap = new Map<string, {
    tnum: string;
    description: string;
    shankIn: string | null;
    shankM: string | null;
    cutDia: string | null;
    loc: string | null;
    type: string;
    part: string;
    series: string;
    coating: string;
    hsm: string;
    radius: string | null;
    isAssembled: boolean;
    holder?: string;
    collet?: string;
  }>();

  // First pass from cutterlog.csv
  // Header: 0: date index, 1: desc, 2: shank, 3: shank (in), 4: shank (m), 10: cut dia, 11: radius, 12: LOC, 13: series, 14: coating, 15: HSM, 16: Tnum, 17: Part, 18: Type
  for (let i = 1; i < cutRows.length; i++) {
    const row = cutRows[i];
    const tnum = cleanTnum(row[16]);
    if (!tnum) continue;

    const existing = toolsMap.get(tnum);
    const desc = row[1]?.trim() || existing?.description || '';
    const shankIn = cleanNum(row[3]) || existing?.shankIn || null;
    const shankM = cleanNum(row[4]) || existing?.shankM || null;
    const cutDia = cleanNum(row[10]) || existing?.cutDia || null;
    const radius = cleanNum(row[11]) || existing?.radius || null;
    const loc = cleanNum(row[12]) || existing?.loc || null;
    const series = row[13]?.trim() || existing?.series || '';
    const coating = row[14]?.trim() || existing?.coating || '';
    const hsm = row[15]?.trim() || existing?.hsm || '';
    const part = row[17]?.trim() || existing?.part || '';
    const type = row[18]?.trim().toLowerCase() || existing?.type || 'endmill';

    const meta = masterMetaMap.get(tnum);
    const isAssembled = meta?.isAssembled ?? false;

    toolsMap.set(tnum, {
      tnum,
      description: desc || meta?.description || `Tool ${tnum}`,
      shankIn,
      shankM,
      cutDia: cutDia || meta?.cutDia || null,
      loc: loc || meta?.loc || null,
      type: defaultTypes.includes(type) ? type : 'special',
      part,
      series,
      coating,
      hsm,
      radius,
      isAssembled,
      holder: meta?.holder,
      collet: meta?.collet,
    });
  }

  // Also include any tools present in Magazine.csv that weren't in cutterlog.csv
  for (const [tnum, meta] of masterMetaMap.entries()) {
    if (!toolsMap.has(tnum)) {
      toolsMap.set(tnum, {
        tnum,
        description: meta.description || `Tool ${tnum}`,
        shankIn: null,
        shankM: null,
        cutDia: meta.cutDia || null,
        loc: meta.loc || null,
        type: 'endmill',
        part: '',
        series: '',
        coating: '',
        hsm: '',
        radius: null,
        isAssembled: meta.isAssembled ?? false,
        holder: meta.holder,
        collet: meta.collet,
      });
    }
  }

  console.log(`✓ Found ${toolsMap.size} unique tools to insert/update.`);

  // Upsert tools into database
  const insertedToolIdMap = new Map<string, string>(); // tnum -> uuid
  for (const tool of toolsMap.values()) {
    const existing = await db
      .select({ id: schema.tools.id })
      .from(schema.tools)
      .where(eq(schema.tools.tnum, tool.tnum))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.tools)
        .set({
          description: tool.description,
          shankIn: tool.shankIn,
          shankM: tool.shankM,
          cutDia: tool.cutDia,
          loc: tool.loc,
          type: tool.type,
          part: tool.part,
          series: tool.series,
          coating: tool.coating,
          hsm: tool.hsm,
          radius: tool.radius,
          isAssembled: tool.isAssembled,
          holder: tool.holder,
          collet: tool.collet,
          updatedAt: new Date(),
        })
        .where(eq(schema.tools.id, existing[0].id));
      insertedToolIdMap.set(tool.tnum, existing[0].id);
    } else {
      const [inserted] = await db
        .insert(schema.tools)
        .values({
          tnum: tool.tnum,
          description: tool.description,
          shankIn: tool.shankIn,
          shankM: tool.shankM,
          cutDia: tool.cutDia,
          loc: tool.loc,
          type: tool.type,
          part: tool.part,
          series: tool.series,
          coating: tool.coating,
          hsm: tool.hsm,
          radius: tool.radius,
          isAssembled: tool.isAssembled,
          holder: tool.holder,
          collet: tool.collet,
        })
        .returning({ id: schema.tools.id });
      insertedToolIdMap.set(tool.tnum, inserted.id);
    }
  }
  console.log(`✓ Processed ${insertedToolIdMap.size} tools in database.`);

  // 4. Seed Purchases from cutterlog.csv
  console.log('3. Seeding Purchases log...');
  let purchaseCount = 0;
  for (let i = 1; i < cutRows.length; i++) {
    const row = cutRows[i];
    const tnum = cleanTnum(row[16]);
    if (!tnum) continue;
    const toolId = insertedToolIdMap.get(tnum);
    if (!toolId) continue;

    const dateIdx = parseInt(row[0] || '0', 10);
    const partNum = row[17]?.trim() || null;

    // Check if purchase already exists for this dateIndex and toolId
    const existing = await db
      .select({ id: schema.purchases.id })
      .from(schema.purchases)
      .where(eq(schema.purchases.dateIndex, dateIdx))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.purchases).values({
        toolId,
        dateIndex: dateIdx > 0 ? dateIdx : null,
        poNumber: partNum ? `PO-${partNum}` : null,
        vendor: 'Standard Supply',
        quantity: 1,
      });
      purchaseCount++;
    }
  }
  console.log(`✓ Seeded ${purchaseCount} purchase records.`);

  // 5. Seed Magazine & Pockets
  console.log('4. Seeding Magazine and 21 Pockets...');
  let [mag] = await db
    .select()
    .from(schema.magazines)
    .where(eq(schema.magazines.machineName, 'VF-2'))
    .limit(1);

  if (!mag) {
    const [newMag] = await db
      .insert(schema.magazines)
      .values({
        machineName: 'VF-2',
        totalPockets: 21,
      })
      .returning();
    mag = newMag;
  }

  // Ensure pockets 1 to 21 exist
  for (let p = 1; p <= 21; p++) {
    const targetTnum = activePocketLoadout.get(p);
    const targetToolId = targetTnum ? insertedToolIdMap.get(targetTnum) || null : null;

    const [existingPocket] = await db
      .select()
      .from(schema.magazinePockets)
      .where(
        and(
          eq(schema.magazinePockets.magazineId, mag.id),
          eq(schema.magazinePockets.pocketNumber, p)
        )
      )
      .limit(1);

    if (existingPocket) {
      if (targetToolId && !existingPocket.toolId) {
        await db
          .update(schema.magazinePockets)
          .set({ toolId: targetToolId })
          .where(eq(schema.magazinePockets.id, existingPocket.id));
      }
    } else {
      await db.insert(schema.magazinePockets).values({
        magazineId: mag.id,
        pocketNumber: p,
        toolId: targetToolId,
      });
    }
  }
  console.log(`✓ Seeded 21 magazine pockets (VF-2 loaded according to Magazine.csv).`);

  console.log('--- Seeding Completed Successfully! ---');
  await client.end();
}

runSeed().catch((err) => {
  console.error('Seeding failed with error:', err);
  process.exit(1);
});
