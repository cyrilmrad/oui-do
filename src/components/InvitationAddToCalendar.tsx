"use client";

import type { InvitationData } from "@/components/InvitationPreview";
import { Calendar, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function buildLocation(data: Pick<InvitationData, "mapLink" | "venue" | "location">): string {
    const link = data.mapLink?.trim();
    if (link) return link;
    const firstVenue = data.venue?.split("\n")[0]?.trim();
    const loc = data.location?.trim();
    return [firstVenue, loc].filter(Boolean).join(", ");
}

function normalizeHm(t: string): string | undefined {
    const s = t.trim();
    if (!s) return undefined;
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return s;
    return `${m[1].padStart(2, "0")}:${m[2]}`;
}

type Wall = { y: number; mo: number; d: number; h: number; mi: number };

function wallInTz(utcMs: number, timeZone: string): Wall {
    const s = new Intl.DateTimeFormat("sv-SE", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(new Date(utcMs));
    const [datePart, timePart] = s.split(" ");
    const [yy, mm, dd] = datePart.split("-").map(Number);
    const [hh, min] = timePart.split(":").map(Number);
    return { y: yy, mo: mm, d: dd, h: hh, mi: min };
}

function cmpWall(a: Wall, b: Wall): number {
    const keys: (keyof Wall)[] = ["y", "mo", "d", "h", "mi"];
    for (const k of keys) {
        if (a[k] < b[k]) return -1;
        if (a[k] > b[k]) return 1;
    }
    return 0;
}

/** Wall-clock in `timeZone` → UTC instant (binary search, no extra deps). */
function zonedWallToUtc(dateStr: string, hm: string, timeZone: string): Date {
    const [y, mo, d] = dateStr.split("-").map((n) => parseInt(n, 10));
    const [h, mi] = hm.split(":").map((n) => parseInt(n, 10));
    const want: Wall = { y, mo, d, h, mi: Number.isNaN(mi) ? 0 : mi };
    let lo = Date.UTC(y, mo - 1, d, 0, 0, 0) - 20 * 3600000;
    let hi = Date.UTC(y, mo - 1, d, 23, 59, 0) + 20 * 3600000;
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const c = cmpWall(wallInTz(mid, timeZone), want);
        if (c === 0) return new Date(mid);
        if (c < 0) lo = mid + 1;
        else hi = mid - 1;
    }
    return new Date(Math.floor((lo + hi) / 2));
}

function toIcsUtcCompact(d: Date): string {
    return d
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
}

function icsEscapeText(s: string): string {
    return s
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,");
}

function foldIcsLine(line: string): string {
    if (line.length <= 74) return line;
    const out: string[] = [];
    let rest = line;
    while (rest.length > 74) {
        out.push(rest.slice(0, 74));
        rest = ` ${rest.slice(74)}`;
    }
    if (rest.length) out.push(rest);
    return out.join("\r\n");
}

function buildGoogleTimedUrl(title: string, details: string, location: string, start: Date, end: Date): string {
    const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    const dates = `${toIcsUtcCompact(start)}/${toIcsUtcCompact(end)}`;
    return `${base}&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
}

function buildGoogleAllDayUrl(title: string, details: string, location: string, ymdStart: string): string {
    const [y, m, d] = ymdStart.split("-").map(Number);
    const start = new Date(Date.UTC(y, m - 1, d));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const fmt = (dt: Date) =>
        `${dt.getUTCFullYear()}${String(dt.getUTCMonth() + 1).padStart(2, "0")}${String(dt.getUTCDate()).padStart(2, "0")}`;
    const dates = `${fmt(start)}/${fmt(end)}`;
    const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    return `${base}&text=${encodeURIComponent(title)}&dates=${dates}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
}

function buildIcsTimed(params: {
    uid: string;
    title: string;
    description: string;
    location: string;
    start: Date;
    end: Date;
}): string {
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Oui Do Invitations//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${params.uid}`,
        `DTSTAMP:${toIcsUtcCompact(new Date())}`,
        `DTSTART:${toIcsUtcCompact(params.start)}`,
        `DTEND:${toIcsUtcCompact(params.end)}`,
        foldIcsLine(`SUMMARY:${icsEscapeText(params.title)}`),
        foldIcsLine(`DESCRIPTION:${icsEscapeText(params.description)}`),
        foldIcsLine(`LOCATION:${icsEscapeText(params.location)}`),
        "END:VEVENT",
        "END:VCALENDAR"
    ];
    return lines.join("\r\n");
}

