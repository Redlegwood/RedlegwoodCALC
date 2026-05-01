'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calculator, Clock, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Roughstock constants ─────────────────────────────────────────────────────
const THICKNESS_OPTIONS = [
  { label: '4/4', value: 4 },
  { label: '5/4', value: 5 },
  { label: '6/4', value: 6 },
  { label: '8/4', value: 8 },
  { label: '10/4', value: 10 },
  { label: '12/4', value: 12 },
  { label: '16/4', value: 16 },
];
const MILLING_OPTIONS = ['S3S', 'S4S', 'S2S', 'Rough'];

// ── Dimensional constants ────────────────────────────────────────────────────
const WOOD_DIMENSION_OPTIONS = [
  '1x2', '1x3', '1x4', '1x6', '1x8', '1x10', '1x12',
  '2x2', '2x3', '2x4', '2x6', '2x8', '2x10', '2x12',
  '4x4', '4x6', '6x6',
];

// ── Types ────────────────────────────────────────────────────────────────────
interface SavedSupplier {
  id: number;
  name: string;
  taxRate: number;
}

interface HistoryEntry {
  id: number;
  mode: 'roughstock' | 'dimensional';
  species: string;
  supplier: string;
  timestamp: string;
  // roughstock
  thickness?: string;
  width?: string;
  wastePercent?: string;
  milling?: string;
  pricePerBf?: string;
  millingCostPerBf?: string;
  boardFeet?: number;
  // dimensional
  woodDimension?: string;
  dimPricePerLf?: string;
  linearFeet?: number;
  // shared
  length: string;
  quantity: string;
  totalCost: number;
}

