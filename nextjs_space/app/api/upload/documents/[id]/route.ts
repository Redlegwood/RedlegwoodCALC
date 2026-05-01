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
    // Fetch the document first so we can get its Supabase storage path
    const doc = await prisma.uploadedDocument.findUnique({ where: { id } });

    // Delete from Supabase storage if we have a fileUrl
    if (doc?.fileUrl) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
      if (supabaseUrl && supabaseKey) {
        // Extract storage path from the public URL
        // fileUrl looks like: {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
        const publicPrefix = `${supabaseUrl}/storage/v1/object/public/`;
        const storagePath = doc.fileUrl.startsWith(publicPrefix)
          ? doc.fileUrl.slice(publicPrefix.length)
          : null;
        if (storagePath) {
          // storagePath is '{bucket}/{filePath}', e.g. 'price-sheets/1/1234-file.pdf'
          const slashIdx = storagePath.indexOf('/');
          const bucket = storagePath.slice(0, slashIdx);
          const filePath = storagePath.slice(slashIdx + 1);
          const deleteResp = await fetch(
            `${supabaseUrl}/storage/v1/object/${bucket}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ prefixes: [filePath] }),
            }
          );
          if (!deleteResp.ok) {
            const errText = await deleteResp.text();
            console.error('Supabase storage delete failed:', errText);
            // Continue to delete the DB record even if storage delete fails
          }
        }
      }
    }

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
