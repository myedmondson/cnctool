'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Search,
  XCircle,
  Wrench,
  Layers,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import FusionVerificationPanel from './FusionVerificationPanel';
import SimulateFusionModal from './SimulateFusionModal';

interface Tool {
  id: string;
  tnum: string;
  description: string | null;
  shankIn: string | null;
  shankM: string | null;
  cutDia: string | null;
  loc: string | null;
  type: string | null;
  part: string | null;
  series: string | null;
  coating: string | null;
  hsm: string | null;
  radius: string | null;
  isAssembled: boolean;
  isOutOfStock: boolean;
  holder: string | null;
  collet: string | null;
  currentPocket: number | null;
}

interface Pocket {
  id: string;
  pocketNumber: number;
  toolId: string | null;
  tool: Tool | null;
}

interface MagazineResponse {
  magazine: {
    id: string;
    machineName: string;
    totalPockets: number;
  };
  pockets: Pocket[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MagazineView() {
  const { data: toolsData, mutate: mutateTools } = useSWR<Tool[]>('/api/tools', fetcher);
  const { data: magData, mutate: mutateMagazine } = useSWR<MagazineResponse>('/api/magazine', fetcher);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [onlyAssembled, setOnlyAssembled] = useState(false);
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [sortBy, setSortBy] = useState<'tnum' | 'dia' | 'loc'>('tnum');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [dragOverPocket, setDragOverPocket] = useState<number | null>(null);
  const [magazineVersion, setMagazineVersion] = useState(0);

  const tools = toolsData || [];
  const pockets = magData?.pockets || [];
  const machineName = 'S700xd1';

  const toolTypes = Array.from(new Set(tools.map((t) => t.type).filter(Boolean))) as string[];

  // Filter and Sort Tools for the Left Column
  const filteredAndSortedTools = tools
    .filter((t) => {
      if (onlyAssembled && !t.isAssembled) return false;
      if (onlyUnassigned && t.currentPocket !== null) return false;
      if (selectedType !== 'ALL' && t.type !== selectedType) return false;

      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchTnum = t.tnum.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q) || false;
        const matchPart = t.part?.toLowerCase().includes(q) || false;
        const matchSeries = t.series?.toLowerCase().includes(q) || false;
        return matchTnum || matchDesc || matchPart || matchSeries;
      }
      return true;
    })
    .sort((a, b) => {
      let result = 0;
      if (sortBy === 'tnum') {
        const numA = parseInt(a.tnum, 10);
        const numB = parseInt(b.tnum, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          result = numA - numB;
        } else {
          result = a.tnum.localeCompare(b.tnum);
        }
      } else if (sortBy === 'dia') {
        const diaA = parseFloat(a.cutDia || '0') || 0;
        const diaB = parseFloat(b.cutDia || '0') || 0;
        result = diaA - diaB;
      } else if (sortBy === 'loc') {
        const locA = parseFloat(a.loc || '0') || 0;
        const locB = parseFloat(b.loc || '0') || 0;
        result = locA - locB;
      }
      return sortOrder === 'asc' ? result : -result;
    });

