import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Admin',
    description: 'Admin workspace for client invitations and feature controls.'
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return children;
}
