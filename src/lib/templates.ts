// src/lib/templates.ts

export type TemplateId = 'classic' | 'swipe';

export interface TemplateDefinition {
    id: TemplateId;
    name: string;
    description: string;
}

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
    classic: {
        id: 'classic',
        name: 'Classic',
        description: 'Continuous scroll · Light & timeless',
    },
    swipe: {
        id: 'swipe',
        name: 'Swipe',
        description: 'Full-screen snap sections · Dark & dramatic',
    },
};

export const DEFAULT_TEMPLATE_ID: TemplateId = 'classic';