  const toggleSort = (field: 'tnum' | 'dia' | 'loc') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Drag and Drop handlers
  const handleDragStartTool = (e: React.DragEvent, toolId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'catalog-tool', toolId }));
  };

  const handleDragStartPocket = (e: React.DragEvent, fromPocket: number) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'pocket-swap', fromPocket }));
  };

  const handleDragOver = (e: React.DragEvent, pocketNumber: number) => {
    e.preventDefault();
    if (dragOverPocket !== pocketNumber) {
      setDragOverPocket(pocketNumber);
    }
  };

  const handleDragLeave = (pocketNumber: number) => {
    if (dragOverPocket === pocketNumber) {
      setDragOverPocket(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetPocket: number) => {
    e.preventDefault();
    setDragOverPocket(null);

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const payload = JSON.parse(raw);

      if (payload.type === 'catalog-tool') {
        const toolId = payload.toolId;
        const res = await fetch('/api/magazine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'assign', pocketNumber: targetPocket, toolId }),
        });
        if (res.ok) {
          mutateMagazine();
          mutateTools();
          setMagazineVersion((v) => v + 1);
        }
      } else if (payload.type === 'pocket-swap') {
        const fromPocket = payload.fromPocket;
        if (fromPocket === targetPocket) return;

        const res = await fetch('/api/magazine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'swap', fromPocket, toPocket: targetPocket }),
        });
        if (res.ok) {
          mutateMagazine();
          mutateTools();
          setMagazineVersion((v) => v + 1);
        }
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const handleUnassignPocket = async (pocketNumber: number) => {
    const res = await fetch('/api/magazine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unassign', pocketNumber }),
    });
    if (res.ok) {
      mutateMagazine();
      mutateTools();
      setMagazineVersion((v) => v + 1);
    }
  };

  const handleToggleAssy = async (tool: Tool) => {
    const nextStatus = !tool.isAssembled;
    const confirmMsg = `Are you sure you want to mark Tool T${tool.tnum} as ${nextStatus ? 'ASSEMBLED' : 'UNASSEMBLED'}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/tools/${tool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tool,
          isAssembled: nextStatus,
        }),
      });
      if (res.ok) {
        mutateTools();
        mutateMagazine();
        setMagazineVersion((v) => v + 1);
      }
    } catch (err) {
      console.error('Error toggling assembly status:', err);
    }
  };

  // Divide 21 pockets into 2 columns for column-first ordering
  // Column 1: Pockets 1 to 11
  // Column 2: Pockets 12 to 21
  const midPoint = Math.ceil(pockets.length / 2);
  const col1Pockets = pockets.slice(0, midPoint);
  const col2Pockets = pockets.slice(midPoint);

  const renderPocketCard = (pocket: Pocket) => {
    const isOver = dragOverPocket === pocket.pocketNumber;
    const tool = pocket.tool;

    return (
      <div
        key={pocket.id}
        onDragOver={(e) => handleDragOver(e, pocket.pocketNumber)}
        onDragLeave={() => handleDragLeave(pocket.pocketNumber)}
        onDrop={(e) => handleDrop(e, pocket.pocketNumber)}
        draggable={Boolean(tool)}
        onDragStart={(e) => handleDragStartPocket(e, pocket.pocketNumber)}
        className={`rounded-sm border px-3 py-2 flex flex-col justify-between min-h-[64px] transition-all select-none relative ${
          isOver
            ? 'border-amber-600 bg-[#fffbeb] shadow-xs ring-1 ring-amber-500'
            : tool
            ? 'bg-white border-[#cbd5e1] hover:border-[#94a3b8] cursor-grab active:cursor-grabbing shadow-xs'
            : 'bg-[#f8fafc] border-dashed border-[#cbd5e1] hover:border-[#94a3b8]'
        }`}
      >
        {/* Top Row: Pocket # (larger), Tnum (smaller), Dimensions, and X in upper-right */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {/* Pocket Indicator: P1, P2, etc. (larger font) */}
            <span className="font-mono text-sm md:text-base font-extrabold text-[#1e293b]">
              P{pocket.pocketNumber}
            </span>

            {/* Tool Tnum: slightly smaller text */}
            {tool && (
              <span className="font-mono text-[11px] font-bold text-[#92400e] bg-[#fef3c7] px-1.5 py-0.2 rounded-sm border border-[#fde68a]">
                T{tool.tnum}
              </span>
            )}

            {/* Geometry info */}
            {tool && (
              <div className="text-xs font-mono text-[#64748b] flex items-center gap-2">
                {tool.cutDia && <span>Ø{tool.cutDia}"</span>}
                {tool.loc && <span>L{tool.loc}"</span>}
              </div>
            )}
          </div>

          {/* Upper Right: "X" button */}
          {tool ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleUnassignPocket(pocket.pocketNumber);
              }}
              className="text-[#94a3b8] hover:text-[#991b1b] p-0.5 rounded-sm hover:bg-[#fee2e2] transition-colors"
              title="Unseat tool from pocket"
            >
              <XCircle className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[10px] text-[#94a3b8] italic">Drop tool</span>
          )}
        </div>

        {/* Bottom Row: Tool Title (not bold) spanning across the bottom */}
        <div className="w-full pt-0.5 border-t border-[#f1f5f9]">
          {tool ? (
            <div
              className="text-xs md:text-sm font-normal text-[#374151] truncate leading-tight w-full"
              title={tool.description || ''}
            >
              {tool.description || `Tool ${tool.tnum}`}
            </div>
          ) : (
            <div className="text-xs font-mono font-medium text-[#94a3b8] italic">
              EMPTY POCKET
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex overflow-hidden p-2.5 gap-2.5 bg-[#eef0f3] text-[#1f2937] select-none">
      {/* LEFT COLUMN: Available Tools Area (Narrower, Tnum Narrower, Tabular) */}
      <div className="w-[440px] 2xl:w-[470px] shrink-0 bg-white border border-[#d8dce2] rounded-sm flex flex-col h-full overflow-hidden shadow-xs">
        {/* Header & Controls Bar */}
        <div className="p-2.5 bg-[#f8f9fa] border-b border-[#e2e5e9] space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-wider text-[#374151]">
              <Wrench className="w-4 h-4 text-amber-600" />
              <span>Available Tools</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#475569] bg-[#edf0f3] px-2 py-0.5 rounded-sm border border-[#d1d5db]">
              {filteredAndSortedTools.length} / {tools.length}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search by TNUM, desc, part..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-[#cbd5e1] rounded-sm pl-7 pr-2 py-1 text-xs text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Filters & Sort Controls */}
          <div className="flex items-center justify-between gap-1 text-xs">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-white border border-[#cbd5e1] rounded-sm px-1.5 py-1 text-xs font-medium text-[#334155] focus:outline-none focus:border-amber-600 max-w-[110px] truncate"
              >
                <option value="ALL">All Types</option>
                {toolTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setOnlyAssembled(!onlyAssembled)}
                className={`px-2 py-1 rounded-sm text-xs font-bold border transition-colors ${
                  onlyAssembled
                    ? 'bg-[#e2f1e6] text-[#1b5e20] border-[#a3d9b0]'
                    : 'bg-white text-[#64748b] border-[#cbd5e1] hover:text-[#111827]'
                }`}
                title="Filter to assembled tools only"
              >
                Assy
              </button>

              <button
                type="button"
                onClick={() => setOnlyUnassigned(!onlyUnassigned)}
                className={`px-2 py-1 rounded-sm text-xs font-bold border transition-colors ${
                  onlyUnassigned
                    ? 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]'
                    : 'bg-white text-[#64748b] border-[#cbd5e1] hover:text-[#111827]'
                }`}
                title="Show tools not loaded into carousel"
              >
                Unseated
              </button>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-1 shrink-0 text-[#64748b]">
              <span className="text-[10px] uppercase font-bold text-[#94a3b8]">Sort:</span>
              <button
                type="button"
                onClick={() => toggleSort('tnum')}
                className={`px-1.5 py-0.5 rounded-sm border text-[11px] font-bold flex items-center gap-0.5 ${
                  sortBy === 'tnum'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white text-[#475569] border-[#cbd5e1]'
                }`}
              >
                TNUM {sortBy === 'tnum' && (sortOrder === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />)}
              </button>

              <button
                type="button"
                onClick={() => toggleSort('dia')}
                className={`px-1.5 py-0.5 rounded-sm border text-[11px] font-bold flex items-center gap-0.5 ${
                  sortBy === 'dia'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white text-[#475569] border-[#cbd5e1]'
                }`}
              >
                Dia {sortBy === 'dia' && (sortOrder === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />)}
              </button>

              <button
                type="button"
                onClick={() => toggleSort('loc')}
                className={`px-1.5 py-0.5 rounded-sm border text-[11px] font-bold flex items-center gap-0.5 ${
                  sortBy === 'loc'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white text-[#475569] border-[#cbd5e1]'
                }`}
              >
                LOC {sortBy === 'loc' && (sortOrder === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />)}
              </button>
            </div>
          </div>
        </div>

        {/* Column Headers: TNUM narrower */}
        <div className="flex items-center px-2.5 py-1.5 bg-[#edf0f4] border-b border-[#d8dce2] text-[10px] font-bold uppercase tracking-wider text-[#475569] shrink-0">
          <div className="w-12 shrink-0 cursor-pointer hover:text-amber-800" onClick={() => toggleSort('tnum')}>
            TNUM
          </div>
          <div className="flex-1 min-w-0 pr-2">Description</div>
          <div className="w-14 text-right shrink-0 cursor-pointer hover:text-amber-800" onClick={() => toggleSort('dia')}>
            Dia
          </div>
          <div className="w-14 text-right shrink-0 cursor-pointer hover:text-amber-800" onClick={() => toggleSort('loc')}>
            LOC
          </div>
          <div className="w-14 text-center shrink-0">Status</div>
        </div>

        {/* Scrollable Columnar Rows List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#e9ecef] bg-white">
          {filteredAndSortedTools.length === 0 ? (
            <div className="text-center py-16 text-xs text-[#9ca3af]">
              No tools matching filter criteria.
            </div>
          ) : (
            filteredAndSortedTools.map((tool) => (
              <div
                key={tool.id}
                draggable={true}
                onDragStart={(e) => handleDragStartTool(e, tool.id)}
                className={`flex items-center px-2.5 py-1.5 text-xs transition-colors cursor-grab active:cursor-grabbing select-none group ${
                  tool.currentPocket !== null
                    ? 'bg-[#f8fafc] text-[#334155] hover:bg-[#f1f5f9]'
                    : 'bg-white text-[#1e293b] hover:bg-[#fffbeb] hover:border-l-2 hover:border-l-amber-500'
                }`}
              >
                {/* TNUM (narrower) */}
                <div className="w-12 shrink-0">
                  <span className="font-mono font-bold text-[11px] px-1.5 py-0.2 rounded-sm bg-[#f1f5f9] text-[#1e293b] border border-[#cbd5e1]">
                    T{tool.tnum}
                  </span>
                </div>

                {/* Description (takes remaining width) */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-xs font-semibold text-[#111827] truncate leading-tight" title={tool.description || ''}>
                    {tool.description || `Tool ${tool.tnum}`}
                  </div>
                  <div className="text-[10px] text-[#64748b] truncate capitalize">
                    {tool.type || 'tool'} {tool.part ? `• ${tool.part}` : ''}
                  </div>
                </div>

                {/* Diameter */}
                <div className="w-14 text-right font-mono text-xs font-semibold text-[#334155] shrink-0">
                  {tool.cutDia ? `${tool.cutDia}"` : '—'}
                </div>

                {/* LOC */}
                <div className="w-14 text-right font-mono text-xs font-semibold text-[#334155] shrink-0">
                  {tool.loc ? `${tool.loc}"` : '—'}
                </div>

                {/* Status Column: Pocket # if seated, otherwise "assy" grey or green */}
                <div className="w-14 flex items-center justify-center shrink-0">
                  {tool.currentPocket !== null ? (
                    <span className="font-mono text-xs font-bold text-[#1e3a8a] bg-[#e0e7ff] px-1.5 py-0.2 rounded-sm border border-[#c7d2fe]">
                      P{tool.currentPocket}
                    </span>
                  ) : tool.isAssembled ? (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleToggleAssy(tool);
                      }}
                      title="Double-click to toggle assembly status"
                      className="text-[10px] font-bold uppercase text-[#166534] bg-[#dcfce7] px-1.5 py-0.2 rounded-sm border border-[#bbf7d0] cursor-pointer hover:ring-1 hover:ring-emerald-500 transition-all select-none"
                    >
                      assy
                    </span>
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleToggleAssy(tool);
                      }}
                      title="Double-click to toggle assembly status"
                      className="text-[10px] font-bold uppercase text-[#94a3b8] bg-[#f1f5f9] px-1.5 py-0.2 rounded-sm border border-[#cbd5e1] cursor-pointer hover:ring-1 hover:ring-amber-500 transition-all select-none"
                    >
                      assy
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CENTER COLUMN: Machine Pocket Layout (Pockets ordered by COLUMN) */}
      <div className="flex-1 bg-white border border-[#d8dce2] rounded-sm flex flex-col h-full overflow-hidden shadow-xs">
        {/* Header Bar */}
        <div className="p-2.5 bg-[#f8f9fa] border-b border-[#e2e5e9] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600" />
            <div>
              <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-[#374151]">
                {machineName} Carousel (Pockets 1–21)
              </h3>
              <p className="text-xs text-[#6b7280]">
                Ordered by column (P1–P11 Left • P12–P21 Right)
              </p>
            </div>
          </div>
        </div>

        {/* Pocket Grid: Two Columns ordered by COLUMN (Col 1: P1-11, Col 2: P12-21) */}
        <div className="p-3 bg-[#f8fafc] overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {/* Column 1: Pockets 1 through 11 */}
            <div className="space-y-2">
              {col1Pockets.map(renderPocketCard)}
            </div>

            {/* Column 2: Pockets 12 through 21 */}
            <div className="space-y-2">
              {col2Pockets.map(renderPocketCard)}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Fusion 360 Verification Panel (Narrower) */}
      <div className="w-[280px] 2xl:w-[300px] shrink-0 h-full overflow-hidden">
        <FusionVerificationPanel
          onOpenSimulator={() => setIsSimulatorOpen(true)}
          magazineVersion={magazineVersion}
        />
      </div>

      {/* Simulator Modal */}
      <SimulateFusionModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSent={() => {
          mutateTools();
          mutateMagazine();
          setMagazineVersion((v) => v + 1);
        }}
      />
    </div>
  );
}
