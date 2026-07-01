import type { Metadata } from 'next';

// The day-of runsheet is a private, per-wedding page. It is intentionally
// public-readable by anyone with the link (suppliers scan it on the day), but it
// should never be discoverable via search engines — keep it out of the index.
export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default function SchedLayout({ children }: { children: React.ReactNode }) {
    return children;
}
