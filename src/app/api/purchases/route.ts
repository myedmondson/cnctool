import { NextResponse } from 'next/server';
import { db } from '@/db';
import { purchases, tools } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await db
      .select({
        id: purchases.id,
        toolId: purchases.toolId,
        date: purchases.date,
        vendor: purchases.vendor,
        price: purchases.price,
        poNumber: purchases.poNumber,
        quantity: purchases.quantity,
        dateIndex: purchases.dateIndex,
        toolTnum: tools.tnum,
        toolDescription: tools.description,
      })
      .from(purchases)
      .leftJoin(tools, eq(purchases.toolId, tools.id))
      .orderBy(desc(purchases.date))
      .limit(100);

    return NextResponse.json(list);
  } catch (error: any) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch purchases' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { toolId, vendor, price, poNumber, quantity } = body;

    if (!toolId) {
      return NextResponse.json({ error: 'Tool ID is required' }, { status: 400 });
    }

    const [newPurchase] = await db
      .insert(purchases)
      .values({
        toolId,
        vendor: vendor?.trim() || null,
        price: price ? String(price) : null,
        poNumber: poNumber?.trim() || null,
        quantity: quantity ? Number(quantity) : 1,
      })
      .returning();

    return NextResponse.json(newPurchase, { status: 201 });
  } catch (error: any) {
    console.error('Error logging purchase:', error);
    return NextResponse.json({ error: error.message || 'Failed to record purchase' }, { status: 500 });
  }
}

