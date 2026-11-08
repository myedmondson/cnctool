import { NextResponse } from 'next/server';
import { db } from '@/db';
import { fusionJobs, tools, magazinePockets } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

function cleanTnum(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.toUpperCase().startsWith('T')) {
    return trimmed.substring(1).trim();
  }
  return trimmed;
}

// GET: Returns the latest active fusion job along with diff against active magazine pockets
export async function GET() {
  try {
    const [latestJob] = await db
      .select()
      .from(fusionJobs)
      .orderBy(desc(fusionJobs.receivedAt))
      .limit(1);

    if (!latestJob) {
      return NextResponse.json({
        activeJob: null,
        statusSummary: { ready: 0, missing: 0, total: 0 },
        toolsDiff: [],
      });
    }

    // Get active magazine pockets and current tools
    const pockets = await db
      .select({
        pocketNumber: magazinePockets.pocketNumber,
        toolId: magazinePockets.toolId,
        tnum: tools.tnum,
        isAssembled: tools.isAssembled,
      })
      .from(magazinePockets)
      .leftJoin(tools, eq(magazinePockets.toolId, tools.id));

    // Map mounted Tnums -> pocket number
    const mountedTnums = new Map<string, number>();
    for (const p of pockets) {
      if (p.tnum) {
        mountedTnums.set(cleanTnum(p.tnum), p.pocketNumber);
      }
    }

    // Also get all library tools to check if required tools exist in database catalog
    const libraryTools = await db.select({ tnum: tools.tnum, isAssembled: tools.isAssembled }).from(tools);
    const catalogMap = new Map<string, boolean>();
    for (const t of libraryTools) {
      catalogMap.set(cleanTnum(t.tnum), t.isAssembled);
    }

    const requiredTools = (latestJob.requiredTools || []) as Array<{ tnum: string; description: string }>;

    let readyCount = 0;
    let missingCount = 0;

    const toolsDiff = requiredTools.map((req) => {
      const normalizedReqTnum = cleanTnum(req.tnum);
      const isMounted = mountedTnums.has(normalizedReqTnum);
      const mountedPocket = mountedTnums.get(normalizedReqTnum) || null;
      const existsInCatalog = catalogMap.has(normalizedReqTnum);
      const isAssembled = catalogMap.get(normalizedReqTnum) || false;

      if (isMounted) {
        readyCount++;
      } else {
        missingCount++;
      }

      return {
        tnum: req.tnum,
        normalizedTnum: normalizedReqTnum,
        description: req.description,
        isMounted,
        mountedPocket,
        existsInCatalog,
        isAssembled,
      };
    });

    const jobMachineName = latestJob.machineName === 'VF-2' ? 'S700xd1' : (latestJob.machineName || 'S700xd1');

    return NextResponse.json({
      activeJob: {
        ...latestJob,
        machineName: jobMachineName,
      },
      statusSummary: {
        ready: readyCount,
        missing: missingCount,
        total: requiredTools.length,
      },
      toolsDiff,
    });
  } catch (error: any) {
    console.error('Error in GET /api/fusion-tools:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch fusion status' }, { status: 500 });
  }
}

// POST: Receives CAM tool requirements payload from Fusion 360 script
export async function POST(req: Request) {
  try {
    // Check optional API secret if header present
    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key');
    const expectedSecret = process.env.FUSION_API_SECRET;
    if (expectedSecret && authHeader && authHeader !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized: Invalid Fusion API secret' }, { status: 401 });
    }

    const body = await req.json();
    const { machineName, requiredTools } = body;

    if (!machineName || !Array.isArray(requiredTools)) {
      return NextResponse.json(
        { error: 'Invalid payload format. Expected { machineName: string, requiredTools: Array<{ tnum, description }> }' },
        { status: 400 }
      );
    }

    // Normalize requiredTools
    const normalizedTools = requiredTools.map((t: any) => ({
      tnum: String(t.tnum || '').trim(),
      description: String(t.description || '').trim(),
    })).filter((t: any) => Boolean(t.tnum));

    const [savedJob] = await db
      .insert(fusionJobs)
      .values({
        machineName: String(machineName).trim(),
        requiredTools: normalizedTools,
        status: 'active',
      })
      .returning();

    return NextResponse.json({
      success: true,
      jobId: savedJob.id,
      receivedToolsCount: normalizedTools.length,
      receivedAt: savedJob.receivedAt,
    });
  } catch (error: any) {
    console.error('Error in POST /api/fusion-tools:', error);
    return NextResponse.json({ error: error.message || 'Failed to ingest Fusion tool sync' }, { status: 500 });
  }
}

