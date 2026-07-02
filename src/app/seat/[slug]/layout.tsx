import { Great_Vibes, Cormorant_Garamond } from 'next/font/google';

const greatVibes = Great_Vibes({
    weight: '400',
    subsets: ['latin'],
    variable: '--font-great-vibes',
    display: 'swap',
});

const cormorant = Cormorant_Garamond({
    weight: ['300', '400', '600'],
    style: ['normal', 'italic'],
    subsets: ['latin'],
    variable: '--font-cormorant',
    display: 'swap',
});

export default function SeatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={`${greatVibes.variable} ${cormorant.variable}`}>
            {children}
        </div>
    );
}