// ── SupplierSelect component ─────────────────────────────────────────────────
// Shows a dropdown of saved suppliers + an "Add new..." option that reveals a
// text input. Saving a new name POSTs to /api/suppliers.
function SupplierSelect({
  suppliers,
  value,
  onChange,
  onSaved,
  inputCls,
}: {
  suppliers: SavedSupplier[];
  value: string;
  onChange: (name: string) => void;
  onSaved: (newSupplier: SavedSupplier) => void;
  inputCls: string;
}) {
  const ADD_NEW = '__add_new__';
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSelect = (val: string) => {
    if (val === ADD_NEW) {
      setShowNew(true);
      onChange('');
    } else {
      setShowNew(false);
      setNewName('');
      onChange(val);
    }
  };

  const handleSaveNew = async () => {
    const name = newName.trim();
    if (!name) { toast.error('Supplier name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const saved: SavedSupplier = await res.json();
      onSaved(saved);
      onChange(saved.name);
      setShowNew(false);
      setNewName('');
      toast.success(`Supplier "${saved.name}" saved`);
    } catch {
      toast.error('Could not save supplier');
    } finally {
      setSaving(false);
    }
  };

  // Determine which option is currently selected in the dropdown
  const dropdownValue = showNew
    ? ADD_NEW
    : suppliers.find((s) => s.name === value)
    ? value
    : value
    ? '' // typed value not in list — treat as unselected
    : '';

  return (
    <div className="space-y-2">
      <select
        value={dropdownValue}
        onChange={(e) => handleSelect(e.target.value)}
        className={inputCls}
      >
        <option value="">Select supplier…</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.name}>{s.name}</option>
        ))}
        <option value={ADD_NEW}>＋ Add new supplier…</option>
      </select>

      {showNew && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNew(); }}
            placeholder="New supplier name"
            className={inputCls + ' flex-1'}
            autoFocus
          />
          <button
            onClick={handleSaveNew}
            disabled={saving}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={() => { setShowNew(false); setNewName(''); }}
            className="px-3 py-2 rounded-lg text-sm bg-secondary text-secondary-foreground hover:bg-accent transition"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function CalculatorModule() {
  const [mode, setMode] = useState<'roughstock' | 'dimensional'>('roughstock');

  // Saved suppliers from the database
  const [savedSuppliers, setSavedSuppliers] = useState<SavedSupplier[]>([]);

  // Shared optional fields
  const [species, setSpecies] = useState('');
  const [supplier, setSupplier] = useState('');

  // Roughstock state
  const [thicknessQuarters, setThicknessQuarters] = useState(4);
  const [rsWidth, setRsWidth] = useState('');
  const [rsLength, setRsLength] = useState('');
  const [rsQuantity, setRsQuantity] = useState('1');
  const [wastePercent, setWastePercent] = useState('25');
  const [milling, setMilling] = useState('S3S');
  const [pricePerBf, setPricePerBf] = useState('');
  const [millingCostPerBf, setMillingCostPerBf] = useState('.50');
  const [rsResult, setRsResult] = useState<{ boardFeet: number; totalCost: number } | null>(null);

  // Dimensional state
  const [woodDimension, setWoodDimension] = useState('2x4');
  const [dimLength, setDimLength] = useState('');
  const [dimQuantity, setDimQuantity] = useState('1');
  const [dimPricePerLf, setDimPricePerLf] = useState('');
  const [dimResult, setDimResult] = useState<{ linearFeet: number; totalCost: number } | null>(null);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [taxRate, setTaxRate] = useState('');

  // Load saved suppliers on mount
  const loadSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      setSavedSuppliers(Array.isArray(data) ? data.map((s: any) => ({ id: s.id, name: s.name, taxRate: s.taxRate ?? 0 })) : []);
    } catch {
      // silently fail — supplier dropdown will just be empty
    }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  // Called when SupplierSelect saves a brand-new supplier
  const handleNewSupplierSaved = (s: SavedSupplier) => {
    setSavedSuppliers((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
  };

  // Roughstock calculate
  const handleRsCalculate = () => {
    const w = parseFloat(rsWidth) || 0;
    const l = parseFloat(rsLength) || 0;
    const qty = parseInt(rsQuantity) || 0;
    const tq = thicknessQuarters || 0;
    const waste = parseFloat(wastePercent) || 0;
    const price = parseFloat(pricePerBf) || 0;
    const millingCost = parseFloat(millingCostPerBf) || 0;

    if (!w || !l || !qty) { toast.error('Please fill in width, length, and quantity'); return; }

    const thicknessInches = tq / 4;
    const boardFeetPerBoard = (thicknessInches * w * l) / 12;
    const boardFeet = boardFeetPerBoard * qty;
    const boardFeetWithWaste = boardFeet * (1 + waste / 100);
    const totalCost = boardFeetWithWaste * (price + millingCost);

    const result = {
      boardFeet: Math.round(boardFeetWithWaste * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    };
    setRsResult(result);

    const thicknessLabel = THICKNESS_OPTIONS.find((t) => t.value === tq)?.label ?? `${tq}/4`;
    setHistory((prev) => [{
      id: Date.now(), mode: 'roughstock', species, supplier,
      thickness: thicknessLabel, width: rsWidth, length: rsLength,
      quantity: rsQuantity, wastePercent, milling,
      pricePerBf: pricePerBf || '0.00', millingCostPerBf,
      boardFeet: result.boardFeet, totalCost: result.totalCost,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }, ...prev]);
  };

  const handleRsClear = () => {
    setThicknessQuarters(4); setRsWidth(''); setRsLength(''); setRsQuantity('1');
    setWastePercent('25'); setMilling('S3S'); setPricePerBf('0.00');
    setMillingCostPerBf('.50'); setRsResult(null);
  };

  // Dimensional calculate
  const handleDimCalculate = () => {
    const l = parseFloat(dimLength) || 0;
    const qty = parseInt(dimQuantity) || 0;
    const price = parseFloat(dimPricePerLf) || 0;

    if (!l || !qty) { toast.error('Please fill in length and quantity'); return; }

    const linearFeet = Math.round(l * qty * 100) / 100;
    const totalCost = Math.round(linearFeet * price * 100) / 100;

    const result = { linearFeet, totalCost };
    setDimResult(result);

    setHistory((prev) => [{
      id: Date.now(), mode: 'dimensional', species, supplier,
      woodDimension, length: dimLength, quantity: dimQuantity,
      dimPricePerLf: dimPricePerLf || '0.00',
      linearFeet: result.linearFeet, totalCost: result.totalCost,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }, ...prev]);
  };

  const handleDimClear = () => {
    setWoodDimension('2x4'); setDimLength(''); setDimQuantity('1');
    setDimPricePerLf(''); setDimResult(null);
  };

  const clearHistory = () => setHistory([]);

  const inputCls = 'w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none';
  const dollarInputCls = 'w-full bg-background border border-input rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Calculator className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Board Foot Calculator</h2>
      </div>
      <p className="text-muted-foreground">
        Calculate board feet and lumber costs for roughstock and dimensional lumber.
      </p>

      {/* Form Factor Toggle */}
      <div className="bg-card rounded-xl p-4 shadow border border-border">
        <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Form Factor</p>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setMode('roughstock')}
            className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'roughstock' ? 'bg-primary text-primary-foreground shadow' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}>
            Roughstock
          </button>
          <button onClick={() => setMode('dimensional')}
            className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'dimensional' ? 'bg-primary text-primary-foreground shadow' : 'bg-secondary text-secondary-foreground hover:bg-accent'}`}>
            Dimensional
          </button>
        </div>
      </div>

      {/* ── ROUGHSTOCK ───────────────────────────────────────────────────── */}
      {mode === 'roughstock' && (
        <div className="bg-card rounded-xl p-6 shadow border border-border space-y-4">
          <h3 className="text-lg font-semibold">Required Information</h3>
          <div className="border-t border-border" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Thickness (Quarters)</label>
              <select value={thicknessQuarters} onChange={(e) => setThicknessQuarters(parseInt(e.target.value) || 4)} className={inputCls}>
                {THICKNESS_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Width (Inches)</label>
              <input type="number" value={rsWidth} onChange={(e) => setRsWidth(e.target.value)} onBlur={() => { const n = parseFloat(rsWidth); setRsWidth(!isNaN(n) ? n.toFixed(2) : ''); }} placeholder="0.00" step="0.01" min="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Length (Feet)</label>
              <input type="number" value={rsLength} onChange={(e) => setRsLength(e.target.value)} onBlur={() => { const n = parseFloat(rsLength); setRsLength(!isNaN(n) ? n.toFixed(2) : ''); }} placeholder="0.00" step="0.01" min="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input type="number" value={rsQuantity} onChange={(e) => setRsQuantity(e.target.value)} min="1" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Waste %</label>
              <input type="number" value={wastePercent} onChange={(e) => setWastePercent(e.target.value)} min="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Milling</label>
              <select value={milling} onChange={(e) => setMilling(e.target.value)} className={inputCls}>
                {MILLING_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price Per Board Foot</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input type="text" inputMode="decimal" value={pricePerBf}
                  onChange={(e) => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setPricePerBf(v); }}
                  onBlur={() => { const n = parseFloat(pricePerBf); setPricePerBf(!isNaN(n) ? n.toFixed(2) : '0.00'); }}
                  placeholder="0.00" className={dollarInputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Milling Cost Per BF</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input type="number" value={millingCostPerBf} onChange={(e) => setMillingCostPerBf(e.target.value)} placeholder="0.50" step="0.01" min="0" className={dollarInputCls} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleRsCalculate} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition shadow">
              <Calculator className="w-4 h-4" /> Calculate
            </button>
            <button onClick={handleRsClear} className="px-6 py-2.5 rounded-lg font-medium bg-secondary text-secondary-foreground hover:bg-accent transition">Clear</button>
          </div>
        </div>
      )}

      {/* ── DIMENSIONAL ──────────────────────────────────────────────────── */}
      {mode === 'dimensional' && (
        <div className="bg-card rounded-xl p-6 shadow border border-border space-y-4">
          <h3 className="text-lg font-semibold">Required Information</h3>
          <div className="border-t border-border" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Wood Dimensions</label>
              <select value={woodDimension} onChange={(e) => setWoodDimension(e.target.value)} className={inputCls}>
                {WOOD_DIMENSION_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Length (Feet)</label>
              <input type="number" value={dimLength} onChange={(e) => setDimLength(e.target.value)} onBlur={() => { const n = parseFloat(dimLength); setDimLength(!isNaN(n) ? n.toFixed(2) : ''); }} placeholder="0.00" step="0.01" min="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input type="number" value={dimQuantity} onChange={(e) => setDimQuantity(e.target.value)} min="1" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Price Per Linear Foot</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input type="text" inputMode="decimal" value={dimPricePerLf}
                  onChange={(e) => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setDimPricePerLf(v); }}
                  onBlur={() => { const n = parseFloat(dimPricePerLf); setDimPricePerLf(!isNaN(n) ? n.toFixed(2) : '0.00'); }}
                  placeholder="0.00%" className={dollarInputCls} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleDimCalculate} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition shadow">
              <Calculator className="w-4 h-4" /> Calculate
            </button>
            <button onClick={handleDimClear} className="px-6 py-2.5 rounded-lg font-medium bg-secondary text-secondary-foreground hover:bg-accent transition">Clear</button>
          </div>
        </div>
      )}

      {/* ── OPTIONAL INFORMATION ─────────────────────────────────────────── */}
      <div className="bg-card rounded-xl p-6 shadow border border-border space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Optional Information</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Saved with each calculation for reference in history.</p>
        </div>
        <div className="border-t border-border" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Species</label>
            <input type="text" value={species} onChange={(e) => setSpecies(e.target.value)}
              placeholder="e.g. White Oak, Walnut, Cherry" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Supplier</label>
            <SupplierSelect
              suppliers={savedSuppliers}
              value={supplier}
              onChange={(name) => {
                setSupplier(name);
                const found = savedSuppliers.find((s) => s.name === name);
                setTaxRate(found && found.taxRate != null ? Number(found.taxRate).toFixed(2) + '%' : '');
              }}
              onSaved={handleNewSupplierSaved}
              inputCls={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
              <input
              type="text" inputMode="decimal"
              value={taxRate}
              onChange={(e) => { const v = e.target.value.replace('%', ''); if (v === '' || /^\d*\.?\d*$/.test(v)) setTaxRate(v); }}
                onBlur={() => { const v = taxRate.replace('%', ''); const n = parseFloat(v); setTaxRate(!isNaN(n) ? n.toFixed(2) + '%' : ''); }}
              placeholder="0.00%"
              className={inputCls}
            />
          </div>
          </div>
      </div>


      {/* ── RESULTS ──────────────────────────────────────────────────────── */}
      {mode === 'roughstock' && rsResult && (
        <div className="bg-card rounded-xl p-6 shadow border border-border space-y-4">
          <h3 className="text-lg font-semibold">Results</h3>
          <div className="border-t border-border" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Board Feet (w/ waste)</div>
              <div className="text-2xl font-bold text-foreground">{rsResult.boardFeet}</div>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Subtotal</div>
              <div className="text-2xl font-bold text-primary">${rsResult.totalCost.toFixed(2)}</div>
            </div>
            {taxRate > 0 && (
              <>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Tax ({taxRate}%)</div>
                  <div className="text-2xl font-bold text-foreground">${(rsResult.totalCost * taxRate / 100).toFixed(2)}</div>
                </div>
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Total w/ Tax</div>
                  <div className="text-2xl font-bold text-primary">${(rsResult.totalCost * (1 + taxRate / 100)).toFixed(2)}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {mode === 'dimensional' && dimResult && (
        <div className="bg-card rounded-xl p-6 shadow border border-border space-y-4">
          <h3 className="text-lg font-semibold">Results</h3>
          <div className="border-t border-border" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Linear Feet</div>
              <div className="text-2xl font-bold text-foreground">{dimResult.linearFeet}</div>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Subtotal</div>
              <div className="text-2xl font-bold text-primary">${dimResult.totalCost.toFixed(2)}</div>
            </div>
            {taxRate > 0 && (
              <>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Tax ({taxRate}%)</div>
                  <div className="text-2xl font-bold text-foreground">${(dimResult.totalCost * taxRate / 100).toFixed(2)}</div>
                </div>
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                  <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Total w/ Tax</div>
                  <div className="text-2xl font-bold text-primary">${(dimResult.totalCost * (1 + taxRate / 100)).toFixed(2)}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── HISTORY ──────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl p-6 shadow border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">History</h3>
          </div>
          {history.length > 0 && (
            <button onClick={clearHistory} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          )}
        </div>
        <div className="border-t border-border" />

        {history.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No calculations yet. Results will appear here after you calculate.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between bg-background rounded-lg px-4 py-3 border border-border/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium bg-accent text-accent-foreground px-2 py-0.5 rounded capitalize">{entry.mode}</span>
                    {entry.species && <span className="text-xs font-semibold text-foreground">{entry.species}</span>}
                    {entry.supplier && <span className="text-xs text-muted-foreground">via {entry.supplier}</span>}
                  </div>
                  {entry.mode === 'roughstock' && (
                    <>
                      <div className="text-sm font-medium text-foreground mt-1">
                        {entry.thickness} · {entry.width}" wide · {entry.length}' long · QTY {entry.quantity}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {entry.milling} · {entry.wastePercent}% waste · ${entry.pricePerBf}/BF · ${entry.millingCostPerBf} milling
                      </div>
                    </>
                  )}
                  {entry.mode === 'dimensional' && (
                    <div className="text-sm font-medium text-foreground mt-1">
                      {entry.woodDimension} · {entry.length}' long · QTY {entry.quantity} · ${entry.dimPricePerLf}/LF
                    </div>
                  )}h
                </div>
                <div className="text-right ml-4 shrink-0">
                  {entry.mode === 'roughstock' && <div className="text-sm font-bold text-foreground">{entry.boardFeet} BF</div>}
                  {entry.mode === 'dimensional' && <div className="text-sm font-bold text-foreground">{entry.linearFeet} LF</div>}
                  <div className="text-xs font-medium text-primary">${entry.totalCost.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">{entry.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
