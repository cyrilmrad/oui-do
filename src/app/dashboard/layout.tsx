import { EntitlementsProvider } from '@/components/entitlements/EntitlementsContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <EntitlementsProvider>{children}</EntitlementsProvider>;
}
