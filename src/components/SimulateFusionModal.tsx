'use client';

import React, { useState } from 'react';
import { Play, Download, X, CheckCircle, AlertTriangle, Send } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSent: () => void;
}

const PRESETS = [
  {
    name: 'Standard Speedio Setup (All Matched)',
    machine: 'Brother Speedio S700xd1',
    tools: [
      { tnum: '1', description: '½ Rougher Mari (Rough - Large)' },
      { tnum: '2', description: 'Downcut Top Hat' },
      { tnum: '5', description: '¼ (HSAM2) Rough - Small' },
      { tnum: '12', description: '6.7mm drill' },
      { tnum: '207', description: '5/16 ThreadMill TiAln' },
    ],
  },
  {
    name: 'Production CAM Job (Has Missing Tools)',
    machine: 'Brother Speedio S700xd1',
    tools: [
      { tnum: '1', description: '½ Rougher Mari' },
      { tnum: '6', description: '5mm sq (Rough - Small)' },
      { tnum: '108', description: '0.250 Chamfer Mill (MISSING IN MAGAZINE)' },
      { tnum: '276', description: 'Lolipop 3/8 Haas' },
      { tnum: '999', description: 'Custom Boring Bar (NOT IN CATALOG)' },
    ],
  },
  {
    name: 'Drill & Tap Operations',
    machine: 'Brother Speedio S700xd1',
    tools: [
      { tnum: '11', description: '¼ spot drill' },
      { tnum: '12', description: '6.7mm drill' },
      { tnum: '250', description: '2.5mm jobber drill' },
      { tnum: '265', description: 'M3x.5 Spiral Flute Tap' },
    ],
  },
];

export default function SimulateFusionModal({ isOpen, onClose, onSent }: Props) {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customJson, setCustomJson] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const currentPayload = isCustom
    ? customJson
    : JSON.stringify(
        {
          machineName: PRESETS[selectedPreset].machine,
          requiredTools: PRESETS[selectedPreset].tools,
        },
        null,
        2
      );

  const handleSend = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      let payload;
      if (isCustom) {
        payload = JSON.parse(customJson);
      } else {
        payload = {
          machineName: PRESETS[selectedPreset].machine,
          requiredTools: PRESETS[selectedPreset].tools,
        };
      }

      const res = await fetch('/api/fusion-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'internal-api-key-for-fusion-script',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');

      setStatusMessage({ text: `Pushed ${payload.requiredTools?.length || 0} tools to Brother Speedio S700xd1!`, type: 'success' });
      onSent();
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 1500);
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error sending payload', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/fusion-tools/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineName: 'Brother Speedio S700xd1' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const blob = new Blob([JSON.stringify(data.exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Speedio_S700xd1_ToolLibrary_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#cbd5e1] rounded-sm shadow-xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden text-[#1e293b]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-100 text-amber-800 rounded-sm border border-amber-300">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1e293b]">Autodesk Fusion 360 Simulator</h2>
              <p className="text-[10px] text-[#64748b]">Post CAM Tools to Brother Speedio S700xd1 & Export Library</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-sm text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 bg-[#ffffff]">
          {/* Preset Buttons */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1.5">
              Choose CAM Operation Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(idx);
                    setIsCustom(false);
                  }}
                  className={`p-2 text-left rounded-sm border text-xs transition-all ${
                    !isCustom && selectedPreset === idx
                      ? 'border-amber-500 bg-[#fffbeb] text-amber-950 font-semibold shadow-xs'
                      : 'border-[#cbd5e1] bg-[#f8fafc] text-[#334155] hover:border-[#94a3b8]'
                  }`}
                >
                  <div className="font-semibold text-[11px] truncate">{p.name}</div>
                  <div className="text-[10px] text-[#64748b] mt-0.5">{p.tools.length} Tools</div>
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Custom JSON */}
          <div className="flex items-center justify-between text-[11px] text-[#64748b]">
            <span>Payload Preview</span>
            <button
              type="button"
              onClick={() => {
                if (!isCustom) {
                  setCustomJson(currentPayload);
                }
                setIsCustom(!isCustom);
              }}
              className="text-amber-700 font-semibold hover:underline"
            >
              {isCustom ? 'Switch to Preset View' : 'Edit JSON directly'}
            </button>
          </div>

          {/* JSON Display / Editor */}
          {isCustom ? (
            <textarea
              value={customJson}
              onChange={(e) => setCustomJson(e.target.value)}
              rows={7}
              className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-sm p-2.5 font-mono text-[11px] text-[#0f172a] focus:outline-none focus:border-amber-600 resize-none"
            />
          ) : (
            <pre className="bg-[#f8fafc] border border-[#cbd5e1] rounded-sm p-2.5 font-mono text-[11px] text-[#0f172a] overflow-x-auto max-h-48">
              {currentPayload}
            </pre>
          )}

          {statusMessage && (
            <div
              className={`p-2.5 rounded-sm text-xs flex items-center gap-2 border ${
                statusMessage.type === 'success'
                  ? 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]'
                  : 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              {statusMessage.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#e2e8f0] bg-[#f8fafc]">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#1e293b] bg-white hover:bg-[#f1f5f9] rounded-sm border border-[#cbd5e1] shadow-xs transition-colors"
            title="Download active pocket allocations in Fusion Tool Library format"
          >
            <Download className="w-3.5 h-3.5 text-[#15803d]" />
            Export Pockets to Fusion (.json)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-xs text-[#64748b] hover:text-[#0f172a]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-sm shadow-xs disabled:opacity-50 transition-colors"
            >
              <Send className="w-3 h-3" />
              {isSubmitting ? 'Posting...' : 'Post to Web App'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
