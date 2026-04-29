export type GuestImportRow = {
    firstName: string;
    lastName: string;
    pax: number;
};

/** Public template served from `/public`. Replace with a full URL after hosting elsewhere. */
export const GUEST_CSV_TEMPLATE_DOWNLOAD_URL = '/guest-import-template.csv';

function capitalizeFirstLetter(value: string): string {
    const t = value.trim();
    if (!t) return '';
    const chars = [...t];
    const first = chars[0] ?? '';
    const rest = chars.slice(1).join('');
    return first.toLocaleUpperCase() + rest;
}

function parsePax(raw: string): number {
    const pax = parseInt(raw || '1', 10);
    return Number.isFinite(pax) && pax > 0 ? pax : 1;
}

/**
 * Normalize a spreadsheet cell for guest import (numbers, dates, strings).
 */
export function guestImportCellToString(cell: unknown): string {
    if (cell == null) return '';
    if (typeof cell === 'number') {
        if (!Number.isFinite(cell)) return '';
        return String(cell);
    }
    if (cell instanceof Date) {
        return cell.toISOString();
    }
    return String(cell).trim();
}

/**
 * Parses a grid: row 1 = header (skipped), columns A–C = firstName, lastName, pax.
 * Empty rows are ignored. Same rules as CSV (no quoted commas).
 */
export function parseGuestImportFromStringRows(matrix: string[][]): {
    guests: GuestImportRow[];
    skippedLineCount: number;
} {
    const rows = matrix.filter((r) => r.some((c) => (c ?? '').trim() !== ''));
    if (rows.length <= 1) {
        return { guests: [], skippedLineCount: Math.max(0, rows.length - 1) };
    }

    let skippedLineCount = 0;
    const guests: GuestImportRow[] = [];

    for (const row of rows.slice(1)) {
        const firstName = (row[0] ?? '').trim();
        const lastName = (row[1] ?? '').trim();
        const paxRaw = (row[2] ?? '').trim();

        if (firstName && lastName) {
            guests.push({
                firstName: capitalizeFirstLetter(firstName),
                lastName: capitalizeFirstLetter(lastName),
                pax: parsePax(paxRaw),
            });
        } else {
            skippedLineCount += 1;
        }
    }

    return { guests, skippedLineCount };
}

/**
 * Parses CSV text: newline-separated rows, comma-separated columns.
 */
export function parseGuestImportCsv(text: string): {
    guests: GuestImportRow[];
    skippedLineCount: number;
} {
    const lines = text.split(/\r?\n/).filter((row) => row.trim() !== '');
    const matrix = lines.map((line) => line.split(','));
    return parseGuestImportFromStringRows(matrix);
}

/**
 * First worksheet from read-excel-file: each row is an array of cell values.
 */
export function parseGuestImportFromExcelRows(rawRows: unknown[][]): {
    guests: GuestImportRow[];
    skippedLineCount: number;
} {
    const matrix = rawRows.map((row) => {
        const r = Array.isArray(row) ? row : [];
        return [
            guestImportCellToString(r[0]),
            guestImportCellToString(r[1]),
            guestImportCellToString(r[2]),
        ];
    });
    return parseGuestImportFromStringRows(matrix);
}
