import { NextResponse } from 'next/server';
import { db } from '@/db';
import { magazines, magazinePockets, tools } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const machineName = body.machineName || 'Brother Speedio S700xd1';

    // Retrieve active magazine
    const [mag] = await db
      .select()
      .from(magazines)
      .where(eq(magazines.machineName, machineName))
      .limit(1);

    if (!mag) {
      return NextResponse.json({ error: `Magazine for machine '${machineName}' not found` }, { status: 404 });
    }

    // Retrieve pocket assignments
    const pockets = await db
      .select({
        pocketNumber: magazinePockets.pocketNumber,
        tool: tools,
      })
      .from(magazinePockets)
      .leftJoin(tools, eq(magazinePockets.toolId, tools.id))
      .where(eq(magazinePockets.magazineId, mag.id))
      .orderBy(asc(magazinePockets.pocketNumber));

    // Construct Fusion 360 Tool Library Compatible Structure (.json format)
    const exportPayload = {
      version: '1.0.0',
      description: `Exported Pocket Allocations for ${machineName}`,
      exportDate: new Date().toISOString(),
      machine: machineName,
      totalPockets: mag.totalPockets,
      data: pockets.map((p) => {
        if (!p.tool) {
          return {
            pocket: p.pocketNumber,
            tnum: null,
            status: 'EMPTY',
          };
        }
        return {
          pocket: p.pocketNumber,
          tnum: p.tool.tnum,
          description: p.tool.description,
          geometry: {
            diameter: p.tool.cutDia ? parseFloat(p.tool.cutDia) : null,
            lengthOfCut: p.tool.loc ? parseFloat(p.tool.loc) : null,
            shankDiameter: p.tool.shankIn ? parseFloat(p.tool.shankIn) : null,
            cornerType: p.tool.radius ? 'radius' : 'flat',
            cornerMetricRadius: p.tool.radius ? parseFloat(p.tool.radius) : 0,
          },
          toolType: p.tool.type,
          partNumber: p.tool.part,
          assembly: {
            isAssembled: p.tool.isAssembled,
            holder: p.tool.holder || null,
            collet: p.tool.collet || null,
          },
          status: 'OCCUPIED',
        };
      }),
    };

    return NextResponse.json({
      success: true,
      exportPayload,
      summary: `Successfully generated export for ${pockets.filter((p) => p.tool).length} occupied pockets.`,
    });
  } catch (error: any) {
    console.error('Error generating Fusion tool export:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate export' }, { status: 500 });
  }
}

