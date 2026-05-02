/**
 * parsePriceSheet.ts
 *
 * Parses an uploaded supplier document (CSV, Excel, or text-based price sheet)
 * and upserts the extracted rows into the `price_sheets` table via Prisma.
 *
 * Supports two document modes (auto-detected):
 *
 * MODE 1 – Lumber / hardwood format (all three required columns found):
 *   species   – wood species name  (e.g. "Hard Maple", "Red Oak")
 *   grade     – lumber grade       (e.g. "FAS", "Select", "#1 Common")
 *   thickness – board thickness    (e.g. "4/4", "8/4", or integer 4)
 *   price     – price per BF       (e.g. "4.75")
 *   width_qualifier – optional     (e.g. '6"&up')
 *
 * MODE 2 – Generic supplier price list (fallback when lumber columns absent):
 *   item / description / name / product  → stored as `species`
 *   sku / code / part / part_no / item_no → stored as `widthQualifier`
 *   unit / uom / each / per              → stored as `grade`
 *   price / cost / rate / unit_price     → stored as `pricePerBf`
 *   thicknessQuarters is stored as 0 in generic mode to satisfy the schema.
 *
 * The parser is deliberately lenient: rows with missing required fields are
 * skipped and reported in the `errors` array returned to the caller.
 */

import { prisma } from '@/lib/prisma';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsePriceSheetOptions {
   supplierId: number;
   documentId: number;
   fileUrl: string;
   fileName: string;
}

export interface ParsePriceSheetResult {
   inserted: number;
   updated: number;
   total: number;
   skipped: number;
   errors: string[];
   mode: 'lumber' | 'generic';
}

interface RawRow {
   [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Column-name alias tables  (all lower-cased for matching)
// ---------------------------------------------------------------------------

const SPECIES_ALIASES   = ['species', 'wood species', 'wood', 'item', 'description', 'name', 'product', 'product name', 'material'];
const GRADE_ALIASES     = ['grade', 'quality', 'grading'];
const THICKNESS_ALIASES = ['thickness', 'thick', 'thk', 'thickness (quarters)', 'quarters', 'thick (qtrs)'];
const PRICE_ALIASES     = ['price', 'price/bf', 'price per bf', 'unit price', 'cost', '$/bf', 'rate', 'price/unit', 'list price', 'sell price'];
const WIDTH_ALIASES     = ['width qualifier', 'width_qualifier', 'width', 'widths', 'width note'];

// Generic-mode aliases
const ITEM_ALIASES      = ['item', 'description', 'name', 'product', 'product name', 'material', 'species', 'wood species'];
const SKU_ALIASES       = ['sku', 'code', 'part', 'part no', 'part_no', 'item no', 'item_no', 'item #', 'part #', 'product code', 'model', 'upc'];
const UNIT_ALIASES      = ['unit', 'uom', 'each', 'per', 'unit of measure', 'sell unit', 'price unit'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findCol(headers: string[], aliases: string[]): string | undefined {
   const lower = aliases.map((a) => a.toLowerCase());
   return headers.find((h) => lower.includes(h.toLowerCase().trim()));
}

/** Normalise "4/4", "8/4", "4" → integer quarters.  Returns null if unparseable. */
function parseThickness(raw: string | number | undefined): number | null {
   if (raw === undefined || raw === null || raw === '') return null;
   const s = String(raw).trim();
   const fracMatch = s.match(/^(\d+)\s*\/\s*4$/);
   if (fracMatch) return parseInt(fracMatch[1], 10);
   const num = parseInt(s, 10);
   if (!isNaN(num) && num > 0) return num;
   return null;
}

/** Strip $, commas, whitespace and return a float.  Returns null if unparseable. */
function parsePrice(raw: string | number | undefined): number | null {
   if (raw === undefined || raw === null || raw === '') return null;
   const s = String(raw).replace(/[$,\s]/g, '');
   const n = parseFloat(s);
   return isNaN(n) ? null : n;
}

/** Title-case a string: "hard maple" → "Hard Maple" */
function toTitleCase(s: string): string {
   return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// ---------------------------------------------------------------------------
// CSV / TSV parser (handles RFC-4180 quoting)
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
   const result: string[] = [];
   let current = '';
   let inQuotes = false;
   for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
               if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
               else { inQuotes = !inQuotes; }
        } else if ((ch === ',' || ch === '\t') && !inQuotes) {
               result.push(current); current = '';
        } else {
               current += ch;
        }
   }
   result.push(current);
   return result;
}

function csvToRows(text: string): RawRow[] {
   const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
   if (lines.length < 2) return [];
   const headers = parseCSVLine(lines[0]).map((h) => h.trim());
   const rows: RawRow[] = [];
   for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.every(v => v.trim() === '')) continue; // skip blank rows
     const row: RawRow = {};
        headers.forEach((h, idx) => { row[h] = values[idx]?.trim() ?? ''; });
        rows.push(row);
   }
   return rows;
}

// ---------------------------------------------------------------------------
// Excel parser
// ---------------------------------------------------------------------------

