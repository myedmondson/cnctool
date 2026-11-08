'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  PlusCircle,
  Save,
  RotateCcw,
  Wrench,
  DollarSign,
  PackageCheck,
  Tag,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';

interface ToolType {
  id: string;
  name: string;
}

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function FormView() {
  const { data: toolsData, mutate: mutateTools } = useSWR<Tool[]>('/api/tools', fetcher);
  const { data: toolTypesData, mutate: mutateTypes } = useSWR<ToolType[]>('/api/tool-types', fetcher);

  const tools = toolsData || [];
  const types = toolTypesData || [];

  // Form State
  const [editingToolId, setEditingToolId] = useState<string | null>(null);
  const [tnum, setTnum] = useState('');
  const [description, setDescription] = useState('');
  const [shankIn, setShankIn] = useState('');
  const [shankM, setShankM] = useState('');
  const [cutDia, setCutDia] = useState('');
  const [loc, setLoc] = useState('');
  const [radius, setRadius] = useState('');
  const [type, setType] = useState('endmill');
  const [part, setPart] = useState('');
  const [series, setSeries] = useState('');
  const [coating, setCoating] = useState('');
  const [hsm, setHsm] = useState('');
  const [isAssembled, setIsAssembled] = useState(false);
  const [isOutOfStock, setIsOutOfStock] = useState(false);

  // Advanced fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [holder, setHolder] = useState('');
  const [collet, setCollet] = useState('');

  // Purchase receiving section
  const [logPurchase, setLogPurchase] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');
  const [vendor, setVendor] = useState('');
  const [poNumber, setPoNumber] = useState('');

  // New Tool Type inline modal
  const [showNewTypeInput, setShowNewTypeInput] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Feedback banner
  const [banner, setBanner] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Catalog search & filter
  const [catalogSearch, setCatalogSearch] = useState('');

  // Auto Metric <-> Inch Sync
  const handleShankInChange = (val: string) => {
    setShankIn(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setShankM((num * 25.4).toFixed(4));
    } else if (!val) {
      setShankM('');
    }
  };

  const handleShankMChange = (val: string) => {
    setShankM(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setShankIn((num / 25.4).toFixed(4));
    } else if (!val) {
      setShankIn('');
    }
  };

  const resetForm = () => {
    setEditingToolId(null);
    setTnum('');
    setDescription('');
    setShankIn('');
    setShankM('');
    setCutDia('');
    setLoc('');
    setRadius('');
    setType(types[0]?.name || 'endmill');
    setPart('');
    setSeries('');
    setCoating('');
    setHsm('');
    setIsAssembled(false);
    setIsOutOfStock(false);
    setHolder('');
    setCollet('');
    setLogPurchase(false);
    setQuantity('1');
    setPrice('');
    setVendor('');
    setPoNumber('');
    setBanner(null);
  };

  const handleEditTool = (tool: Tool) => {
    setEditingToolId(tool.id);
    setTnum(tool.tnum);
    setDescription(tool.description || '');
    setShankIn(tool.shankIn || '');
    setShankM(tool.shankM || '');
    setCutDia(tool.cutDia || '');
    setLoc(tool.loc || '');
    setRadius(tool.radius || '');
    setType(tool.type || 'endmill');
    setPart(tool.part || '');
    setSeries(tool.series || '');
    setCoating(tool.coating || '');
    setHsm(tool.hsm || '');
    setIsAssembled(tool.isAssembled);
    setIsOutOfStock(tool.isOutOfStock);
    setHolder(tool.holder || '');
    setCollet(tool.collet || '');
    setLogPurchase(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTool = async (id: string, toolNum: string) => {
    if (!confirm(`Are you sure you want to delete Tool T${toolNum}?`)) return;

    try {
      const res = await fetch(`/api/tools/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete tool');
      mutateTools();
      if (editingToolId === id) resetForm();
      setBanner({ message: `Tool T${toolNum} deleted.`, type: 'success' });
    } catch (err: any) {
      setBanner({ message: err.message, type: 'error' });
    }
  };

  const handleAddToolType = async () => {
    if (!newTypeName.trim()) return;
    try {
      const res = await fetch('/api/tool-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await mutateTypes();
      setType(data.name);
      setNewTypeName('');
      setShowNewTypeInput(false);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setBanner(null);

    try {
      const payload: any = {
        tnum: tnum.trim(),
        description: description.trim(),
        shankIn: shankIn || null,
        shankM: shankM || null,
        cutDia: cutDia || null,
        loc: loc || null,
        radius: radius || null,
        type,
        part: part.trim() || null,
        series: series.trim() || null,
        coating: coating.trim() || null,
        hsm: hsm || null,
        isAssembled,
        isOutOfStock,
        holder: holder.trim() || null,
        collet: collet.trim() || null,
      };

      if (!editingToolId && logPurchase) {
        payload.purchaseQuantity = quantity;
        payload.purchasePrice = price;
        payload.purchaseVendor = vendor;
        payload.purchasePo = poNumber;
      }

      const url = editingToolId ? `/api/tools/${editingToolId}` : '/api/tools';
      const method = editingToolId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBanner({
        message: editingToolId
          ? `Tool T${payload.tnum} updated successfully!`
          : `Tool T${payload.tnum} added to catalog!`,
        type: 'success',
      });

      mutateTools();
      if (!editingToolId) resetForm();
    } catch (err: any) {
      setBanner({ message: err.message || 'Operation failed', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCatalog = tools.filter((t) => {
    if (!catalogSearch) return true;
    const q = catalogSearch.toLowerCase();
    return (
      t.tnum.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.part?.toLowerCase().includes(q) ||
      t.type?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#eef0f3] text-[#1f2937] p-4 space-y-5 select-none">
      {/* View Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between border-b border-[#d8dce2] pb-2.5">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-[#111827]">
            <Wrench className="w-4 h-4 text-amber-600" />
            {editingToolId ? `Edit Tool Specification (T${tnum})` : 'Tool Specification & Inventory Receiving'}
          </h2>
          <p className="text-[11px] text-[#64748b] mt-0.5">
            Geometric parameters, catalog attributes, and restock purchase audit entries
          </p>
        </div>

        {editingToolId && (
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-[#334155] bg-white hover:bg-[#f1f5f9] rounded-sm border border-[#cbd5e1] shadow-xs"
          >
            <RotateCcw className="w-3 h-3" />
            Cancel Edit & New Tool
          </button>
        )}
      </div>

      {banner && (
        <div
          className={`max-w-6xl mx-auto p-3 rounded-sm text-xs flex items-center gap-2 border ${
            banner.type === 'success'
              ? 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]'
              : 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{banner.message}</span>
        </div>
      )}

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Panel 1: Primary Dimensions */}
          <div className="bg-white border border-[#d8dce2] rounded-sm p-4 space-y-3 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#374151] flex items-center gap-1.5 border-b border-[#e2e5e9] pb-2">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              Tool Identity & Geometry
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Tool Number (TNUM) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101"
                  value={tnum}
                  onChange={(e) => setTnum(e.target.value)}
                  disabled={Boolean(editingToolId)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-sm px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-amber-600 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Tool Type *
                </label>
                <div className="flex gap-1">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="flex-1 bg-white border border-[#cbd5e1] rounded-sm px-2 py-1.5 text-xs text-[#334155] focus:outline-none focus:border-amber-600"
                  >
                    {types.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewTypeInput(!showNewTypeInput)}
                    className="p-1.5 bg-[#f8fafc] hover:bg-[#e2e8f0] text-amber-700 rounded-sm border border-[#cbd5e1]"
                    title="Add custom tool type"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {showNewTypeInput && (
              <div className="flex gap-1.5 p-1.5 bg-[#fffbeb] rounded-sm border border-amber-300">
                <input
                  type="text"
                  placeholder="New type name..."
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  className="flex-1 bg-white border border-[#cbd5e1] rounded-sm px-2 py-1 text-xs text-[#0f172a] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddToolType}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-sm text-xs font-semibold"
                >
                  Save Type
                </button>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                Description / Title
              </label>
              <input
                type="text"
                placeholder="e.g. 0.500 Flat Endmill 3FL"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-amber-600"
              />
            </div>

            {/* Geometric Parameters with Metric/Inch Auto Sync */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Cut Diameter (in)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="0.5000"
                  value={cutDia}
                  onChange={(e) => setCutDia(e.target.value)}
                  className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Length of Cut - LOC (in)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="1.2500"
                  value={loc}
                  onChange={(e) => setLoc(e.target.value)}
                  className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Shank Dia (in)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="0.5000"
                  value={shankIn}
                  onChange={(e) => handleShankInChange(e.target.value)}
                  className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Shank Dia (mm)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="12.7000"
                  value={shankM}
                  onChange={(e) => handleShankMChange(e.target.value)}
                  className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                  Corner Radius (in)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  placeholder="0.0150 (Leave blank for square)"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>
          </div>

          {/* Panel 2: Catalog Attributes */}
          <div className="bg-white border border-[#d8dce2] rounded-sm p-4 space-y-3 shadow-xs flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#374151] flex items-center gap-1.5 border-b border-[#e2e5e9] pb-2">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Catalog Specifications & Setup State
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Part Number / SKU
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 03-0085"
                    value={part}
                    onChange={(e) => setPart(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Tool Series
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HSAM1, HARV"
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    Coating
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AlTiN, ZrN"
                    value={coating}
                    onChange={(e) => setCoating(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                    HSM Flag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. True / y / None"
                    value={hsm}
                    onChange={(e) => setHsm(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1.5 text-xs text-[#0f172a] focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              {/* Status Toggles */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <label className="flex items-center gap-2 p-2 bg-[#f8fafc] rounded-sm border border-[#e2e8f0] cursor-pointer hover:border-[#cbd5e1]">
                  <input
                    type="checkbox"
                    checked={isAssembled}
                    onChange={(e) => setIsAssembled(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm text-amber-600 bg-white border-[#cbd5e1]"
                  />
                  <div>
                    <div className="text-[11px] font-bold text-[#1e293b]">Assembled in Holder</div>
                    <div className="text-[9px] text-[#64748b]">Ready for carousel loading</div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2 bg-[#f8fafc] rounded-sm border border-[#e2e8f0] cursor-pointer hover:border-[#cbd5e1]">
                  <input
                    type="checkbox"
                    checked={isOutOfStock}
                    onChange={(e) => setIsOutOfStock(e.target.checked)}
                    className="w-3.5 h-3.5 rounded-sm text-[#b91c1c] bg-white border-[#cbd5e1]"
                  />
                  <div>
                    <div className="text-[11px] font-bold text-[#991b1b]">Out of Stock</div>
                    <div className="text-[9px] text-[#64748b]">Inventory depleted</div>
                  </div>
                </label>
              </div>

              {/* Advanced Specs */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-1 text-[11px] text-[#64748b] hover:text-[#0f172a] py-0.5"
                >
                  {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showAdvanced ? 'Hide Holder / Collet Specs' : 'Show Advanced Tool Assembly Fields (Collet/Holder)'}
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#f8fafc] rounded-sm border border-[#e2e8f0] mt-1.5">
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                        Holder
                      </label>
                      <input
                        type="text"
                        placeholder="ER32, ER25, Shrink"
                        value={holder}
                        onChange={(e) => setHolder(e.target.value)}
                        className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2 py-1 text-xs text-[#0f172a] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-[#475569] mb-1">
                        Collet
                      </label>
                      <input
                        type="text"
                        placeholder="6mm, 1/4, 5/16"
                        value={collet}
                        onChange={(e) => setCollet(e.target.value)}
                        className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2 py-1 text-xs text-[#0f172a] focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Receiving Section */}
        {!editingToolId && (
          <div className="bg-white border border-[#d8dce2] rounded-sm p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e2e5e9] pb-2">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#374151]">
                  Receive Inventory / Restock Log (Purchases Table)
                </h3>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-[#475569] cursor-pointer">
                <input
                  type="checkbox"
                  checked={logPurchase}
                  onChange={(e) => setLogPurchase(e.target.checked)}
                  className="rounded-sm text-amber-600 bg-white border-[#cbd5e1]"
                />
                Log receiving event now
              </label>
            </div>

            {logPurchase && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1 text-xs text-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="45.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1 text-xs text-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">Vendor</label>
                  <input
                    type="text"
                    placeholder="MariTool, McMaster"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1 text-xs text-[#0f172a]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#475569] mb-1">PO / Order #</label>
                  <input
                    type="text"
                    placeholder="PO-2026-081"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full bg-white border border-[#cbd5e1] rounded-sm px-2.5 py-1 text-xs text-[#0f172a]"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-1.5 text-xs text-[#64748b] hover:text-[#0f172a]"
          >
            Reset Form
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-sm shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : editingToolId ? 'Update Tool Specification' : 'Save Tool to Catalog'}
          </button>
        </div>
      </form>

      {/* Catalog Table Section */}
      <div className="max-w-6xl mx-auto bg-white border border-[#d8dce2] rounded-sm shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-[#e2e5e9] pb-2.5">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1e293b]">Catalog Tools Directory</h3>
            <p className="text-[10px] text-[#64748b]">Click edit icon to modify parameters or delete tool</p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search catalog tools..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="w-full bg-white border border-[#cbd5e1] rounded-sm pl-7 pr-2.5 py-1 text-xs text-[#0f172a] placeholder-[#9ca3af] focus:outline-none focus:border-amber-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f8fafc] text-[#475569] border-b border-[#e2e8f0] font-bold uppercase text-[10px] sticky top-0">
              <tr>
                <th className="py-2 px-2.5">TNUM</th>
                <th className="py-2 px-2.5">Description</th>
                <th className="py-2 px-2.5">Type</th>
                <th className="py-2 px-2.5">Cut Dia</th>
                <th className="py-2 px-2.5">LOC</th>
                <th className="py-2 px-2.5">Part #</th>
                <th className="py-2 px-2.5">Status</th>
                <th className="py-2 px-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {filteredCatalog.map((tool) => (
                <tr key={tool.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-1.5 px-2.5 font-mono font-bold text-[#b45309]">T{tool.tnum}</td>
                  <td className="py-1.5 px-2.5 text-[#0f172a] font-medium">{tool.description || '—'}</td>
                  <td className="py-1.5 px-2.5 text-[#64748b] capitalize">{tool.type || '—'}</td>
                  <td className="py-1.5 px-2.5 font-mono text-[#334155]">{tool.cutDia ? `${tool.cutDia}"` : '—'}</td>
                  <td className="py-1.5 px-2.5 font-mono text-[#334155]">{tool.loc ? `${tool.loc}"` : '—'}</td>
                  <td className="py-1.5 px-2.5 text-[#64748b]">{tool.part || '—'}</td>
                  <td className="py-1.5 px-2.5">
                    <div className="flex items-center gap-1">
                      {tool.isAssembled && (
                        <span className="text-[9px] font-semibold bg-[#dcfce7] text-[#15803d] px-1 py-0.2 rounded-sm border border-[#bbf7d0]">
                          Assy
                        </span>
                      )}
                      {tool.isOutOfStock && (
                        <span className="text-[9px] font-semibold bg-[#fee2e2] text-[#991b1b] px-1 py-0.2 rounded-sm border border-[#fca5a5]">
                          Out
                        </span>
                      )}
                      {tool.currentPocket && (
                        <span className="text-[9px] font-semibold bg-[#e0e7ff] text-[#1e3a8a] px-1 py-0.2 rounded-sm border border-[#c7d2fe] font-mono">
                          P{tool.currentPocket}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 px-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditTool(tool)}
                        className="p-1 text-[#64748b] hover:text-amber-700 rounded-sm"
                        title="Edit tool"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTool(tool.id, tool.tnum)}
                        className="p-1 text-[#64748b] hover:text-[#991b1b] rounded-sm"
                        title="Delete tool"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
