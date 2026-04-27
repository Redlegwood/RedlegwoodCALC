'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, X, Phone, Mail, MapPin, DollarSign, Edit2, Trash2, ChevronLeft, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface Supplier {
  id: number;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxRate: number;
  taxExempt: boolean;
  deliveryFee: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PriceEntry {
  id: number;
  species: string;
  grade: string;
  thicknessQuarters: number;
  pricePerBf: number;
  widthQualifier: string | null;
}

export default function SuppliersModule() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [prices, setPrices] = useState<PriceEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: '', contact: '', phone: '', email: '', address: '', taxRate: '0', taxExempt: false, deliveryFee: '0', notes: '' });

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers');
      const data = await res?.json?.() ?? [];
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load suppliers:', e);
    }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const handleSelectSupplier = useCallback(async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    try {
      const res = await fetch(`/api/suppliers/${supplier?.id}/prices`);
      const data = await res?.json?.() ?? [];
      setPrices(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load prices:', e);
      setPrices([]);
    }
  }, []);

  const handleOpenForm = (supplier?: Supplier) => {
    if (supplier) {
      setEditSupplier(supplier);
      setFormData({
        name: supplier?.name ?? '',
        contact: supplier?.contact ?? '',
        phone: supplier?.phone ?? '',
        email: supplier?.email ?? '',
        address: supplier?.address ?? '',
        taxRate: String(supplier?.taxRate ?? 0),
        taxExempt: supplier?.taxExempt ?? false,
        deliveryFee: String(supplier?.deliveryFee ?? 0),
        notes: supplier?.notes ?? '',
      });
    } else {
      setEditSupplier(null);
      setFormData({ name: '', contact: '', phone: '', email: '', address: '', taxRate: '0', taxExempt: false, deliveryFee: '0', notes: '' });
    }
    setShowForm(true);
  };

  const handleSaveSupplier = async () => {
    if (!formData?.name?.trim?.()) {
      toast.error('Supplier name is required');
      return;
    }
    try {
      const body = {
        name: formData.name,
        contact: formData.contact,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        tax_rate: parseFloat(formData.taxRate) || 0,
        tax_exempt: formData.taxExempt,
        delivery_fee: parseFloat(formData.deliveryFee) || 0,
        notes: formData.notes,
      };
      if (editSupplier) {
        await fetch(`/api/suppliers/${editSupplier.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        toast.success('Supplier saved');
      } else {
        await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        toast.success('Supplier saved');
      }
      setShowForm(false);
      setEditSupplier(null);
      await loadSuppliers();
      if (selectedSupplier && editSupplier && selectedSupplier.id === editSupplier.id) {
        const updatedRes = await fetch(`/api/suppliers/${editSupplier.id}`);
        const updatedData = await updatedRes?.json?.();
        setSelectedSupplier(updatedData);
      }
    } catch (e) {
      toast.error('Failed to save supplier');
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!confirm('Delete this supplier and all its price data?')) return;
    try {
      await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      toast.success('Supplier deleted');
      if (selectedSupplier?.id === id) {
        setSelectedSupplier(null);
        setPrices([]);
      }
      await loadSuppliers();
    } catch (e) {
      toast.error('Failed to delete supplier');
    }
  };

  // Detail panel view
  if (selectedSupplier) {
    return (
      <div className="space-y-6">
        <button onClick={() => { setSelectedSupplier(null); setPrices([]); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
          <ChevronLeft className="w-4 h-4" /> Back to Suppliers
        </button>

        <div className="bg-card rounded-xl p-6 shadow space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              {selectedSupplier?.name ?? 'Supplier'}
            </h2>
            <div className="flex gap-2">
              <button onClick={() => handleOpenForm(selectedSupplier)} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-accent transition">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button onClick={() => handleDeleteSupplier(selectedSupplier?.id)} className="flex items-center gap-1 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-sm hover:opacity-90 transition">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {selectedSupplier?.contact && <div className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /> {selectedSupplier.contact}</div>}
            {selectedSupplier?.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> {selectedSupplier.phone}</div>}
            {selectedSupplier?.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> {selectedSupplier.email}</div>}
            {selectedSupplier?.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> {selectedSupplier.address}</div>}
          </div>

          <div className="flex gap-4 text-sm">
            <div className="bg-background rounded-lg px-4 py-2">
              <span className="text-muted-foreground">Tax Rate:</span> {((selectedSupplier?.taxRate ?? 0) * 100)?.toFixed?.(1) ?? '0.0'}%
            </div>
            <div className="bg-background rounded-lg px-4 py-2">
              <span className="text-muted-foreground">Tax Exempt:</span> {selectedSupplier?.taxExempt ? 'Yes' : 'No'}
            </div>
            <div className="bg-background rounded-lg px-4 py-2">
              <span className="text-muted-foreground">Delivery Fee:</span> ${(selectedSupplier?.deliveryFee ?? 0)?.toFixed?.(2) ?? '0.00'}
            </div>
          </div>
          {selectedSupplier?.notes && (
            <div className="text-sm text-muted-foreground bg-background rounded-lg p-3">{selectedSupplier.notes}</div>
          )}
        </div>

        {/* Price sheet preview */}
        <div className="bg-card rounded-xl p-6 shadow space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Price Sheet ({(prices ?? [])?.length ?? 0} items)
          </h3>
          {(prices ?? [])?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 px-2">Species</th>
                    <th className="py-2 px-2">Grade</th>
                    <th className="py-2 px-2">Thickness</th>
                    <th className="py-2 px-2">$/BF</th>
                    <th className="py-2 px-2">Width</th>
                  </tr>
                </thead>
                <tbody>
                  {(prices ?? []).map((p: PriceEntry) => (
                    <tr key={p?.id} className="border-b border-border/50 hover:bg-accent/30 transition">
                      <td className="py-1.5 px-2">{p?.species ?? ''}</td>
                      <td className="py-1.5 px-2">{p?.grade ?? ''}</td>
                      <td className="py-1.5 px-2">{p?.thicknessQuarters ?? 4}/4</td>
                      <td className="py-1.5 px-2 font-medium">${(p?.pricePerBf ?? 0)?.toFixed?.(2) ?? '0.00'}</td>
                      <td className="py-1.5 px-2 text-muted-foreground">{p?.widthQualifier ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-6">No price data. Upload a PDF price sheet in the Upload Docs module.</div>
          )}
        </div>

        {/* Edit form modal */}
        {showForm && (
          <SupplierFormModal formData={formData} setFormData={setFormData} onSave={handleSaveSupplier} onClose={() => { setShowForm(false); setEditSupplier(null); }} isEdit={!!editSupplier} />
        )}
      </div>
    );
  }

  // Card list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Suppliers</h2>
        </div>
        <button onClick={() => handleOpenForm()} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition shadow">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>
      <p className="text-muted-foreground">Manage lumber suppliers, tax rates, and pricing information.</p>

      {(suppliers ?? [])?.length === 0 ? (
        <div className="bg-card rounded-xl p-12 shadow text-center text-muted-foreground">
          No suppliers yet. Click "Add Supplier" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(suppliers ?? []).map((s: Supplier) => (
            <div
              key={s?.id}
              onClick={() => handleSelectSupplier(s)}
              className="bg-card rounded-xl p-5 shadow hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg group-hover:text-primary transition">{s?.name ?? 'Unnamed'}</h3>
                <div className="flex gap-1" onClick={(e: React.MouseEvent) => e?.stopPropagation?.()}>
                  <button onClick={() => handleOpenForm(s)} className="p-1.5 rounded-lg hover:bg-accent transition">
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDeleteSupplier(s?.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 transition">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                {s?.contact && <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {s.contact}</div>}
                {s?.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {s.phone}</div>}
                {s?.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {s.email}</div>}
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="bg-background px-2 py-0.5 rounded">Tax: {((s?.taxRate ?? 0) * 100)?.toFixed?.(1)}%</span>
                {s?.taxExempt && <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Exempt</span>}
                {(s?.deliveryFee ?? 0) > 0 && <span className="bg-background px-2 py-0.5 rounded">Delivery: ${(s?.deliveryFee ?? 0)?.toFixed?.(2)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SupplierFormModal formData={formData} setFormData={setFormData} onSave={handleSaveSupplier} onClose={() => { setShowForm(false); setEditSupplier(null); }} isEdit={!!editSupplier} />
      )}
    </div>
  );
}

function SupplierFormModal({ formData, setFormData, onSave, onClose, isEdit }: {
  formData: any;
  setFormData: (d: any) => void;
  onSave: () => void;
  onClose: () => void;
  isEdit: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl p-6 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e: React.MouseEvent) => e?.stopPropagation?.()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{isEdit ? 'Edit Supplier' : 'New Supplier'}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent transition"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input type="text" value={formData?.name ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...(formData ?? {}), name: e?.target?.value ?? '' })} className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Contact</label>
              <input type="text" value={formData?.contact ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...(formData ?? {}), contact: e?.target?.value ?? '' })} className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input type="text" value={formData?.phone ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...(formData ?? {}), phone: e?.target?.value ?? '' })} className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={formData?.email ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...(formData ?? {}), email: e?.target?.value ?? '' })} className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <input type="text" value={formData?.address ?? ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...(formData ?? {}), address: e?.target?.value ?? '' })} className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
              <div className="relative"><input type="number" value={formData?.taxRate ?? '0'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...(formData ?? {}), taxRate: e?.target?.value ?? '0' })} step="0.01" min="0" className="w-full bg-background border border-input rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-ring focus:outline-none" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">%</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Delivery Fee ($)</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span><input type="number" value={formData?.deliveryFee ?? '0'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...(formData ?? {}), deliveryFee: e?.target?.value ?? '0' })} step="0.01" min="0" className="w-full bg-background border border-input rounded-lg pl-7 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none" /></div>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2">
                <input type="checkbox" checked={formData?.taxExempt ?? false} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...(formData ?? {}), taxExempt: e?.target?.checked ?? false })} className="rounded" />
                <span className="text-sm">Tax Exempt</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea value={formData?.notes ?? ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...(formData ?? {}), notes: e?.target?.value ?? '' })} rows={3} className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onSave} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 transition shadow">Save</button>
            <button onClick={onClose} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg font-medium hover:bg-accent transition">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
