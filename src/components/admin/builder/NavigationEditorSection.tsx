import React from 'react';
import { Plus, Trash2, ChevronDown, ImagePlus, X } from 'lucide-react';
import { InvitationBlogEditor } from '@/components/blog/InvitationBlogEditor';
import type {
    NavigationBlogBody,
    NavigationDynamicPage,
    NavigationExploringSpot,
    NavigationLodgingHotel,
    NavigationPagesContent
} from '@/components/InvitationPreview';

interface NavigationEditorSectionProps {
    showNavigation: boolean;
    onToggleShowNavigation: (checked: boolean) => void;
    isOpen: boolean;
    onToggleOpen: () => void;
    np: NavigationPagesContent;
    slug: string;
    updateNavigationPages: (patch: Partial<NavigationPagesContent>) => void;
    addLodgingHotel: () => void;
    removeLodgingHotel: (index: number) => void;
    updateLodgingHotel: (index: number, field: keyof NavigationLodgingHotel, value: string) => void;
    onHotelImageUpload: (idx: number, file: File) => Promise<void>;
    onHotelImageRemove: (idx: number, currentUrl: string) => Promise<void>;
    addExploringSpot: () => void;
    removeExploringSpot: (index: number) => void;
    updateExploringSpot: (index: number, field: keyof NavigationExploringSpot, value: string) => void;
    addDynamicPage: () => void;
    removeDynamicPage: (id: string) => void;
    updateDynamicPage: (id: string, patch: Partial<NavigationDynamicPage>) => void;
    updateDynamicPageBody: (id: string, body: NavigationBlogBody) => void;
}

