import InvitationPreview, { InvitationData, Theme, CustomSection } from '@/components/InvitationPreview';
import { db } from '@/db';
import { invitations, guests as guestsTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';

export default async function InvitePage({
    params,
    searchParams
}: {
    params: Promise<{ slug: string }>,
    searchParams: Promise<{ guest?: string }>
}) {
    const { slug } = await params;
    const resolvedSearchParams = await searchParams;
    const guestId = resolvedSearchParams?.guest;

    const result = await db.select().from(invitations).where(eq(invitations.slug, slug));

    if (result.length === 0) {
        notFound();
    }

    const dbData = result[0];

    // Fetch Guest Data if provided in URL
    let guestData = null;
    if (guestId) {
        try {
            const guestResult = await db.select().from(guestsTable).where(
                and(
                    eq(guestsTable.id, guestId),
                    eq(guestsTable.invitationId, dbData.id)
                )
            );
            if (guestResult.length > 0) {
                guestData = guestResult[0];
            }
        } catch (e) {
            console.error("Invalid UUID or guest fetch error:", e);
        }
    }

    const clientData: InvitationData = {
        slug: dbData.slug,
        bride: dbData.bride,
        groom: dbData.groom,
        date: dbData.date || "",
        time: dbData.time || "",
        venue: dbData.venue || "",
        location: dbData.location || "",
        mapLink: dbData.mapLink || "",
        heroImage: dbData.heroImage || "",
        heroVideo: dbData.heroVideo || "",
        audioUrl: dbData.audioUrl || "",
        message: dbData.message || "",
        heroLogoUrl: dbData.heroLogoUrl || "",
        showHeroLogo: dbData.showHeroLogo || false,
        customSections: (dbData.customSections as CustomSection[]) || [],
        giftMessage: dbData.giftMessage || "",
        bankAccountName: dbData.bankAccountName || "",
        bankAccountNumber: dbData.bankAccountNumber || "",
        mobileTransferNumber: dbData.mobileTransferNumber || "",
        theme: (dbData.theme as Theme) || {
            primaryText: "text-stone-800",
            accent: "text-emerald-700",
            background: "bg-stone-50"
        }
    };

    return <InvitationPreview data={clientData} guestData={guestData} />;
}
