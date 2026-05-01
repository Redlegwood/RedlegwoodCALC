/**
 * GET /api/price-sheets
 *
 * Returns all price-sheet rows from the database, optionally filtered by
 * supplierId.  This endpoint is the single shared source of truth used by
 * all tabs (Suppliers, Calculator, Estimator, Projects, etc.).
 *
 * Query parameters:
 *   supplierId  (optional) – filter rows to a single supplier
 *   species     (optional) – filter by species (case-insensitive prefix match)
 *   grade       (optional) – filter by grade (exact, case-insensitive)
 *
 * Response shape:
 *   Array of PriceSheet rows including supplier name for display purposes.
 */

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
          const { searchParams } = request.nextUrl;
          const supplierIdParam = searchParams.get('supplierId');
          const speciesParam = searchParams.get('species');
          const gradeParam = searchParams.get('grade');

          const where: Record<string, unknown> = {};

          if (supplierIdParam) {
                  const supplierId = parseInt(supplierIdParam, 10);
                  if (!isNaN(supplierId)) {
                            where.supplierId = supplierId;
                          }
                }

          if (speciesParam) {
                  where.species = {
                            contains: speciesParam,
                            mode: 'insensitive',
                          };
                }

          if (gradeParam) {
                  where.grade = {
                            equals: gradeParam,
                            mode: 'insensitive',
                          };
                }

          const priceSheets = await prisma.priceSheet.findMany({
                  where,
                  orderBy: [
                            { supplier: { name: 'asc' } },
                            { species: 'asc' },
                            { grade: 'asc' },
                            { thicknessQuarters: 'asc' },
                          ],
                  include: {
                            supplier: {
                                        select: {
                                                      id: true,
                                                      name: true,
                                                      taxRate: true,
                                                      taxExempt: true,
                                                      deliveryFee: true,
                                                    },
                                      },
                          },
                });

          return NextResponse.json(priceSheets);
        } catch (error: any) {
          console.error('Failed to fetch price sheets:', error);
          return NextResponse.json(
                  { error: error?.message ?? 'Failed to fetch price sheets' },
                  { status: 500 }
                );
        }
  }