/** Section 08 of the admin invitation builder — multi-page navigation editor (lodging, exploring, custom pages). */
export function NavigationEditorSection({
    showNavigation,
    onToggleShowNavigation,
    isOpen,
    onToggleOpen,
    np,
    slug,
    updateNavigationPages,
    addLodgingHotel,
    removeLodgingHotel,
    updateLodgingHotel,
    onHotelImageUpload,
    onHotelImageRemove,
    addExploringSpot,
    removeExploringSpot,
    updateExploringSpot,
    addDynamicPage,
    removeDynamicPage,
    updateDynamicPage,
    updateDynamicPageBody
}: NavigationEditorSectionProps) {
    return (
        <section>
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-headline text-primary">Multi-Page Navigation (Beta)</h2>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showNavigation || false}
                            onChange={(e) => onToggleShowNavigation(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className="ms-3 text-[0.75rem] font-label uppercase text-primary tracking-widest font-bold">Enable Navigation</span>
                    </label>
                </div>
                <span className="text-[0.75rem] font-label uppercase text-secondary tracking-widest">Section 08</span>
            </div>
            <div className="rounded-xl border border-outline-variant/20 bg-surface-container-latest overflow-hidden">
                <button
                    type="button"
                    onClick={onToggleOpen}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-surface-container-high/40 transition-colors border-b border-outline-variant/10"
                    aria-expanded={isOpen}
                >
                    <div className="min-w-0">
                        <span className="text-sm font-semibold text-on-surface">Navigation content &amp; pages</span>
                        <p className="text-xs text-secondary mt-0.5">
                            Menu labels, lodging, exploring, and custom pages
                        </p>
                    </div>
                    <ChevronDown
                        className={`w-5 h-5 text-secondary shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden
                    />
                </button>
                {isOpen && (
                <div className="p-8 space-y-8 border-t border-outline-variant/10">
                <p className="text-sm text-secondary">
                    When navigation is on, the menu lists Main, any enabled Lodging/Exploring pages, plus each custom page you add (e.g. Cars, Stays, Food). Each custom page is one full screen with its own title, intro, date, and rich body. Existing invitations without section toggles keep Lodging and Exploring on until you save.
                </p>
                <div className="flex flex-wrap gap-6">
                    {(
                        [
                            ['lodgingEnabled', 'Lodging page', np.lodgingEnabled],
                            ['exploringEnabled', 'Exploring page', np.exploringEnabled]
                        ] as const
                    ).map(([key, label, checked]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-on-surface">
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) =>
                                    updateNavigationPages({ [key]: e.target.checked } as Partial<NavigationPagesContent>)
                                }
                                className="rounded border-outline-variant text-primary"
                            />
                            {label}
                        </label>
                    ))}
                </div>

                <div className="space-y-4">
                    <h3 className="text-[0.7rem] font-label uppercase tracking-[0.12em] text-primary font-bold">Menu labels</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[0.65rem] font-label uppercase text-secondary tracking-[0.05em]">Main</label>
                            <input type="text" value={np.mainNavLabel} onChange={(e) => updateNavigationPages({ mainNavLabel: e.target.value })} className="w-full border border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 text-on-surface text-sm bg-surface" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[0.65rem] font-label uppercase text-secondary tracking-[0.05em]">Lodging</label>
                            <input type="text" value={np.lodgingNavLabel} onChange={(e) => updateNavigationPages({ lodgingNavLabel: e.target.value })} className="w-full border border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 text-on-surface text-sm bg-surface" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[0.65rem] font-label uppercase text-secondary tracking-[0.05em]">Exploring</label>
                            <input type="text" value={np.exploringNavLabel} onChange={(e) => updateNavigationPages({ exploringNavLabel: e.target.value })} className="w-full border border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 text-on-surface text-sm bg-surface" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-outline-variant/15">
                    <h3 className="text-[0.7rem] font-label uppercase tracking-[0.12em] text-primary font-bold">Lodging page</h3>
                    <div className="space-y-1.5">
                        <label className="text-[0.65rem] font-label uppercase text-secondary tracking-[0.05em]">Heading</label>
                        <input type="text" value={np.lodgingTitle} onChange={(e) => updateNavigationPages({ lodgingTitle: e.target.value })} className="w-full border border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 text-on-surface text-sm bg-surface" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[0.65rem] font-label uppercase text-secondary tracking-[0.05em]">Introduction</label>
                        <textarea value={np.lodgingIntro} onChange={(e) => updateNavigationPages({ lodgingIntro: e.target.value })} rows={3} className="w-full border border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 text-on-surface text-sm bg-surface resize-y min-h-[4.5rem]" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <span className="text-[0.65rem] font-label uppercase tracking-widest text-secondary font-bold">Hotels</span>
                        <button
                            type="button"
                            onClick={addLodgingHotel}
                            className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant/30 bg-surface px-3 py-2 text-[0.65rem] font-label font-bold uppercase tracking-widest text-primary hover:bg-surface-container-high"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add hotel
                        </button>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                        {np.lodgingHotels.map((hotel, idx) => (
                            <div key={idx} className="rounded-xl border border-outline-variant/20 p-5 space-y-3 bg-surface/50">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[0.65rem] font-label uppercase tracking-widest text-secondary font-bold">Hotel {idx + 1}</p>
                                    <button
                                        type="button"
                                        onClick={() => removeLodgingHotel(idx)}
                                        disabled={np.lodgingHotels.length <= 1}
                                        className="rounded-md p-1.5 text-secondary hover:bg-error-container/30 hover:text-error disabled:pointer-events-none disabled:opacity-30"
                                        title={np.lodgingHotels.length <= 1 ? 'At least one hotel required' : 'Remove hotel'}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                {/* Hotel cover photo */}
                                {hotel.imageUrl ? (
                                    <div className="relative rounded-md overflow-hidden">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={hotel.imageUrl} alt="Hotel cover" className="w-full h-28 object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => void onHotelImageRemove(idx, hotel.imageUrl!)}
                                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 hover:bg-rose-600/90 text-white flex items-center justify-center transition-colors"
                                            title="Remove photo"
                                        >
                                            <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex items-center justify-center gap-2 w-full h-20 border-2 border-dashed border-outline-variant/30 rounded-md text-xs font-label font-bold uppercase tracking-widest text-secondary hover:border-primary/40 hover:text-primary transition-colors">
                                        <ImagePlus className="w-4 h-4" />
                                        Add photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={e => {
                                                const f = e.target.files?.[0];
                                                if (f) void onHotelImageUpload(idx, f);
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                )}
                                <input type="text" placeholder="Title" value={hotel.title} onChange={(e) => updateLodgingHotel(idx, 'title', e.target.value)} className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface" />
                                <input type="text" placeholder="Subtitle / distance" value={hotel.subtitle} onChange={(e) => updateLodgingHotel(idx, 'subtitle', e.target.value)} className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface" />
                                <textarea placeholder="Description" value={hotel.description} onChange={(e) => updateLodgingHotel(idx, 'description', e.target.value)} rows={3} className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface resize-y" />
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" placeholder="Link label" value={hotel.linkText} onChange={(e) => updateLodgingHotel(idx, 'linkText', e.target.value)} className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface" />
                                    <input type="text" placeholder="URL" value={hotel.linkUrl} onChange={(e) => updateLodgingHotel(idx, 'linkUrl', e.target.value)} className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-outline-variant/15">
                    <h3 className="text-[0.7rem] font-label uppercase tracking-[0.12em] text-primary font-bold">Exploring page</h3>
                    <div className="space-y-1.5">
                        <label className="text-[0.65rem] font-label uppercase text-secondary tracking-[0.05em]">Heading</label>
                        <input type="text" value={np.exploringTitle} onChange={(e) => updateNavigationPages({ exploringTitle: e.target.value })} className="w-full border border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 text-on-surface text-sm bg-surface" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[0.65rem] font-label uppercase text-secondary tracking-[0.05em]">Introduction</label>
                        <textarea value={np.exploringIntro} onChange={(e) => updateNavigationPages({ exploringIntro: e.target.value })} rows={3} className="w-full border border-outline-variant/30 rounded-md p-3 focus:ring-2 focus:ring-primary/20 text-on-surface text-sm bg-surface resize-y min-h-[4.5rem]" />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <span className="text-[0.65rem] font-label uppercase tracking-widest text-secondary font-bold">Spots</span>
                        <button
                            type="button"
                            onClick={addExploringSpot}
                            className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant/30 bg-surface px-3 py-2 text-[0.65rem] font-label font-bold uppercase tracking-widest text-primary hover:bg-surface-container-high"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add spot
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        {np.exploringSpots.map((spot, idx) => (
                            <div key={idx} className="rounded-xl border border-outline-variant/20 p-5 space-y-3 bg-surface/50">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[0.65rem] font-label uppercase tracking-widest text-secondary font-bold">Spot {idx + 1}</p>
                                    <button
                                        type="button"
                                        onClick={() => removeExploringSpot(idx)}
                                        disabled={np.exploringSpots.length <= 1}
                                        className="rounded-md p-1.5 text-secondary hover:bg-error-container/30 hover:text-error disabled:pointer-events-none disabled:opacity-30"
                                        title={np.exploringSpots.length <= 1 ? 'At least one spot required' : 'Remove spot'}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <input type="text" placeholder="Title" value={spot.title} onChange={(e) => updateExploringSpot(idx, 'title', e.target.value)} className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface" />
                                <input type="text" placeholder="Category" value={spot.category} onChange={(e) => updateExploringSpot(idx, 'category', e.target.value)} className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface" />
                                <textarea placeholder="Description" value={spot.description} onChange={(e) => updateExploringSpot(idx, 'description', e.target.value)} rows={2} className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface resize-y" />
                                <input type="text" placeholder="Image URL" value={spot.imageUrl} onChange={(e) => updateExploringSpot(idx, 'imageUrl', e.target.value)} className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-outline-variant/15">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-[0.7rem] font-label uppercase tracking-[0.12em] text-primary font-bold">
                            Custom pages (one menu item + full page each)
                        </h3>
                        <button
                            type="button"
                            onClick={addDynamicPage}
                            className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant/30 bg-surface px-3 py-2 text-[0.65rem] font-label font-bold uppercase tracking-widest text-primary hover:bg-surface-container-high"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add page
                        </button>
                    </div>
                    <div className="space-y-6 pt-2">
                        {np.dynamicNavPages.map((page) => (
                            <div key={page.id} className="rounded-xl border border-outline-variant/20 p-5 space-y-3 bg-surface/50">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[0.65rem] font-label uppercase tracking-widest text-secondary font-bold">Custom page</p>
                                    <button
                                        type="button"
                                        onClick={() => removeDynamicPage(page.id)}
                                        className="rounded-md p-1.5 text-secondary hover:bg-error-container/30 hover:text-error"
                                        title="Remove page"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Menu label (e.g. Cars, Stays)"
                                    value={page.navLabel}
                                    onChange={(e) => updateDynamicPage(page.id, { navLabel: e.target.value })}
                                    className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface"
                                />
                                <input
                                    type="text"
                                    placeholder="Page title (heading)"
                                    value={page.title}
                                    onChange={(e) => updateDynamicPage(page.id, { title: e.target.value })}
                                    className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface"
                                />
                                <textarea
                                    placeholder="Introduction"
                                    value={page.introduction}
                                    onChange={(e) => updateDynamicPage(page.id, { introduction: e.target.value })}
                                    rows={3}
                                    className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface resize-y"
                                />
                                <input
                                    type="text"
                                    placeholder="Date (optional)"
                                    value={page.date}
                                    onChange={(e) => updateDynamicPage(page.id, { date: e.target.value })}
                                    className="w-full border border-outline-variant/30 rounded-md p-2.5 text-sm bg-surface text-on-surface"
                                />
                                {slug ? (
                                    <InvitationBlogEditor
                                        slug={slug}
                                        instanceKey={page.id}
                                        content={page.body}
                                        onChange={(body) => updateDynamicPageBody(page.id, body)}
                                    />
                                ) : (
                                    <p className="text-xs text-secondary">Select a client with a slug to upload images.</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                </div>
                )}
            </div>
        </section>
    );
}
