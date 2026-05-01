import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parsePriceSheet } from '@/lib/parsePriceSheet';

export const dynamic = 'force-dynamic';

export async function POST(
    _req: Request,
    { params }: { params: { id: string } }
  ) {
    const id = Number(params.id);
    if (!id || isNaN(id)) {
          return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
        }

    try {
          const doc = await prisma.uploadedDocument.findUnique({ where: { id } });
          if (!doc) {
                  return NextResponse.json({ error: 'Document not found' }, { status: 404 });
                }
          if (!doc.fileUrl) {
                  return NextResponse.json({ error: 'Document has no file URL to parse' }, { status: 400 });
                }

          const result = await parsePriceSheet({
                  supplierId: doc.supplierId,
                  documentId: doc.id,
                  fileUrl: doc.fileUrl,
                  fileName: doc.fileName,
                });

          // Update the document record with parse stats
          await prisma.uploadedDocument.update({
                  where: { id },
                  data: {
                            inserted: result.inserted,
                            updated: result.updated,
                            total: result.total,
                          },
                });

          return NextResponse.json({
                  success: true,
                  inserted: result.inserted,
                  updated: result.updated,
                  total: result.total,
                  errors: result.errors,
                });
        } catch (err: any) {
          console.error('Parse document error:', err);
          return NextResponse.json(
                  { error: err?.message ?? 'Failed to parse document' },
                  { status: 500 }
                );
        }
  }
