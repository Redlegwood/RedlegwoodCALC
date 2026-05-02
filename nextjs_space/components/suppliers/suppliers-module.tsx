'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, Plus, X, Phone, Mail, MapPin, DollarSign, Edit2, Trash2, ChevronLeft, FileText, Search } from 'lucide-react';
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
    const [formData, setFormData] = useState({
          name: '', contact: '', phone: '', email: '',
          address: '', taxRate: '0', taxExempt: false, deliveryFee: '0', notes: '',
    });
    const [priceSearch, setPriceSearch] = useState('');

  const loadSuppliers = useCallback(async () => {
        try {
                const res = await fetch('/api/suppliers');
                const data: Supplier[] = await res.json() ?? [];
                setSuppliers(Array.isArray(data) ? data : []);
        } catch (e) {
                toast.error('Failed to load suppliers');
        }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const handleSelectSupplier = useCallback(async (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setPriceSearch('');
        try {
                const res = await fetch(`/api/price-sheets?supplierId=${supplier?.id}`);
                const data = await res?.json() ?? [];
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
        const { name, contact, phone, email, address, taxRate, taxExempt, deliveryFee, notes } = formData;
        if (!name.trim()) {
                toast.error('Supplier name is required');
                return;
        }
        try {
                const body = {
                          name, contact, phone, email, address,
                          tax_rate: parseFloat(taxRate) || 0,
                          tax_exempt: taxExempt,
                          delivery_fee: parseFloat(deliveryFee) || 0,
                          notes,
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
                if (editSupplier?.id) {
                          const updatedRes = await fetch(`/api/suppliers/${editSupplier.id}`);
                          const updatedData = await updatedRes.json();
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

  // Detect if this is lumber-mode data (any row has thicknessQuarters > 0)
  const isLumberData = useMemo(
        () => prices.some((p) => p.thicknessQuarters > 0),
        [prices]
      );

  // Filter prices by search query
  const filteredPrices = useMemo(() => {
        const q = priceSearch.trim().toLowerCase();
        if (!q) return prices;
        return prices.filter((p) =>
                p.species.toLowerCase().includes(q) ||
                p.grade.toLowerCase().includes(q) ||
                (p.widthQualifier ?? '').toLowerCase().includes(q)
                                 );
  }, [prices, priceSearch]);

  // Detail panel view
  if (selectedSupplier) {
        return (
                <div className="space-y-6">
                        <button
                                    onClick={() => { setSelectedSupplier(null); setPrices([]); }}
                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                  <ChevronLeft className="w-4 h-4" /> Back to Suppliers
                        </button>button>
                
                  {/* Supplier info card */}
                        <div className="bg-card rounded-xl p-6 shadow space-y-4">
                                  <div className="flex items-center justify-between">
                                              <h2 className="text-2xl font-bold flex items-center gap-2">
                                                            <Users className="w-6 h-6 text-primary" />
                                                {selectedSupplier?.name ?? 'Supplier'}
                                              </h2>h2>
                                              <div className="flex gap-2">
                                                            <button
                                                                              onClick={() => handleOpenForm(selectedSupplier)}
                                                                              className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-80"
                                                                            >
                                                                            <Edit2 className="w-4 h-4" /> Edit
                                                            </button>button>
                                                            <button
                                                                              onClick={() => handleDeleteSupplier(selectedSupplier?.id)}
                                                                              className="flex items-center gap-1 bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-80"
                                                                            >
                                                                            <Trash2 className="w-4 h-4" /> Delete
                                                            </button>button>
                                              </div>div>
                                  </div>div>
                        
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    {selectedSupplier?.contact && <div className="flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" />{selectedSupplier.contact}</div>div>}
                                    {selectedSupplier?.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{selectedSupplier.phone}</div>div>}
                                    {selectedSupplier?.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{selectedSupplier.email}</div>div>}
                                    {selectedSupplier?.address && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" />{selectedSupplier.address}</div>div>}
                                  </div>div>
                        
                                  <div className="flex gap-4 text-sm">
                                              <div className="bg-background rounded-lg px-4 py-2">
                                                            <span className="text-muted-foreground">Tax Rate:</span>span>{' '}
                                                {(selectedSupplier?.taxRate ?? 0)?.toFixed?.(2) ?? '0.00'}%
                                              </div>div>
                                              <div className="bg-background rounded-lg px-4 py-2">
                                                            <span className="text-muted-foreground">Tax Exempt:</span>span>{' '}
                                                {selectedSupplier?.taxExempt ? 'Yes' : 'No'}
                                              </div>div>
                                              <div className="bg-background rounded-lg px-4 py-2">
                                                            <span className="text-muted-foreground">Delivery Fee:</span>span>{' '}
                                                            ${(selectedSupplier?.deliveryFee ?? 0)?.toFixed?.(2) ?? '0.00'}
                                              </div>div>
                                  </div>div>
                        
                          {selectedSupplier?.notes && (
                              <div className="text-sm text-muted-foreground bg-background rounded-lg p-3">{selectedSupplier.notes}</div>div>
                                  )}
                        </div>div>
                
                  {/* Price sheet section */}
                        <div className="bg-card rounded-xl p-6 shadow space-y-4">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                              <h3 className="text-lg font-semibold flex items-center gap-2">
                                                            <FileText className="w-5 h-5 text-primary" />
                                                            Price Sheet
                                                            <span className="text-sm font-normal text-muted-foreground ml-1">
                                                                            ({(prices ?? [])?.length ?? 0} {(prices ?? [])?.length === 1 ? 'item' : 'items'})
                                                            </span>span>
                                              </h3>h3>
                                    {prices.length > 0 && (
                                <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                                <input
                                                                    type="text"
                                                                    value={priceSearch}
                                                                    onChange={(e) => setPriceSearch(e.target.value)}
                                                                    placeholder="Search items…"
                                                                    className="pl-8 pr-3 py-1.5 text-sm bg-background border border-input rounded-lg focus:ring-2 focus:ring-ring focus:outline-none w-48"
                                                                  />
                                </div>div>
                                              )}
                                  </div>div>
                        
                          {prices.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8 text-sm">
                                            No price data. Upload a price sheet in the Upload Docs module.
                              </p>p>
                            ) : filteredPrices.length === 0 ? (
                              <p className="text-center text-muted-foreground py-6 text-sm">
                                            No items match &ldquo;{priceSearch}&rdquo;.
                              </p>p>
                            ) : (
                              <div className="overflow-x-auto rounded-lg border border-border">
                                            <table className="w-full text-sm">
                                                            <thead>
                                                                              <tr className="text-left text-muted-foreground bg-background border-b border-border text-xs uppercase tracking-wide">
                                                                                                  <th className="py-2.5 px-3">Item / Species</th>th>
                                                                                                  <th className="py-2.5 px-3">{isLumberData ? 'Grade' : 'Unit'}</th>th>
                                                                                {isLumberData && <th className="py-2.5 px-3">Thickness</th>th>}
                                                                                                  <th className="py-2.5 px-3 text-right">Price{isLumberData ? ' /BF' : ''}</th>th>
                                                                                                  <th className="py-2.5 px-3">{isLumberData ? 'Width' : 'SKU / Code'}</th>th>
                                                                              </tr>tr>
                                                            </thead>thead>
                                                            <tbody className="divide-y divide-border">
                                                              {filteredPrices.map((p: PriceEntry) => (
                                                    <tr key={p?.id} className="hover:bg-accent/30 transition-colors">
                                                                          <td className="py-2 px-3 font-medium">{p?.species ?? ''}</td>td>
                                                                          <td className="py-2 px-3 text-muted-foreground">{p?.grade ?? ''}</td>td>
                                                      {isLumberData && (
                                                                              <td className="py-2 px-3 text-muted-foreground">
                                                                                {p.thicknessQuarters > 0 ? `${p.thicknessQuarters}/4` : '—'}
                                                                                </td>td>
                                                                          )}
                                                                          <td className="py-2 px-3 font-medium text-right">
                                                                                                  ${(p?.pricePerBf ?? 0).toFixed(2)}
                                                                          </td>td>
                                                                          <td className="py-2 px-3 text-muted-foreground text-xs">
                                                                            {p?.widthQualifier ?? '—'}
                                                                          </td>td>
                                                    </tr>tr>
                                                  ))}
                                                            </tbody>tbody>
                                            </table>table>
                              </div>div>
                                  )}
                        </div>div>
                </div>div>
              );
  }
  
    // Supplier list view
    return (
          <div className="space-y-6">
                <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                  <Users className="w-6 h-6 text-primary" />
                                  Suppliers
                        </h2>h2>
                        <button
                                    onClick={() => handleOpenForm()}
                                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
                                  >
                                  <Plus className="w-4 h-4" /> Add Supplier
                        </button>button>
                </div>div>
          
            {suppliers.length === 0 ? (
                    <div className="bg-card rounded-xl p-12 shadow text-center text-muted-foreground text-sm">
                              No suppliers yet. Add your first supplier to get started.
                    </div>div>
                  ) : (
                    <div className="grid gap-3">
                      {suppliers.map((s) => (
                                  <button
                                                  key={s.id}
                                                  onClick={() => handleSelectSupplier(s)}
                                                  className="bg-card rounded-xl p-4 shadow text-left hover:ring-2 hover:ring-primary/40 transition-all"
                                                >
                                                <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                                  <div className="bg-primary/10 rounded-lg p-2">
                                                                                                      <Users className="w-5 h-5 text-primary" />
                                                                                    </div>div>
                                                                                  <div>
                                                                                                      <div className="font-semibold">{s.name}</div>div>
                                                                                    {s.contact && <div className="text-xs text-muted-foreground">{s.contact}</div>div>}
                                                                                    </div>div>
                                                                </div>div>
                                                                <div className="text-xs text-muted-foreground text-right">
                                                                  {s.phone && <div>{s.phone}</div>div>}
                                                                  {s.email && <div>{s.email}</div>div>}
                                                                </div>div>
                                                </div>div>
                                  </button>button>
                                ))}
                    </div>div>
                )}
          
            {/* Add/Edit Supplier Form Modal */}
            {showForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                              <div className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                                          <div className="flex items-center justify-between p-6 border-b border-border">
                                                        <h3 className="text-lg font-semibold">{editSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>h3>
                                                        <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                                                                        <X className="w-5 h-5" />
                                                        </button>button>
                                          </div>div>
                                          <div className="p-6 space-y-4">
                                                        <div>
                                                                        <label className="block text-sm font-medium mb-1">Name *</label>label>
                                                                        <input
                                                                                            type="text"
                                                                                            value={formData?.name ?? ''}
                                                                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                                                            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                                                                                          />
                                                        </div>div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                                        <div>
                                                                                          <label className="block text-sm font-medium mb-1">Contact</label>label>
                                                                                          <input
                                                                                                                type="text"
                                                                                                                value={formData?.contact ?? ''}
                                                                                                                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                                                                                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                                                                                                              />
                                                                        </div>div>
                                                                        <div>
                                                                                          <label className="block text-sm font-medium mb-1">Phone</label>label>
                                                                                          <input
                                                                                                                type="text"
                                                                                                                value={formData?.phone ?? ''}
                                                                                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                                                                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                                                                                                              />
                                                                        </div>div>
                                                        </div>div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                                        <div>
                                                                                          <label className="block text-sm font-medium mb-1">Email</label>label>
                                                                                          <input
                                                                                                                type="email"
                                                                                                                value={formData?.email ?? ''}
                                                                                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                                                                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                                                                                                              />
                                                                        </div>div>
                                                                        <div>
                                                                                          <label className="block text-sm font-medium mb-1">Address</label>label>
                                                                                          <input
                                                                                                                type="text"
                                                                                                                value={formData?.address ?? ''}
                                                                                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                                                                                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                                                                                                              />
                                                                        </div>div>
                                                        </div>div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                                        <div>
                                                                                          <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>label>
                                                                                          <div className="relative">
                                                                                                              <input
                                                                                                                                      type="number"
                                                                                                                                      value={formData?.taxRate ?? '0'}
                                                                                                                                      placeholder="0.00%"
                                                                                                                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                                                                                                                                setFormData({ ...formData, taxRate: e.target.value })
                                                                                                                                        }
                                                                                                                                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                                                                                                                                    />
                                                                                            </div>div>
                                                                        </div>div>
                                                                        <div>
                                                                                          <label className="block text-sm font-medium mb-1">Delivery Fee ($)</label>label>
                                                                                          <div className="relative">
                                                                                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">$</span>span>
                                                                                                              <input
                                                                                                                                      type="number"
                                                                                                                                      value={formData?.deliveryFee ?? '0'}
                                                                                                                                      placeholder="0.00"
                                                                                                                                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                                                                                                                                setFormData({ ...formData, deliveryFee: e.target.value })
                                                                                                                                        }
                                                                                                                                      className="w-full bg-background border border-input rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                                                                                                                                    />
                                                                                            </div>div>
                                                                        </div>div>
                                                        </div>div>
                                                        <div className="flex items-end">
                                                                        <label className="flex items-center gap-2 cursor-pointer px-3 py-2">
                                                                                          <input
                                                                                                                type="checkbox"
                                                                                                                checked={formData?.taxExempt ?? false}
                                                                                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                                                                                                        setFormData({ ...formData, taxExempt: e.target.checked })
                                                                                                                  }
                                                                                                              />
                                                                                          <span className="text-sm">Tax Exempt</span>span>
                                                                        </label>label>
                                                        </div>div>
                                                        <div>
                                                                        <label className="block text-sm font-medium mb-1">Notes</label>label>
                                                                        <textarea
                                                                                            value={formData?.notes ?? ''}
                                                                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                                                                                                  setFormData({ ...formData, notes: e.target.value })
                                                                                              }
                                                                                            rows={3}
                                                                                            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-none"
                                                                                          />
                                                        </div>div>
                                                        <div className="flex gap-3 pt-2">
                                                                        <button onClick={handleSaveSupplier} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-90 flex-1">
                                                                                          Save
                                                                        </button>button>
                                                                        <button onClick={() => setShowForm(false)} className="bg-secondary text-secondary-foreground px-6 py-2 rounded-lg font-medium hover:opacity-80">
                                                                                          Cancel
                                                                        </button>button>
                                                        </div>div>
                                          </div>div>
                              </div>div>
                    </div>div>
                )}
          </div>div>
        );
}</div>