async function excelToRows(buffer: ArrayBuffer): Promise<RawRow[]> {
   try {
        const XLSX = await import('xlsx' as any);
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return [];
        const sheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(sheet, { defval: '' }) as RawRow[];
   } catch {
        throw new Error(
               'Failed to parse Excel file. Make sure the `xlsx` package is installed (`npm install xlsx`).'
             );
   }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function parsePriceSheet(
   opts: ParsePriceSheetOptions
 ): Promise<ParsePriceSheetResult> {
   const { supplierId, fileUrl, fileName } = opts;

  // 1. Download the file
  const resp = await fetch(fileUrl);
   if (!resp.ok) {
        throw new Error(`Failed to download document: ${resp.status} ${resp.statusText}`);
   }

  const buffer = await resp.arrayBuffer();
   const lowerName = fileName.toLowerCase();

  // 2. Parse into raw rows
  let rawRows: RawRow[] = [];

  if (lowerName.endsWith('.csv') || lowerName.endsWith('.tsv')) {
       rawRows = csvToRows(new TextDecoder().decode(buffer));
  } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
       rawRows = await excelToRows(buffer);
  } else {
       // Last resort: try as CSV
     rawRows = csvToRows(new TextDecoder().decode(buffer));
       if (rawRows.length === 0) {
              throw new Error(`Unsupported file format: ${fileName}. Please upload a CSV or Excel file.`);
       }
  }

  if (rawRows.length === 0) {
       return { inserted: 0, updated: 0, total: 0, skipped: 0, errors: ['No data rows found in document.'], mode: 'generic' };
  }

  // 3. Identify columns
  const headers = Object.keys(rawRows[0]);

  const speciesCol   = findCol(headers, SPECIES_ALIASES);
   const gradeCol     = findCol(headers, GRADE_ALIASES);
   const thicknessCol = findCol(headers, THICKNESS_ALIASES);
   const priceCol     = findCol(headers, PRICE_ALIASES);
   const widthCol     = findCol(headers, WIDTH_ALIASES);

  // Generic-mode columns
  const itemCol = findCol(headers, ITEM_ALIASES);
   const skuCol  = findCol(headers, SKU_ALIASES);
   const unitCol = findCol(headers, UNIT_ALIASES);

  // Determine parsing mode:
  // Lumber mode requires species + thickness + price.
  // Generic mode requires item + price.
  const isLumberMode = !!(speciesCol && thicknessCol && priceCol);
   const isGenericMode = !isLumberMode && !!(itemCol && priceCol);

  if (!isLumberMode && !isGenericMode) {
       // Build helpful error message
     const missing: string[] = [];
       if (!speciesCol && !itemCol) missing.push('item/description');
       if (!priceCol) missing.push('price/cost');
       throw new Error(
              `Required columns not found. Missing: ${missing.join(', ')}. ` +
              `Available columns: ${headers.join(', ')}`
            );
  }

  const mode: 'lumber' | 'generic' = isLumberMode ? 'lumber' : 'generic';

  // 4. Process rows
  let inserted = 0;
   let updated  = 0;
   let skipped  = 0;
   const errors: string[] = [];

  for (let i = 0; i < rawRows.length; i++) {
       const row    = rawRows[i];
       const rowNum = i + 2; // 1-indexed, +1 for header

     let species: string;
       let grade: string;
       let thicknessQuarters: number;
       let pricePerBf: number | null;
       let widthQualifier: string | null;

     if (isLumberMode) {
            // ── Lumber mode ────────────────────────────────────────────────────────
         species = toTitleCase(String(row[speciesCol!] ?? '').trim());
            grade   = gradeCol ? String(row[gradeCol] ?? '').trim() || 'Unknown' : 'Unknown';
            const thicknessRaw = row[thicknessCol!];
            const parsed = parseThickness(thicknessRaw as string | number);
            if (!species) {
                     errors.push(`Row ${rowNum}: skipped – species is empty.`); skipped++; continue;
            }
            if (parsed === null) {
                     errors.push(`Row ${rowNum}: skipped – invalid thickness "${thicknessRaw}".`); skipped++; continue;
            }
            thicknessQuarters = parsed;
            pricePerBf        = parsePrice(row[priceCol!] as string | number);
            widthQualifier    = widthCol ? String(row[widthCol] ?? '').trim() || null : null;
     } else {
            // ── Generic mode ───────────────────────────────────────────────────────
         species = toTitleCase(String(row[itemCol!] ?? '').trim());
            grade   = unitCol ? String(row[unitCol] ?? '').trim() || 'ea' : 'ea';
            thicknessQuarters = 0; // not applicable for generic items
         pricePerBf        = parsePrice(row[priceCol!] as string | number);
            widthQualifier    = skuCol ? String(row[skuCol] ?? '').trim() || null : null;
     }

     if (!species) {
            errors.push(`Row ${rowNum}: skipped – item name is empty.`); skipped++; continue;
     }
       if (pricePerBf === null) {
              errors.push(`Row ${rowNum}: skipped – invalid price "${row[priceCol!]}".`); skipped++; continue;
       }

     // 5. Upsert
     try {
            const existing = await prisma.priceSheet.findFirst({
                     where: { supplierId, species, grade, thicknessQuarters, widthQualifier: widthQualifier ?? null },
            });

         if (existing) {
                  await prisma.priceSheet.update({
                             where: { id: existing.id },
                             data:  { pricePerBf },
                  });
                  updated++;
         } else {
                  await prisma.priceSheet.create({
                             data: { supplierId, species, grade, thicknessQuarters, pricePerBf, widthQualifier: widthQualifier ?? null },
                  });
                  inserted++;
         }
     } catch (dbErr: any) {
            errors.push(`Row ${rowNum}: DB error – ${dbErr?.message ?? 'unknown error'}`);
            skipped++;
     }
  }

  return { inserted, updated, total: inserted + updated, skipped, errors, mode };
}
