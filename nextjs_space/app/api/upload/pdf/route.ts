export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const SPECIES_NORMALIZATION: Record<string, string> = {
  'w.oak': 'White Oak',
  'w. oak': 'White Oak',
  'white oak': 'White Oak',
  'oak, white': 'White Oak',
  'r.oak': 'Red Oak',
  'r. oak': 'Red Oak',
  'red oak': 'Red Oak',
  'oak, red': 'Red Oak',
  'w.walnut': 'Black Walnut',
  'b.walnut': 'Black Walnut',
  'b. walnut': 'Black Walnut',
  'blk walnut': 'Black Walnut',
  'blk. walnut': 'Black Walnut',
  'black walnut': 'Black Walnut',
  'walnut, black': 'Black Walnut',
  'walnut': 'Black Walnut',
  'amer. cherry': 'American Cherry',
  'am. cherry': 'American Cherry',
  'a. cherry': 'American Cherry',
  'american cherry': 'American Cherry',
  'cherry, american': 'American Cherry',
  'cherry': 'Cherry',
  'y. poplar': 'Yellow Poplar',
  'y.poplar': 'Yellow Poplar',
  'yellow poplar': 'Yellow Poplar',
  'poplar, yellow': 'Yellow Poplar',
  'poplar': 'Poplar',
  'h. maple': 'Hard Maple',
  'h.maple': 'Hard Maple',
  'hard maple': 'Hard Maple',
  'maple, hard': 'Hard Maple',
  's. maple': 'Soft Maple',
  's.maple': 'Soft Maple',
  'soft maple': 'Soft Maple',
  'maple, soft': 'Soft Maple',
  'wh. ash': 'White Ash',
  'w.ash': 'White Ash',
  'w. ash': 'White Ash',
  'white ash': 'White Ash',
  'ash, white': 'White Ash',
  'ash': 'Ash',
  'cypress': 'Cypress',
  'hickory': 'Hickory',
  'sassafras': 'Sassafras',
  'sapele': 'Sapele',
  'teak': 'Teak',
  'spanish cedar': 'Spanish Cedar',
  'cedar, spanish': 'Spanish Cedar',
  'genuine mahogany': 'Genuine Mahogany',
  'mahogany, genuine': 'Genuine Mahogany',
  'mahogany': 'Mahogany',
  'african mahogany': 'African Mahogany',
  'mahogany, african': 'African Mahogany',
  'santos mahogany': 'Santos Mahogany',
  'bloodwood': 'Bloodwood',
  'purpleheart': 'Purpleheart',
  'purple heart': 'Purpleheart',
  'wenge': 'Wenge',
  'zebrawood': 'Zebrawood',
  'padauk': 'Padauk',
  'bubinga': 'Bubinga',
  'ipe': 'Ipe',
  'jatoba': 'Jatoba',
  'cumaru': 'Cumaru',
  'tigerwood': 'Tigerwood',
  'lacewood': 'Lacewood',
  'leopardwood': 'Leopardwood',
  'bocote': 'Bocote',
  'cocobolo': 'Cocobolo',
  'figured maple': 'Figured Maple',
  'curly maple': 'Curly Maple',
  'birds eye maple': 'Birds Eye Maple',
  'birdseye maple': 'Birds Eye Maple',
};

function normalizeSpecies(raw: string): string {
  const lower = (raw ?? '').trim().toLowerCase();
  for (const [abbr, full] of Object.entries(SPECIES_NORMALIZATION)) {
    if (lower === abbr.toLowerCase()) return full;
  }
  // Title case the raw species
  return (raw ?? '').trim().replace(/\b\w/g, (c: string) => c?.toUpperCase?.() ?? '');
}

function normalizeGrade(raw: string): string {
  return (raw ?? '').trim().toUpperCase();
}

function parseThickness(raw: string): number {
  const cleaned = (raw ?? '').trim().replace(/[^0-9\/]/g, '');
  const match = cleaned?.match?.(/^(\d+)\/(\d+)$/);
  if (match) {
    return parseInt(match[1] ?? '4');
  }
  const num = parseInt(cleaned);
  return isNaN(num) ? 4 : num;
}

interface PriceEntry {
  species: string;
  grade: string;
  thickness_quarters: number;
  price_per_bf: number;
  width_qualifier: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const supplierIdStr = formData.get('supplier_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file?.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
    }

    if ((file?.size ?? 0) > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 20MB.' }, { status: 400 });
    }

    const supplierId = parseInt(supplierIdStr ?? '0');
    if (!supplierId) {
      return NextResponse.json({ error: 'Supplier ID is required' }, { status: 400 });
    }

    // Check supplier exists
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Read file as base64 for LLM
    const buffer = await file.arrayBuffer();
    const base64String = Buffer.from(buffer).toString('base64');

