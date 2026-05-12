/** Wraps the current textarea selection in `**…**` for RSVP closed-message preview. */
export function wrapMarkdownBoldSegment(value: string, start: number, end: number): { value: string; caret: number } {
    const sel = value.slice(start, end);
    const insert = `**${sel}**`;
    const next = value.slice(0, start) + insert + value.slice(end);
    const caret = sel.length > 0 ? start + insert.length : start + 2;
    return { value: next, caret };
}
