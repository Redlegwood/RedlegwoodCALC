'use client';

import { useState } from 'react';
import { Calculator, Clock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

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

interface HistoryEntry {
  id: number;
  mode: string;
  thickness: string;
  width: string;
  length: string;
  quantity: string;
  wastePercent: string;
  milling: string;
  pricePerBf: string;
  millingCostPerBf: string;
  boardFeet: number;
  totalCost: number;
  timestamp: string;
}

export default function CalculatorModule() {
  const [mode, setMode] = useState<'roughstock' | 'dimensional'>('roughstock');
  const [thicknessQuarters, setThicknessQuarters] = useState(4);
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [wastePercent, setWastePercent] = useState('25');
  const [milling, setMilling] = useState('S3S');
  const [pricePerBf, setPricePerBf] = useState('');
  const [millingCostPerBf, setMillingCostPerBf] = useState('.50');
  const [result, setResult] = useState<{ boardFeet: number; totalCost: number } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const handleCalculate = () => {
    const w = parseFloat(width) || 0;
    const l = parseFloat(length) || 0;
    const qty = parseInt(quantity) || 0;
    const tq = thicknessQuarters || 0;
    const waste = parseFloat(wastePercent) || 0;
    const price = parseFloat(pricePerBf) || 0;
    const millingCost = parseFloat(millingCostPerBf) || 0;

    if (!w || !l || !qty) {
      toast.error('Please fill in width, length, and quantity');
      return;
    }

    // Board foot formula: (Thickness_inches × Width_inches × Length_feet) ÷ 12
    // Thickness converts quarters to inches: 4/4=1", 5/4=1.25", 6/4=1.5", 8/4=2", etc.
    const thicknessInches = tq / 4;
    const boardFeetPerBoard = (thicknessInches * w * l) / 12;
    const boardFeet = boardFeetPerBoard * qty;
    const boardFeetWithWaste = boardFeet * (1 + waste / 100);
    const totalCost = boardFeetWithWaste * (price + millingCost);

    const calcResult = {
      boardFeet: Math.round(boardFeetWithWaste * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    };

    setResult(calcResult);

    // Add to history
    const thicknessLabel = THICKNESS_OPTIONS.find((t) => t.value === tq)?.label ?? `${tq}/4`;
    setHistory((prev) => [
      {
        id: Date.now(),
        mode,
        thickness: thicknessLabel,
        width,
        length,
        quantity,
        wastePercent,
        milling,
        pricePerBf: pricePerBf || '0.00',
        millingCostPerBf,
        boardFeet: calcResult.boardFeet,
        totalCost: calcResult.totalCost,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);
  };

  const handleClear = () => {
    setThicknessQuarters(4);
    setWidth('');
    setLength('');
    setQuantity('1');
    setWastePercent('25');
    setMilling('S3S');
    setPricePerBf('0.00');
    setMillingCostPerBf('.50');
    setResult(null);
  };

  const clearHistory = () => setHistory([]);

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <Calculator className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Board Foot Calculator</h2>
      </div>
      <p className="text-muted-foreground">
        Calculate board feet and lumber costs for roughstock and dimensional lumber.
      </p>

      {/* Form Factor Toggle */}
      <div className="bg-card rounded-xl p-4 shadow border border-border">
        <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">
          Form Factor
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setMode('roughstock'); setResult(null); }}
            className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'roughstock'
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            Roughstock
          </button>
          <button
            onClick={() => { setMode('dimensional'); setResult(null); }}
            className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'dimensional'
                ? 'bg-primary text-primary-foreground shadow'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            Dimensional
          </button>
        </div>
      </div>

      {/* Required Information */}
      <div className="bg-card rounded-xl p-6 shadow border border-border space-y-4">
        <h3 className="text-lg font-semibold">Required Information</h3>
        <div className="border-t border-border" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Thickness */}
          <div>
            <label className="block text-sm font-medium mb-1">Thickness (Quarters)</label>
            <select
              value={thicknessQuarters}
              onChange={(e) => setThicknessQuarters(parseInt(e.target.value) || 4)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            >
              {THICKNESS_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Width */}
          <div>
            <label className="block text-sm font-medium mb-1">Width (Inches)</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="0.00"
              step="0.25"
              min="0"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>

          {/* Length */}
          <div>
            <label className="block text-sm font-medium mb-1">Length (Feet)</label>
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="0.00"
              step="0.5"
              min="0"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>

          {/* Waste % */}
          <div>
            <label className="block text-sm font-medium mb-1">Waste %</label>
            <input
              type="number"
              value={wastePercent}
              onChange={(e) => setWastePercent(e.target.value)}
              min="0"
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>

          {/* Milling */}
          <div>
            <label className="block text-sm font-medium mb-1">Milling</label>
            <select
              value={milling}
              onChange={(e) => setMilling(e.target.value)}
              className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
            >
              {MILLING_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Price Per Board Foot */}
          <div>
            <label className="block text-sm font-medium mb-1">Price Per Board Foot</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={pricePerBf}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) setPricePerBf(val);
                }}
                onBlur={() => {
                  const num = parseFloat(pricePerBf);
                  setPricePerBf(!isNaN(num) ? num.toFixed(2) : '0.00');
                }}
                placeholder="0.00"
                className="w-full bg-background border border-input rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
          </div>

          {/* Milling Cost Per BF */}
          <div>
            <label className="block text-sm font-medium mb-1">Milling Cost Per BF</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                value={millingCostPerBf}
                onChange={(e) => setMillingCostPerBf(e.target.value)}
                placeholder="0.50"
                step="0.01"
                min="0"
                className="w-full bg-background border border-input rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleCalculate}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition shadow"
          >
            <Calculator className="w-4 h-4" />
            Calculate
          </button>
          <button
            onClick={handleClear}
            className="px-6 py-2.5 rounded-lg font-medium bg-secondary text-secondary-foreground hover:bg-accent transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-card rounded-xl p-6 shadow border border-border space-y-4">
          <h3 className="text-lg font-semibold">Results</h3>
          <div className="border-t border-border" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                Board Feet (w/ waste)
              </div>
              <div className="text-2xl font-bold text-foreground">{result.boardFeet}</div>
            </div>
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">
                Total Cost
              </div>
              <div className="text-2xl font-bold text-primary">${result.totalCost.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-card rounded-xl p-6 shadow border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">History</h3>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear
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
              <div
                key={entry.id}
                className="flex items-center justify-between bg-background rounded-lg px-4 py-3 border border-border/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium bg-accent text-accent-foreground px-2 py-0.5 rounded capitalize">
                      {entry.mode}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {entry.thickness} · {entry.width}" wide · {entry.length}' long · qty {entry.quantity}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {entry.milling} · {entry.wastePercent}% waste · ${entry.pricePerBf}/BF · ${entry.millingCostPerBf} milling
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <div className="text-sm font-bold text-foreground">{entry.boardFeet} BF</div>
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
