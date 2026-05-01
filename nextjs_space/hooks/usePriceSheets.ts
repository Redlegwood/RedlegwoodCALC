/**
 * usePriceSheets.ts
 *
 * React hook that fetches price-sheet data from /api/price-sheets and
 * makes it available to any tab component in the app.
 *
 * Usage:
 *   const { priceSheets, loading, error, refetch } = usePriceSheets();
 *
 * With filters:
 *   const { priceSheets } = usePriceSheets({ supplierId: 3 });
 *   const { priceSheets } = usePriceSheets({ species: 'maple' });
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Types (mirrors the Prisma PriceSheet model + included supplier)
// ---------------------------------------------------------------------------

export interface PriceSheetSupplier {
    id: number;
    name: string;
    taxRate: number;
    taxExempt: boolean;
    deliveryFee: number;
}

export interface PriceSheet {
    id: number;
    supplierId: number;
    species: string;
    grade: string;
    thicknessQuarters: number;
    pricePerBf: number;
    widthQualifier: string | null;
    updatedAt: string;
    supplier: PriceSheetSupplier;
}

// ---------------------------------------------------------------------------
// Filter options
// ---------------------------------------------------------------------------

export interface UsePriceSheetsOptions {
    supplierId?: number;
    species?: string;
    grade?: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePriceSheets(options: UsePriceSheetsOptions = {}) {
    const [priceSheets, setPriceSheets] = useState<PriceSheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);

                                    try {
                                            const params = new URLSearchParams();
                                            if (options.supplierId !== undefined) {
                                                      params.set('supplierId', String(options.supplierId));
                                            }
                                            if (options.species) {
                                                      params.set('species', options.species);
                                            }
                                            if (options.grade) {
                                                      params.set('grade', options.grade);
                                            }

          const qs = params.toString();
                                            const url = `/api/price-sheets${qs ? `?${qs}` : ''}`;
                                            const resp = await fetch(url);
                                            if (!resp.ok) {
                                                      const body = await resp.json().catch(() => ({}));
                                                      throw new Error(body?.error ?? `Request failed with status ${resp.status}`);
                                            }
                                            const data: PriceSheet[] = await resp.json();
                                            setPriceSheets(data);
                                    } catch (err: any) {
                                            setError(err?.message ?? 'Failed to load price sheets');
                                    } finally {
                                            setLoading(false);
                                    }
  }, [options.supplierId, options.species, options.grade]);

  useEffect(() => {
        fetchData();
  }, [fetchData]);

  return { priceSheets, loading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// Convenience helper: look up a single price given supplier + species + grade
// ---------------------------------------------------------------------------

export function lookupPrice(
    priceSheets: PriceSheet[],
    supplierId: number,
    species: string,
    grade: string,
    thicknessQuarters: number,
    widthQualifier?: string | null
  ): number | null {
    const row = priceSheets.find(
          (p) =>
                  p.supplierId === supplierId &&
                  p.species.toLowerCase() === species.toLowerCase() &&
                  p.grade.toLowerCase() === grade.toLowerCase() &&
                  p.thicknessQuarters === thicknessQuarters &&
                  (widthQualifier === undefined || p.widthQualifier === (widthQualifier ?? null))
        );
    return row?.pricePerBf ?? null;
}
