export interface SeatFinderSettings {
    imageMode: 'none' | 'logo' | 'hero' | 'custom';
    customImageUrl?: string;
    welcomeMessage: string;
}

export const DEFAULT_SEAT_FINDER_SETTINGS: SeatFinderSettings = {
    imageMode: 'none',
    welcomeMessage: '',
};
