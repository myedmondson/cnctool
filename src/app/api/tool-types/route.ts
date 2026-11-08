import { NextResponse } from 'next/server';
import { db } from '@/db';
import { toolTypes } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const types = await db.select().from(toolTypes).orderBy(asc(toolTypes.name));
    return NextResponse.json(types);
  } catch (error: any) {
    console.error('Error fetching tool types:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch tool types' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = body.name?.trim().toLowerCase();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const existing = await db.select().from(toolTypes).where(eq(toolTypes.name, name)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Tool type already exists' }, { status: 409 });
    }

    const [newType] = await db.insert(toolTypes).values({ name }).returning();
    return NextResponse.json(newType, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tool type:', error);
    return NextResponse.json({ error: error.message || 'Failed to create tool type' }, { status: 500 });
  }
}

