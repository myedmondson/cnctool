import { NextResponse } from 'next/server';
import { db } from '@/db';
import { tools } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const [updated] = await db
      .update(tools)
      .set({
        description: body.description?.trim() || null,
        shankIn: body.shankIn ? String(body.shankIn) : null,
        shankM: body.shankM ? String(body.shankM) : null,
        cutDia: body.cutDia ? String(body.cutDia) : null,
        loc: body.loc ? String(body.loc) : null,
        type: body.type,
        part: body.part?.trim() || null,
        series: body.series?.trim() || null,
        coating: body.coating?.trim() || null,
        hsm: body.hsm || null,
        radius: body.radius ? String(body.radius) : null,
        isAssembled: Boolean(body.isAssembled),
        isOutOfStock: Boolean(body.isOutOfStock),
        holder: body.holder?.trim() || null,
        collet: body.collet?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(tools.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating tool:', error);
    return NextResponse.json({ error: error.message || 'Failed to update tool' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const [deleted] = await db.delete(tools).where(eq(tools.id, id)).returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Tool deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting tool:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete tool' }, { status: 500 });
  }
}

