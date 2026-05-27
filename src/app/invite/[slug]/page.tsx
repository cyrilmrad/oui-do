import InvitationPreview, {
    CustomSection,
    InvitationData,
    Theme
} from '@/components/InvitationPreview';
import ArchivedInvitationView from '@/components/ArchivedInvitationView';
import type { NavigationPagesContent } from '@/lib/navigationPages';
import { db } from '@/db';
import { invitations, guests as guestsTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export async function generateMetadata({
    params
}: {
    params: Promise<{ slug: string }>
}): Promise<Metadata> {
    const { slug } = await params;
    const result = await db.select().from(invitations).where(eq(invitations.slug, slug));
    
    if (result.length === 0) {
        return {
            title: 'Invitation Not Found'
        };
    }

    const data = result[0];
    const title = data.isArchived
        ? `Thank you from ${data.bride} & ${data.groom}`
        : `${data.bride} & ${data.groom} | Wedding Invitation`;
    const description = data.isArchived
        ? `${data.bride} & ${data.groom} thank you for celebrating with them${data.date ? ` on ${data.date}` : ''}.`
        : `You are invited to the wedding of ${data.bride} & ${data.groom}. Join us on ${data.date || 'our special day'}.`;
    const imageUrl =
        data.metadataImageUrl ||
        data.heroImage ||
        "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop";

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
    const pageUrl = baseUrl ? `${baseUrl}/invite/${slug}` : undefined;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            ...(pageUrl ? { url: pageUrl } : {}),
            siteName: 'Oui-Do',
            type: 'website',
            images: [
                {
                    url: imageUrl,
                    secureUrl: imageUrl,
                    width: 1200,
                    height: 630,
                    alt: title,
                }
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [imageUrl],
        },
        // schema.org image — used by some crawlers (including WhatsApp Web) as a fallback
        other: {
            'image': imageUrl,
        },
    };
}

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
        receptionTime: dbData.receptionTime || "",
        receptionVenue: dbData.receptionVenue || "",
        receptionLocation: dbData.receptionLocation || "",
        receptionAddress: dbData.receptionAddress || "",
        detailsBackgroundUrl: dbData.detailsBackgroundUrl || "",
        mapLink: dbData.mapLink || "",
        heroImage: dbData.heroImage || "",
        metadataImageUrl: dbData.metadataImageUrl || "",
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
        showFormalInvitation: dbData.showFormalInvitation || false,
        formalInvitationImage: dbData.formalInvitationImage || "",
        preCeremonyMedia: dbData.preCeremonyMedia || "",
        showHouses: dbData.showHouses || false,
        housesData: (dbData.housesData as any) || {},
        showNavigation: dbData.showNavigation || false,
        navigationPages:
            (dbData.navigationPages as Partial<NavigationPagesContent> | null | undefined) ?? undefined,
        giftOptions: (dbData.giftOptions as any[]) || [],
        footnote: dbData.footnote || "",
        showRsvp: dbData.showRsvp !== false,
        rsvpClosedMessage: dbData.rsvpClosedMessage ?? "",
        theme: (dbData.theme as Theme) || {
            primaryText: "text-stone-800",
            accent: "text-emerald-700",
            background: "bg-stone-50"
        }
    };

    if (dbData.isArchived) {
        return <ArchivedInvitationView data={clientData} />;
    }

    return <InvitationPreview data={clientData} guestData={guestData} />;
}
