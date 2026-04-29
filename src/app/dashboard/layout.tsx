import type { Metadata } from 'next';
import { EntitlementsProvider } from '@/components/entitlements/EntitlementsContext';

export const metadata: Metadata = {
    title: 'Dashboard',
    description: 'Client dashboard for RSVPs, messages, budget, and seating.'
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <EntitlementsProvider>{children}</EntitlementsProvider>;
}
