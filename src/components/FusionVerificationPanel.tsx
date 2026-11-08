'use client';

import React from 'react';
import useSWR from 'swr';
import { CheckCircle2, AlertCircle, RefreshCw, Cpu, Layers, Sparkles, AlertTriangle, Briefcase } from 'lucide-react';

interface ToolDiff {
  tnum: string;
  normalizedTnum: string;
  description: string;
  isMounted: boolean;
  mountedPocket: number | null;
  existsInCatalog: boolean;
  isAssembled: boolean;
}

interface FusionResponse {
  activeJob: {
    id: string;
    machineName: string;
    receivedAt: string;
  } | null;
  statusSummary: {
    ready: number;
    missing: number;
    total: number;
  };
  toolsDiff: ToolDiff[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Props {
  onOpenSimulator: () => void;
  magazineVersion?: number;
}

export default function FusionVerificationPanel({ onOpenSimulator, magazineVersion }: Props) {
  const { data, error, isValidating, mutate } = useSWR<FusionResponse>(
    '/api/fusion-tools',
    fetcher,
    {
      refreshInterval: 2000,
      revalidateOnFocus: true,
    }
  );

  React.useEffect(() => {
    mutate();
  }, [magazineVersion, mutate]);

  const activeJob = data?.activeJob;
  const summary = data?.statusSummary || { ready: 0, missing: 0, total: 0 };
  const diff = data?.toolsDiff || [];

  // Machine display name normalized to S700xd1
  const machineDisplayName = activeJob?.machineName && activeJob.machineName !== 'VF-2'
    ? activeJob.machineName
    : 'S700xd1';

  return (
    <div className="bg-white border border-[#d8dce2] rounded-sm shadow-xs flex flex-col h-full overflow-hidden select-none">
      {/* Panel Header */}
      <div className="p-2.5 bg-[#f8f9fa] border-b border-[#e2e5e9] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="p-1 bg-white text-amber-600 rounded-sm border border-[#d1d5db]">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#374151] flex items-center gap-1.5">
              Fusion 360 Sync
              <span className="inline-flex items-center px-1.5 py-0.2 rounded-sm text-[9px] font-mono font-bold bg-[#dcfce7] text-[#15803d] border border-[#86efac]">
                Live
              </span>
            </h3>
            <p className="text-[11px] text-[#64748b]">
              Machine: {machineDisplayName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => mutate()}
            disabled={isValidating}
            title="Refresh verification status"
            className="p-1 rounded-sm text-[#64748b] hover:text-[#111827] hover:bg-[#e2e8f0] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin text-amber-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onOpenSimulator}
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-sm transition-colors shadow-xs"
          >
            <Sparkles className="w-3 h-3" />
            Simulate
          </button>
        </div>
      </div>

      {/* Title Section for Job Name (Above CAM Tools / Ready / Missing) */}
      <div className="px-3 py-1.5 bg-[#f1f3f6] border-b border-[#e2e5e9] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Briefcase className="w-3.5 h-3.5 text-[#475569] shrink-0" />
          <span className="text-[10px] uppercase font-bold text-[#64748b]">Job:</span>
          <span className="text-xs font-bold text-[#111827] truncate">L-bracket Op1</span>
        </div>
        <span className="text-[10px] font-mono font-semibold text-[#475569] bg-white px-1.5 py-0.2 rounded-sm border border-[#cbd5e1]">
          Active
        </span>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-3 border-b border-[#e2e5e9] bg-[#f8fafc] p-2 text-center shrink-0">
        <div className="border-r border-[#e2e5e9]">
          <div className="text-[9px] uppercase tracking-wider text-[#64748b] font-bold">CAM Tools</div>
          <div className="text-base font-bold text-[#1e293b] font-mono mt-0.5">{summary.total}</div>
        </div>
        <div className="border-r border-[#e2e5e9]">
          <div className="text-[9px] uppercase tracking-wider text-[#15803d] font-bold">Ready</div>
          <div className="text-base font-bold text-[#15803d] font-mono mt-0.5">{summary.ready}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#b91c1c] font-bold">Missing</div>
          <div className="text-base font-bold text-[#b91c1c] font-mono mt-0.5">{summary.missing}</div>
        </div>
      </div>

      {/* Tools Diff List: Red Fill with Standard Text Color, Green Fill with Standard Text Color */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-[#f8fafc]">
        {error ? (
          <div className="p-3 bg-[#fee2e2] border border-[#fca5a5] rounded-sm text-[#991b1b] text-xs text-center font-medium">
            Database connection error.
          </div>
        ) : !activeJob || diff.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#64748b] space-y-2.5">
            <Layers className="w-7 h-7 text-[#94a3b8]" />
            <div>
              <p className="text-xs md:text-sm font-bold text-[#334155]">No active CAM post received</p>
              <p className="text-xs text-[#64748b] mt-0.5 max-w-[200px]">
                Post from Autodesk Fusion 360 or click "Simulate" to test CAM verification.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenSimulator}
              className="text-xs px-2.5 py-1 bg-white hover:bg-[#f1f5f9] text-amber-700 font-bold rounded-sm border border-[#cbd5e1] shadow-xs transition-colors"
            >
              Open Simulator
            </button>
          </div>
        ) : (
          diff.map((item, idx) => {
            const isReady = item.isMounted;
            return (
              <div
                key={`${item.tnum}-${idx}`}
                className={`p-2.5 rounded-sm border transition-all ${
                  isReady
                    ? 'bg-[#dcfce7] border-[#86efac]' // Green fill with standard text
                    : 'bg-[#fee2e2] border-[#fca5a5]' // Red fill with standard text
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isReady ? (
                      <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[#991b1b] shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs md:text-sm text-[#111827]">
                          T{item.tnum}
                        </span>
                        <span className="text-xs md:text-sm font-semibold text-[#111827] truncate max-w-[130px]">
                          {item.description || 'Tool'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold font-mono px-1.5 py-0.2 rounded-sm shrink-0 ${
                      isReady
                        ? 'bg-white text-[#111827] border border-[#86efac]'
                        : 'bg-white text-[#111827] border border-[#fca5a5]'
                    }`}
                  >
                    {isReady ? `P${item.mountedPocket}` : 'MISSING'}
                  </span>
                </div>

                {/* Sub details with standard text color */}
                <div className="mt-1 pl-5 text-xs text-[#1f2937] font-medium">
                  {isReady ? (
                    <span>Mounted in carousel (Pocket {item.mountedPocket})</span>
                  ) : !item.existsInCatalog ? (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-[#b91c1c]" /> Not in tool catalog!
                    </span>
                  ) : item.isAssembled ? (
                    <span>Assembled in rack - Needs slotting</span>
                  ) : (
                    <span>Unassembled - Needs physical build</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      {activeJob && (
        <div className="px-3 py-1.5 bg-[#f8f9fa] border-t border-[#e2e5e9] text-[11px] font-medium text-[#64748b] flex items-center justify-between shrink-0">
          <span>Synced: {new Date(activeJob.receivedAt).toLocaleTimeString()}</span>
          <span className="font-mono">POST /api/fusion-tools</span>
        </div>
      )}
    </div>
  );
}