    // Send to LLM for parsing
    const apiKey = process.env.ABACUSAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const llmResponse = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'file',
                file: {
                  filename: file?.name ?? 'document.pdf',
                  file_data: `data:application/pdf;base64,${base64String}`,
                },
              },
              {
                type: 'text',
                text: `You are a lumber price sheet parser. Extract ALL species, grades, thicknesses, and prices from this hardwood lumber price sheet PDF.

CRITICAL RULES:
1. This PDF is a SINGLE-COLUMN layout. Read top to bottom.
2. Species names may be in "LAST, FIRST" format (e.g., "OAK, WHITE") — normalize to "First Last" (e.g., "White Oak"). Also handle abbreviated forms like "W.Oak", "R.Oak", "Blk Walnut", etc.
3. DITTO MARKS: A quotation mark (") or ditto mark in the species column means "same species as the row immediately above". Resolve ALL ditto marks to the actual species name. Do NOT output '"' or 'ditto' as a species — always resolve to the full species name.
4. Lines starting with * (asterisk) are valid entries — strip the asterisk and parse normally.
5. Thickness is in quarters format like "4/4", "5/4", "6/4", "8/4" etc. Extract the numerator as quarters (e.g., 4/4 → 4, 8/4 → 8).
6. Prices are per board foot ($/BF). Parse the dollar amount as a float.
7. WIDTH QUALIFIERS: Some rows may have width notes like "7+ wide", "6+ wide", "8/4+ wide" — capture these in the width_qualifier field. If no width qualifier, set to null.
8. Grade examples: FAS, FEQ, SEL, #1C, #2C, #1, #2, SELECT, PRIME, etc.
9. Skip date headers, section headers, and non-price rows (e.g., "ROUGH LUMBER PRICE LIST", "Effective 01/15/2025", "DOMESTIC HARDWOODS", etc.)
10. Extract EVERY price entry — do not skip, summarize, or truncate. There may be 100+ entries.

Respond with raw JSON only. No code blocks, no markdown, no explanation.
Return a JSON array of objects with this exact structure:
[
  {
    "species": "Species Name",
    "grade": "GRADE",
    "thickness": "4/4",
    "price": 12.50,
    "width_qualifier": null
  }
]

Ensure ALL entries from the PDF are included.`,
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
                max_tokens: file.size < 200 * 1024 ? 4000 : file.size < 1024 * 1024 ? 8000 : 16000,
        temperature: 0,
      }),
    });

    if (!llmResponse?.ok) {
      const errText = await llmResponse?.text?.() ?? 'Unknown LLM error';
      console.error('LLM error:', llmResponse?.status, errText);
      let userMessage = 'Failed to parse PDF with LLM';
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.error?.includes?.('credits')) {
          userMessage = 'LLM API credits exhausted. Please check your API key balance.';
        } else if (errJson?.error) {
          userMessage = `LLM error: ${errJson.error}`;
        }
      } catch { /* not JSON */ }
      return NextResponse.json({ error: userMessage }, { status: 500 });
    }

    const llmData = await llmResponse.json();
    const content = llmData?.choices?.[0]?.message?.content ?? '[]';

    let parsedEntries: any[] = [];
    try {
      const parsed = JSON.parse(content);
      // Handle both array and { entries: [...] } or { data: [...] } etc.
      if (Array.isArray(parsed)) {
        parsedEntries = parsed;
      } else if (parsed?.entries && Array.isArray(parsed.entries)) {
        parsedEntries = parsed.entries;
      } else if (parsed?.data && Array.isArray(parsed.data)) {
        parsedEntries = parsed.data;
      } else if (parsed?.prices && Array.isArray(parsed.prices)) {
        parsedEntries = parsed.prices;
      } else if (parsed?.items && Array.isArray(parsed.items)) {
        parsedEntries = parsed.items;
      } else {
        // Try to find any array value
        const keys = Object.keys(parsed ?? {});
        for (const key of keys) {
          if (Array.isArray(parsed[key])) {
            parsedEntries = parsed[key];
            break;
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse LLM response:', e);
      return NextResponse.json({ error: 'Failed to parse LLM response' }, { status: 500 });
    }

    // Post-process: resolve any remaining ditto marks the LLM may have missed
    let lastSpecies = '';
    for (let i = 0; i < parsedEntries.length; i++) {
      const entry = parsedEntries[i];
      const sp = (entry?.species ?? '').trim();
      if (sp === '"' || sp === '""' || sp.toLowerCase() === 'ditto' || sp === '' || sp === '"') {
        parsedEntries[i].species = lastSpecies;
      } else {
        // Strip leading asterisk
        parsedEntries[i].species = sp.replace(/^\*\s*/, '');
        lastSpecies = parsedEntries[i].species;
      }
    }

    // Process and upsert price entries
    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const entry of parsedEntries) {
      try {
        const species = normalizeSpecies(entry?.species ?? '');
        const grade = normalizeGrade(entry?.grade ?? '');
        const thicknessQuarters = parseThickness(entry?.thickness ?? '4/4');
        const pricePerBf = parseFloat(String(entry?.price ?? entry?.price_per_bf ?? 0));
        const widthQualifier = entry?.width_qualifier ?? null;

        if (!species || !grade || !pricePerBf || pricePerBf <= 0) {
          continue;
        }

        // Try to find existing
        const existing = await prisma.priceSheet.findFirst({
          where: {
            supplierId,
            species: { equals: species, mode: 'insensitive' },
            grade: { equals: grade, mode: 'insensitive' },
            thicknessQuarters,
            widthQualifier: widthQualifier ?? null,
          },
        });

        if (existing) {
          await prisma.priceSheet.update({
            where: { id: existing.id },
            data: { pricePerBf, species, grade },
          });
          updated++;
        } else {
          await prisma.priceSheet.create({
            data: {
              supplierId,
              species,
              grade,
              thicknessQuarters,
              pricePerBf,
              widthQualifier,
            },
          });
          inserted++;
        }
      } catch (err: any) {
        errors.push(err?.message ?? 'Unknown error for entry');
      }
    }

    // Save upload record to database
    await prisma.uploadedDocument.create({
      data: {
        supplierId,
        supplierName: supplier?.name ?? 'Unknown Supplier',
        fileName: file?.name ?? 'document.pdf',
        inserted,
        updated,
        total: parsedEntries?.length ?? 0,
      },
    }).catch((err: any) => console.error('Failed to save upload record:', err));

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      removed: 0,
      total: parsedEntries?.length ?? 0,
      errors,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error?.message ?? 'Upload failed' }, { status: 500 });
  }
}
