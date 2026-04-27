'use client';

import { useState } from 'react';
import { ArrowLeft, Moon, History } from 'lucide-react';
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

const MILLING_OPTIONS = [
  'S3S',
  'S4S',
  'S2S',
  'Rough',
];

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

  const [result, setResult] = useState<{
    boardFeet: number;
    totalCost: number;
  } | null>(null);

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

    setResult({
      boardFeet: Math.round(boardFeetWithWaste * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    });
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

  return (
    <div className="min-h-screen bg-[#e8e4df] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold italic" style={{ fontFamily: 'Georgia, serif' }}>
            Board Foot Calculator
          </h1>
          <button className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-300">
            <Moon className="w-4 h-4" />
          </button>
        </div>
        <button className="flex items-center gap-2 bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-300">
          <History className="w-4 h-4" />
          VIEW HISTORY
        </button>
      </div>

      {/* Form Factor Toggle */}
      <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-400 tracking-widest mb-3">FORM FACTOR</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { setMode('roughstock'); setResult(null); }}
            className={`py-3 rounded-2xl text-sm font-semibold transition-all ${
              mode === 'roughstock'
                ? 'bg-[#8B6534] text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Roughstock
          </button>
          <button
            onClick={() => { setMode('dimensional'); setResult(null); }}
            className={`py-3 rounded-2xl text-sm font-semibold transition-all ${
              mode === 'dimensional'
                ? 'bg-[#8B6534] text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Dimensional
          </button>
        </div>
      </div>

      {/* Required Information */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Required Information</h2>
        <hr className="border-gray-100 mb-4" />

        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          {/* Thickness (Quarters) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-widest mb-1">
              THICKNESS (QUARTERS)
            </label>
            <select
              value={thicknessQuarters}
              onChange={(e) => setThicknessQuarters(parseInt(e.target.value) || 4)}
              className="w-full bg-gray-100 rounded-xl px-3 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8B6534] border-none appearance-none"
            >
              {THICKNESS_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Width (Inches) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-widest mb-1">
              WIDTH (INCHES)
            </label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="0.00"
              step="0.25"
              min="0"
              className="w-full bg-gray-100 rounded-xl px-3 py-3 text-sm text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B6534] border-none placeholder-gray-400"
            />
          </div>

          {/* Length (Feet) */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-widest mb-1">
              LENGTH (FEET)
            </label>
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="0.00"
              step="0.5"
              min="0"
              className="w-full bg-gray-100 rounded-xl px-3 py-3 text-sm text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8B6534] border-none placeholder-gray-400"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-widest mb-1">
              QUANTITY
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="w-full bg-gray-100 rounded-xl px-3 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8B6534] border-none"
            />
          </div>

          {/* Waste % */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-widest mb-1">
              WASTE %
            </label>
            <input
              type="number"
              value={wastePercent}
              onChange={(e) => setWastePercent(e.target.value)}
              min="0"
              className="w-full bg-gray-100 rounded-xl px-3 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8B6534] border-none"
            />
          </div>

          {/* Milling */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-widest mb-1">
              MILLING
            </label>
            <select
              value={milling}
              onChange={(e) => setMilling(e.target.value)}
              className="w-full bg-gray-100 rounded-xl px-3 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8B6534] border-none appearance-none"
            >
              {MILLING_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Price Per Board Foot */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-widest mb-1">
              PRICE PER BOARD FOOT
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={pricePerBf}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setPricePerBf(val);
                  }
                }}
                onBlur={() => {
                  const num = parseFloat(pricePerBf);
                  if (!isNaN(num)) {
                    setPricePerBf(num.toFixed(2));
                  } else if (pricePerBf === '') {
                    setPricePerBf('0.00');
                  }
                }}
                placeholder="0.00"
                className="w-full bg-gray-100 rounded-xl pl-6 pr-3 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8B6534] border-none"
              />
            </div>
          </div>

          {/* Milling Cost Per BF */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 tracking-widest mb-1">
              MILLING COST PER BF
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                value={millingCostPerBf}
                onChange={(e) => setMillingCostPerBf(e.target.value)}
                placeholder="0.50"
                step="0.01"
                min="0"
                className="w-full bg-gray-100 rounded-xl pl-6 pr-3 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8B6534] border-none"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCalculate}
            className="flex-1 bg-[#8B6534] text-white py-3 rounded-xl font-semibold hover:bg-[#7a5929] transition shadow"
          >
            Calculate
          </button>
          <button
            onClick={handleClear}
            className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-2xl p-5 mt-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Results</h2>
          <hr className="border-gray-100 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-400 mb-1">Board Feet (w/ waste)</div>
              <div className="text-xl font-bold text-gray-800">{result.boardFeet}</div>
            </div>
            <div className="bg-gray-100 rounded-xl p-4 text-center">
              <div className="text-xs text-gray-400 mb-1">Total Cost</div>
              <div className="text-xl font-bold text-[#8B6534]">${result.totalCost.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
