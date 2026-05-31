/** Wraps the current textarea selection in the given marker (e.g. `**` or `__`) and returns the new value + caret. */
export function wrapMarkdownSegment(value: string, start: number, end: number, marker: string): { value: string; caret: number } {
    const sel = value.slice(start, end);
    const insert = `${marker}${sel}${marker}`;
    const next = value.slice(0, start) + insert + value.slice(end);
    const caret = sel.length > 0 ? start + insert.length : start + marker.length;
    return { value: next, caret };
}

/** Wraps the current textarea selection in `**…**` for bold. */
export function wrapMarkdownBoldSegment(value: string, start: number, end: number): { value: string; caret: number } {
    return wrapMarkdownSegment(value, start, end, '**');
}
