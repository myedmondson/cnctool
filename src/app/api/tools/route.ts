import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tools, magazinePockets, purchases } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allTools = await db.select().from(tools).orderBy(tools.tnum);
    const pockets = await db.select().from(magazinePockets);

    // Map pocket assignments by toolId
    const pocketMap = new Map<string, number>();
    for (const p of pockets) {
      if (p.toolId) {
        pocketMap.set(p.toolId, p.pocketNumber);
      }
    }

    const result = allTools.map((t) => ({
      ...t,
      currentPocket: pocketMap.get(t.id) || null,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching tools:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tools' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tnum,
      description,
      shankIn,
      shankM,
      cutDia,
      loc,
      type,
      part,
      series,
      coating,
      hsm,
      radius,
      isAssembled,
      isOutOfStock,
      holder,
      collet,
      // Purchase restock info if provided at creation
      purchaseQuantity,
      purchasePrice,
      purchaseVendor,
      purchasePo,
    } = body;

    if (!tnum) {
      return NextResponse.json({ error: 'Tnum (Tool Number) is required' }, { status: 400 });
    }

    // Check if tnum already exists
    const existing = await db.select().from(tools).where(eq(tools.tnum, tnum)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: `Tool number T${tnum} already exists` }, { status: 409 });
    }

    const [newTool] = await db
      .insert(tools)
      .values({
        tnum: String(tnum).trim(),
        description: description?.trim() || null,
        shankIn: shankIn ? String(shankIn) : null,
        shankM: shankM ? String(shankM) : null,
        cutDia: cutDia ? String(cutDia) : null,
        loc: loc ? String(loc) : null,
        type: type || 'endmill',
        part: part?.trim() || null,
        series: series?.trim() || null,
        coating: coating?.trim() || null,
        hsm: hsm || null,
        radius: radius ? String(radius) : null,
        isAssembled: Boolean(isAssembled),
        isOutOfStock: Boolean(isOutOfStock),
        holder: holder?.trim() || null,
        collet: collet?.trim() || null,
      })
      .returning();

    // If purchase entry was supplied, log it
    if (purchaseQuantity && Number(purchaseQuantity) > 0) {
      await db.insert(purchases).values({
        toolId: newTool.id,
        quantity: Number(purchaseQuantity),
        price: purchasePrice ? String(purchasePrice) : null,
        vendor: purchaseVendor?.trim() || null,
        poNumber: purchasePo?.trim() || null,
      });
    }

    return NextResponse.json(newTool, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tool:', error);
    return NextResponse.json({ error: error.message || 'Failed to create tool' }, { status: 500 });
  }
}

