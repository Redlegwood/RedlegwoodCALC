export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { parsePriceSheet } from '@/lib/parsePriceSheet';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
          const formData = await request.formData();
          const file = formData.get('file') as File | null;
          const supplierIdStr = formData.get('supplier_id') as string | null;
          const docIdStr = formData.get('doc_id') as string | null;
          // When true (default), automatically parse the document into price_sheets after upload
      const autoParse = formData.get('auto_parse') !== 'false';

      if (!file) {
              return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

  const ACCEPTED_TYPES = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','image/jpeg','image/png','image/gif','image/webp','image/svg+xml'];
          if (!ACCEPTED_TYPES.includes(file.type)) {
                  return NextResponse.json({ error: 'Unsupported file type. Accepted: PDF, Word, Excel, CSV, and images' }, { status: 400 });
          }

      if (file.size > 20 * 1024 * 1024) {
              return NextResponse.json({ error: 'File too large. Max 20MB.' }, { status: 400 });
      }

      // Determine supplierId — either from the form, or looked up from existing doc
      let supplierId: number;
          let supplierName: string;

      const docId = docIdStr ? parseInt(docIdStr) : null;

      if (docId) {
              // Replace mode: look up the existing document to get supplier info
            const existingDoc = await prisma.uploadedDocument.findUnique({ where: { id: docId } });
              if (!existingDoc) {
                        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
              }
              supplierId = existingDoc.supplierId;
              supplierName = existingDoc.supplierName;
      } else {
              // New upload mode: supplier_id is required
            supplierId = parseInt(supplierIdStr ?? '0');
              if (!supplierId) {
                        return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
              }
              const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
              if (!supplier) {
                        return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
              }
              supplierName = supplier.name ?? 'Unknown Supplier';
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
              return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
      }

      const safeFileName = `${supplierId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const fileBuffer = await file.arrayBuffer();

      const storageResp = await fetch(`${supabaseUrl}/storage/v1/object/price-sheets/${safeFileName}`,
                                      {
                                                method: 'POST',
                                                headers: {
                                                            'Authorization': `Bearer ${supabaseKey}`,
                                                            'Content-Type': file.type,
                                                            'x-upsert': 'true',
                                                },
                                                body: fileBuffer,
                                      });

      if (!storageResp.ok) {
              const errText = await storageResp.text();
              console.error('Supabase storage upload failed:', errText);
              return NextResponse.json({ error: 'Failed to upload file to storage' }, { status: 500 });
      }

      const fileUrl = `${supabaseUrl}/storage/v1/object/public/price-sheets/${safeFileName}`;

      let uploadedDocId: number;

      if (docId) {
              // Update the existing document record
            await prisma.uploadedDocument.update({
                      where: { id: docId },
                      data: {
                                  fileName: file.name,
                                  fileUrl,
                                  uploadedAt: new Date(),
                                  // Reset parse stats until re-parsed
                                  inserted: 0,
                                  updated: 0,
                                  total: 0,
                      },
            });
              uploadedDocId = docId;
      } else {
              // Create a new document record
            const newDoc = await prisma.uploadedDocument.create({
                      data: {
                                  supplierId,
                                  supplierName,
                                  fileName: file.name,
                                  inserted: 0,
                                  updated: 0,
                                  total: 0,
                                  fileUrl,
                      },
            });
              uploadedDocId = newDoc.id;
      }

      // -----------------------------------------------------------------------
      // Auto-parse: attempt to extract price data into price_sheets table.
      // Parsing is best-effort — a parse failure does NOT fail the upload.
      // CSV/TSV/Excel files will be parsed; PDFs and images will be skipped.
      // -----------------------------------------------------------------------
      let parseResult: { inserted: number; updated: number; total: number; errors: string[] } | null = null;

      const parseableExtensions = ['.csv', '.tsv', '.xlsx', '.xls'];
          const lowerName = file.name.toLowerCase();
          const isParseableFile = parseableExtensions.some((ext) => lowerName.endsWith(ext));

      if (autoParse && isParseableFile) {
              try {
                        parseResult = await parsePriceSheet({
                                    supplierId,
                                    documentId: uploadedDocId,
                                    fileUrl,
                                    fileName: file.name,
                        });

                // Update document record with parse stats
                await prisma.uploadedDocument.update({
                            where: { id: uploadedDocId },
                            data: {
                                          inserted: parseResult.inserted,
                                          updated: parseResult.updated,
                                          total: parseResult.total,
                            },
                });
              } catch (parseErr: any) {
                        console.error('Auto-parse failed (non-fatal):', parseErr?.message);
                        // Parse errors are non-fatal; upload still succeeded
                parseResult = { inserted: 0, updated: 0, total: 0, errors: [parseErr?.message ?? 'Parse failed'] };
              }
      }

      return NextResponse.json({
              success: true,
              fileUrl,
              fileName: file.name,
              documentId: uploadedDocId,
              parse: parseResult,
      });

    } catch (error: any) {
          console.error('Upload error:', error);
          return NextResponse.json({ error: error?.message ?? 'Upload failed' }, { status: 500 });
    }
}
