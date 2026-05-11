"use client";

import { useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getInvitationBlogExtensions } from '@/lib/invitationBlogExtensions';
import type { NavigationBlogBody } from '@/lib/navigationPages';
import { EMPTY_BLOG_BODY } from '@/lib/navigationPages';

export interface InvitationBlogReadonlyProps {
    body: NavigationBlogBody | null;
    /** Stable key when list reorders */
    contentKey?: string | number;
    /** Text color utilities for body (e.g. text-stone-800) */
    primaryTextClass: string;
    className?: string;
}

/**
 * Guest-safe read-only render; links use invitation --theme-accent from ancestor.
 */
export function InvitationBlogReadonly({ body, contentKey = 0, primaryTextClass, className = '' }: InvitationBlogReadonlyProps) {
    const extensions = useMemo(() => getInvitationBlogExtensions(), []);
    const contentSig = useMemo(() => {
        if (body && typeof body === 'object' && (body as { type?: string }).type === 'doc') {
            return JSON.stringify(body);
        }
        return '';
    }, [body]);
    const safe: NavigationBlogBody = useMemo(() => {
        if (body && typeof body === 'object' && (body as { type?: string }).type === 'doc') {
            return body as NavigationBlogBody;
        }
        return { ...EMPTY_BLOG_BODY };
    }, [body]);

    const editor = useEditor(
        {
            immediatelyRender: false,
            extensions,
            content: safe,
            editable: false
        },
        [contentKey, contentSig]
    );

    if (!editor) {
        return null;
    }

    return (
        <div
            className={`invitation-blog-readonly w-full max-w-2xl mx-auto text-left ${primaryTextClass} ${className} [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:text-base [&_.ProseMirror_p]:font-light [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_p]:mb-4 [&_.ProseMirror_h2]:font-serif [&_.ProseMirror_h2]:text-2xl [&_.ProseMirror_h2]:@md:text-3xl [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:font-light [&_.ProseMirror_h3]:font-serif [&_.ProseMirror_h3]:text-xl [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:mb-4 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:mb-4 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-stone-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-stone-600 [&_.ProseMirror_blockquote]:my-4 [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:h-auto [&_a.invitation-blog-link]:text-[color:var(--theme-accent)] [&_a.invitation-blog-link]:font-medium`}
        >
            <EditorContent editor={editor} />
        </div>
    );
}