function buildIcsAllDay(params: {
    uid: string;
    title: string;
    description: string;
    location: string;
    ymd: string;
}): string {
    const [y, m, d] = params.ymd.split("-").map(Number);
    const ds = `${y}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`;
    const end = new Date(Date.UTC(y, m - 1, d + 1));
    const de = `${end.getUTCFullYear()}${String(end.getUTCMonth() + 1).padStart(2, "0")}${String(end.getUTCDate()).padStart(2, "0")}`;
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Oui Do Invitations//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `UID:${params.uid}`,
        `DTSTAMP:${toIcsUtcCompact(new Date())}`,
        `DTSTART;VALUE=DATE:${ds}`,
        `DTEND;VALUE=DATE:${de}`,
        foldIcsLine(`SUMMARY:${icsEscapeText(params.title)}`),
        foldIcsLine(`DESCRIPTION:${icsEscapeText(params.description)}`),
        foldIcsLine(`LOCATION:${icsEscapeText(params.location)}`),
        "END:VEVENT",
        "END:VCALENDAR"
    ];
    return lines.join("\r\n");
}

function downloadIcs(filename: string, body: string) {
    const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function InvitationAddToCalendar({ data }: { data: InvitationData }) {
    const date = data.date?.trim();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const [inviteUrl, setInviteUrl] = useState("");

    const tz =
        process.env.NEXT_PUBLIC_EVENT_TIMEZONE?.trim() ||
        Intl.DateTimeFormat().resolvedOptions().timeZone;

    useEffect(() => {
        const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "").trim();
        setInviteUrl(base ? `${base}/invite/${data.slug}` : `${window.location.origin}/invite/${data.slug}`);
    }, [data.slug]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    const hm = normalizeHm(data.time || "");
    const location = buildLocation(data);
    const description = useMemo(() => {
        const tail = inviteUrl
            ? ` For venue details and RSVP, visit: ${inviteUrl}`
            : " For venue details and RSVP, please check our online invitation.";
        return `We can't wait to celebrate our special day with you!${tail}`;
    }, [inviteUrl]);

    const { googleUrl, icsBody, icsFilename } = useMemo(() => {
        if (!date) return { googleUrl: "", icsBody: "", icsFilename: "" };
        const title = `Wedding of ${data.bride} and ${data.groom}`;
        const uid = `wedding-${data.slug}-${date}@e-invitation`;
        const safeFile = `${data.slug.replace(/[^\w-]+/g, "-")}-wedding.ics`;

        if (hm) {
            const start = zonedWallToUtc(date, hm, tz);
            const end = new Date(start.getTime() + 2 * 3600000);
            return {
                googleUrl: buildGoogleTimedUrl(title, description, location, start, end),
                icsBody: buildIcsTimed({ uid, title, description, location, start, end }),
                icsFilename: safeFile
            };
        }
        return {
            googleUrl: buildGoogleAllDayUrl(title, description, location, date),
            icsBody: buildIcsAllDay({ uid, title, description, location, ymd: date }),
            icsFilename: safeFile
        };
    }, [date, hm, data.slug, data.bride, data.groom, description, location, tz]);

    if (!date) return null;

    const onIcs = () => {
        downloadIcs(icsFilename, icsBody);
        setOpen(false);
    };

    return (
        <div className="mt-12 flex flex-col items-center gap-3">
            <p className="text-[10px] @md:text-xs font-sans uppercase tracking-[0.25em] text-stone-400">Save the date</p>
            <div ref={rootRef} className="relative inline-block text-left">
                <button
                    type="button"
                    aria-expanded={open}
                    aria-haspopup="menu"
                    onClick={() => setOpen((o) => !o)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium tracking-wide text-stone-800 shadow-sm transition-all duration-200 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/40"
                >
                    <Calendar className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    <span>Add to calendar</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {open && (
                    <div
                        role="menu"
                        className="absolute left-1/2 z-50 mt-2 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-stone-200/80 bg-white shadow-lg ring-1 ring-black/5"
                    >
                        <a
                            role="menuitem"
                            href={googleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-stone-700 transition-colors hover:bg-stone-50"
                        >
                            Google Calendar
                        </a>
                        <button type="button" role="menuitem" onClick={onIcs} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50">
                            Apple Calendar (.ics)
                        </button>
                        <button type="button" role="menuitem" onClick={onIcs} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50">
                            Outlook / Yahoo (.ics)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
