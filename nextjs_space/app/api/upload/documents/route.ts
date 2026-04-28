import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const docs = await prisma.uploadedDocument.findMany({
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        supplierId: true,
        supplierName: true,
        fileName: true,
        uploadedAt: true,
        inserted: true,
        updated: true,
        total: true,
        fileUrl: true,
      },
    });

    return NextResponse.json(docs);
  } catch (error: any) {
    console.error('Failed to fetch uploaded documents:', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
