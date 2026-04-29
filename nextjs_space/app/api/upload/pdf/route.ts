export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const supplierIdStr = formData.get('supplier_id') as string | null;
    const docIdStr = formData.get('doc_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
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
          'Content-Type': 'application/pdf',
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

    if (docId) {
      // Update the existing document record
      await prisma.uploadedDocument.update({
        where: { id: docId },
        data: {
          fileName: file.name,
          fileUrl,
          uploadedAt: new Date(),
        },
      });
    } else {
      // Create a new document record
      await prisma.uploadedDocument.create({
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
    }

    return NextResponse.json({ success: true, fileUrl, fileName: file.name });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error?.message ?? 'Upload failed' }, { status: 500 });
  }
}
