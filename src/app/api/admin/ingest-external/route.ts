import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { parsePDF } from '@/lib/pdfParser';
import { chunkText } from '@/lib/chunking';
import { storeChunks, createDocument, markDocumentCompleted, markDocumentFailed, updateDocument } from '@/lib/database';

async function getSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title = 'External Ingest', files = [], sourceUrl = '' } = body || {};
    if (!Array.isArray(files) || files.length === 0) return NextResponse.json({ message: 'No files provided' }, { status: 400 });

    const document = await createDocument({
      source_type: 'external',
      source_url: sourceUrl || 'external',
      title,
      created_by: session.user.id,
    } as any);

    try {
      let allChunks: any[] = [];
      let totalTokens = 0;

      for (const f of files) {
        const url: string = f.url;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const arrayBuf = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const parsed = await parsePDF(buf, f.name || url.split('/').pop() || 'document.pdf');
        const chunks = chunkText(parsed.text, { maxTokens: 500, overlap: 50 });
        chunks.forEach((c, idx) => {
          allChunks.push({
            ...c,
            index: allChunks.length + idx,
            metadata: { ...c.metadata, source_url: url, source_type: 'pdf', pdf_title: parsed.title, pdf_pages: parsed.pages }
          });
          totalTokens += c.tokens;
        });
      }

      if (allChunks.length > 0) await storeChunks(document.id, allChunks);
      await updateDocument(document.id, { title } as any);
      await markDocumentCompleted(document.id, allChunks.length, totalTokens);
      return NextResponse.json({ message: 'Ingested', chunks: allChunks.length });
    } catch (e) {
      await markDocumentFailed(document.id, e instanceof Error ? e.message : 'Failed');
      throw e;
    }
  } catch (e) {
    console.error('ingest-external error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}



