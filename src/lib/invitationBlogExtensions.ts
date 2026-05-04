import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import type { Extensions } from '@tiptap/core';

export function getInvitationBlogExtensions(): Extensions {
    return [
        StarterKit.configure({
            heading: { levels: [2, 3] }
        }),
        Link.configure({
            openOnClick: false,
            autolink: true,
            defaultProtocol: 'https',
            HTMLAttributes: {
                class: 'invitation-blog-link underline underline-offset-2 decoration-stone-400 hover:opacity-80'
            }
        }),
        Image.configure({
            HTMLAttributes: {
                class: 'invitation-blog-image rounded-2xl max-w-full h-auto mx-auto my-6 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-stone-100'
            }
        })
    ];
}
