import { pgTable, serial, text, varchar, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

export const invitations = pgTable('invitations', {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    bride: varchar('bride', { length: 255 }).notNull(),
    groom: varchar('groom', { length: 255 }).notNull(),
    date: varchar('date', { length: 255 }),
    time: varchar('time', { length: 255 }),
    venue: varchar('venue', { length: 255 }),
    location: varchar('location', { length: 255 }),
    mapLink: text('map_link'),
    heroImage: text('hero_image'),
    heroVideo: text('hero_video'),
    audioUrl: text('audio_url'),
    message: text('message'),
    giftMessage: text('gift_message'),
    bankAccountName: varchar('bank_account_name', { length: 255 }),
    bankAccountNumber: varchar('bank_account_number', { length: 255 }),
    mobileTransferNumber: varchar('mobile_transfer_number', { length: 255 }),
    theme: jsonb('theme'), // Store Theme object here
    heroLogoUrl: text('hero_logo_url'),
    showHeroLogo: boolean('show_hero_logo').default(false),
    customSections: jsonb('custom_sections').default([]),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

export const rsvps = pgTable('rsvps', {
    id: serial('id').primaryKey(),
    invitationId: integer('invitation_id').references(() => invitations.id).notNull(),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    lastName: varchar('last_name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(), // 'attending', 'declined'
    guests: integer('guests').notNull().default(1),
    dietary: text('dietary'),
    message: text('message'),
    createdAt: timestamp('created_at').defaultNow(),
});
