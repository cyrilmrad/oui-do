import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Login',
    description: 'Sign in to manage invitations and event details.'
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return children;
}
