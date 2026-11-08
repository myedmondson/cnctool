'use client';

import React, { useState } from 'react';
import MagazineView from '@/components/MagazineView';
import FormView from '@/components/FormView';
import { Layers, FileEdit, Cpu, Database } from 'lucide-react';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'magazine' | 'form'>('magazine');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#eef0f3] text-[#1f2937]">
      {/* Top Application Header - Daytime Fusion 360 Precision CAD Bar */}
      <header className="h-12 border-b border-[#d8dce2] bg-[#ffffff] px-4 flex items-center justify-between shrink-0 select-none shadow-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-600 text-white rounded-sm shadow-xs">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-[#111827] flex items-center gap-2.5">
                CNC TOOL MANAGER
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-sm bg-[#f3f4f6] text-[#374151] border border-[#d1d5db]">
                  Brother Speedio S700xd1 • 21 Pockets
                </span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs - Daytime Fusion 360 Style */}
          <nav className="flex items-center gap-1.5 bg-[#f3f4f6] p-0.5 rounded-sm border border-[#d8dce2]">
            <button
              type="button"
              onClick={() => setActiveTab('magazine')}
              className={`flex items-center gap-2 px-3.5 py-1 rounded-sm text-xs font-bold transition-all ${
                activeTab === 'magazine'
                  ? 'bg-white text-[#111827] border border-[#cbd5e1] border-b-2 border-b-amber-600 shadow-xs'
                  : 'text-[#64748b] hover:text-[#111827] hover:bg-[#e9ecef]'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-600" />
              Magazine View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 px-3.5 py-1 rounded-sm text-xs font-bold transition-all ${
                activeTab === 'form'
                  ? 'bg-white text-[#111827] border border-[#cbd5e1] border-b-2 border-b-amber-600 shadow-xs'
                  : 'text-[#64748b] hover:text-[#111827] hover:bg-[#e9ecef]'
              }`}
            >
              <FileEdit className="w-4 h-4 text-amber-600" />
              Form View
            </button>
          </nav>
        </div>

        {/* Right Info Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#f8fafc] rounded-sm border border-[#e2e8f0] text-xs text-[#475569]">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">Supabase Cloud PostgreSQL</span>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'magazine' ? <MagazineView /> : <FormView />}
      </main>
    </div>
  );
}
