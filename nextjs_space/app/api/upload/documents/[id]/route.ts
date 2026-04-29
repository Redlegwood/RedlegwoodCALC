import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
  }
  try {
    await prisma.uploadedDocument.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Delete document error:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Failed to delete document' },
      { status: 500 }
    );
  }
}
