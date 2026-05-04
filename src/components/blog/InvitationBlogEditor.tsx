"use client";

import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { getInvitationBlogExtensions } from '@/lib/invitationBlogExtensions';
import { uploadInvitationAsset } from '@/lib/uploadInvitationAsset';
import type { NavigationBlogBody } from '@/lib/navigationPages';
import { EMPTY_BLOG_BODY } from '@/lib/navigationPages';
import {
    Bold,
    Italic,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Link as LinkIcon,
    ImagePlus,
    Quote
} from 'lucide-react';

export interface InvitationBlogEditorProps {
    slug: string;
    content: NavigationBlogBody | null;
    onChange: (json: NavigationBlogBody) => void;
    disabled?: boolean;
    /** Remount editor when switching posts */
    instanceKey?: string | number;
    className?: string;
}

export function InvitationBlogEditor({
    slug,
    content,
    onChange,
    disabled,
    instanceKey = 0,
    className = ''
}: InvitationBlogEditorProps) {
    const extensions = useMemo(() => getInvitationBlogExtensions(), []);

    const editor = useEditor(
        {
            immediatelyRender: false,
            shouldRerenderOnTransaction: true,
            extensions,
            content: content ?? EMPTY_BLOG_BODY,
            editable: !disabled,
            editorProps: {
                attributes: {
                    class:
                        'prose-invite-editor min-h-[200px] max-w-none px-3 py-2 text-sm text-stone-800 focus:outline-none [&_h2]:font-serif [&_h2]:text-xl [&_h3]:font-serif [&_h3]:text-lg [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5'
                }
            },
            onUpdate: ({ editor: ed }) => {
                onChange(ed.getJSON() as NavigationBlogBody);
            }
        },
        [instanceKey, slug, disabled]
    );

    useEffect(() => {
        if (!editor || disabled) return;
        const incoming = content ?? EMPTY_BLOG_BODY;
        const cur = editor.getJSON();
        if (JSON.stringify(incoming) === JSON.stringify(cur)) return;
        editor.commands.setContent(incoming, { emitUpdate: false });
    }, [editor, content, disabled]);

    const pickImage = useCallback(async () => {
        if (!editor || disabled || !slug) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const url = await uploadInvitationAsset(slug, file, 'blog');
                editor.chain().focus().setImage({ src: url }).run();
            } catch (e) {
                console.error(e);
                alert('Image upload failed. Please try again.');
            }
        };
        input.click();
    }, [editor, disabled, slug]);

    const setLink = useCallback(() => {
        if (!editor || disabled) return;
        const prev = editor.getAttributes('link').href as string | undefined;
        const url = window.prompt('Link URL', prev || 'https://');
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor, disabled]);

    if (!editor) {
        return <div className="min-h-[200px] rounded-md border border-stone-200 bg-stone-50 animate-pulse" />;
    }

    return (
        <div className={`rounded-md border border-stone-200 bg-white overflow-hidden ${className}`}>
            <div className="flex flex-wrap gap-1 border-b border-stone-100 bg-stone-50/80 px-2 py-1.5">
                <ToolbarBtn
                    label="Bold"
                    disabled={disabled}
                    active={editor.isActive('bold')}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <Bold className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    label="Italic"
                    disabled={disabled}
                    active={editor.isActive('italic')}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <Italic className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    label="Heading 2"
                    disabled={disabled}
                    active={editor.isActive('heading', { level: 2 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                >
                    <Heading2 className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    label="Heading 3"
                    disabled={disabled}
                    active={editor.isActive('heading', { level: 3 })}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                >
                    <Heading3 className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    label="Bullet list"
                    disabled={disabled}
                    active={editor.isActive('bulletList')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                    <List className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    label="Numbered list"
                    disabled={disabled}
                    active={editor.isActive('orderedList')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                    <ListOrdered className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn
                    label="Quote"
                    disabled={disabled}
                    active={editor.isActive('blockquote')}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                >
                    <Quote className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn label="Link" disabled={disabled} active={editor.isActive('link')} onClick={setLink}>
                    <LinkIcon className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn label="Image" disabled={disabled} active={false} onClick={pickImage}>
                    <ImagePlus className="w-4 h-4" />
                </ToolbarBtn>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}

function ToolbarBtn({
    label,
    children,
    onClick,
    active,
    disabled
}: {
    label: string;
    children: ReactNode;
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            title={label}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={`rounded p-1.5 text-stone-600 hover:bg-stone-200/80 disabled:opacity-40 ${active ? 'bg-stone-200 text-stone-900' : ''}`}
        >
            {children}
        </button>
    );
}
