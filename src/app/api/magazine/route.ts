import { NextResponse } from 'next/server';
import { db } from '@/db';
import { magazines, magazinePockets, tools } from '@/db/schema';
import { eq, asc, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

async function getOrCreateMagazine() {
  let [mag] = await db
    .select()
    .from(magazines)
    .where(eq(magazines.machineName, 'Brother Speedio S700xd1'))
    .limit(1);

  if (!mag) {
    const [newMag] = await db
      .insert(magazines)
      .values({
        machineName: 'Brother Speedio S700xd1',
        totalPockets: 21,
      })
      .returning();
    mag = newMag;

    // Create pockets 1-21
    for (let p = 1; p <= 21; p++) {
      await db.insert(magazinePockets).values({
        magazineId: mag.id,
        pocketNumber: p,
        toolId: null,
      });
    }
  }

  return mag;
}

export async function GET() {
  try {
    const mag = await getOrCreateMagazine();

    // Query pockets with tool details
    const pockets = await db
      .select({
        id: magazinePockets.id,
        pocketNumber: magazinePockets.pocketNumber,
        toolId: magazinePockets.toolId,
        tool: tools,
      })
      .from(magazinePockets)
      .leftJoin(tools, eq(magazinePockets.toolId, tools.id))
      .where(eq(magazinePockets.magazineId, mag.id))
      .orderBy(asc(magazinePockets.pocketNumber));

    // Ensure all 21 pockets exist
    const pocketMap = new Map(pockets.map((p) => [p.pocketNumber, p]));
    const fullPockets = [];
    for (let i = 1; i <= 21; i++) {
      if (pocketMap.has(i)) {
        fullPockets.push(pocketMap.get(i)!);
      } else {
        const [newPocket] = await db
          .insert(magazinePockets)
          .values({
            magazineId: mag.id,
            pocketNumber: i,
            toolId: null,
          })
          .returning();
        fullPockets.push({
          id: newPocket.id,
          pocketNumber: i,
          toolId: null,
          tool: null,
        });
      }
    }

    return NextResponse.json({
      magazine: mag,
      pockets: fullPockets,
    });
  } catch (error: any) {
    console.error('Error fetching magazine:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch magazine' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const mag = await getOrCreateMagazine();
    const body = await req.json();
    const { action, pocketNumber, toolId, fromPocket, toPocket } = body;

    if (action === 'assign') {
      if (!pocketNumber || pocketNumber < 1 || pocketNumber > 21) {
        return NextResponse.json({ error: 'Valid pocketNumber (1-21) is required' }, { status: 400 });
      }

      // Assign tool to pocket
      await db
        .update(magazinePockets)
        .set({ toolId: toolId || null })
        .where(
          and(
            eq(magazinePockets.magazineId, mag.id),
            eq(magazinePockets.pocketNumber, pocketNumber)
          )
        );

      return NextResponse.json({ success: true, message: `Tool assigned to pocket ${pocketNumber}` });
    }

    if (action === 'unassign') {
      if (!pocketNumber || pocketNumber < 1 || pocketNumber > 21) {
        return NextResponse.json({ error: 'Valid pocketNumber (1-21) is required' }, { status: 400 });
      }

      await db
        .update(magazinePockets)
        .set({ toolId: null })
        .where(
          and(
            eq(magazinePockets.magazineId, mag.id),
            eq(magazinePockets.pocketNumber, pocketNumber)
          )
        );

      return NextResponse.json({ success: true, message: `Pocket ${pocketNumber} cleared` });
    }

    if (action === 'swap') {
      if (!fromPocket || !toPocket || fromPocket === toPocket) {
        return NextResponse.json({ error: 'Valid distinct fromPocket and toPocket required' }, { status: 400 });
      }

      const [pocketA] = await db
        .select()
        .from(magazinePockets)
        .where(
          and(
            eq(magazinePockets.magazineId, mag.id),
            eq(magazinePockets.pocketNumber, fromPocket)
          )
        )
        .limit(1);

      const [pocketB] = await db
        .select()
        .from(magazinePockets)
        .where(
          and(
            eq(magazinePockets.magazineId, mag.id),
            eq(magazinePockets.pocketNumber, toPocket)
          )
        )
        .limit(1);

      const toolIdA = pocketA?.toolId || null;
      const toolIdB = pocketB?.toolId || null;

      // Swap tool assignments
      await db
        .update(magazinePockets)
        .set({ toolId: toolIdB })
        .where(eq(magazinePockets.id, pocketA.id));

      await db
        .update(magazinePockets)
        .set({ toolId: toolIdA })
        .where(eq(magazinePockets.id, pocketB.id));

      return NextResponse.json({ success: true, message: `Swapped pocket ${fromPocket} and ${toPocket}` });
    }

    if (action === 'emptyAll') {
      await db
        .update(magazinePockets)
        .set({ toolId: null })
        .where(eq(magazinePockets.magazineId, mag.id));

      return NextResponse.json({ success: true, message: 'All pockets emptied' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error modifying magazine:', error);
    return NextResponse.json({ error: error.message || 'Failed to update magazine' }, { status: 500 });
  }
}
