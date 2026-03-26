import { pgTable, serial, text, varchar, timestamp, boolean, integer, jsonb, uuid, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const invitations = pgTable('invitations', {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    bride: varchar('bride', { length: 255 }).notNull(),
    groom: varchar('groom', { length: 255 }).notNull(),
    date: varchar('date', { length: 255 }),
    time: varchar('time', { length: 255 }),
    venue: varchar('venue', { length: 255 }),
    location: varchar('location', { length: 255 }),
    receptionTime: varchar('reception_time', { length: 255 }),
    receptionVenue: varchar('reception_venue', { length: 255 }),
    receptionLocation: varchar('reception_location', { length: 255 }),
    mapLink: text('map_link'),
    heroImage: text('hero_image'),
    heroVideo: text('hero_video'),
    detailsBackgroundUrl: text('details_background_url'),
    audioUrl: text('audio_url'),
    message: text('message'),
    giftMessage: text('gift_message'),
    bankAccountName: varchar('bank_account_name', { length: 255 }),
    bankAccountNumber: varchar('bank_account_number', { length: 255 }),
    mobileTransferNumber: varchar('mobile_transfer_number', { length: 255 }),
    theme: jsonb('theme'), // Store Theme object here
    heroLogoUrl: text('hero_logo_url'),
    showHeroLogo: boolean('show_hero_logo').default(false),
    showFormalInvitation: boolean('show_formal_invitation').default(false),
    formalInvitationImage: text('formal_invitation_image'),
    preCeremonyMedia: text('pre_ceremony_media'),
    customSections: jsonb('custom_sections').default([]),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}).enableRLS();

export const seatingTables = pgTable('seating_tables', {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 255 }).references(() => invitations.slug).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    capacity: integer('capacity').default(8),
    shape: varchar('shape', { length: 50 }).default('round'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
    pgPolicy("Admins have full access to seating_tables", {
        as: 'permissive',
        for: 'all',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`,
        withCheck: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`
    }),
    pgPolicy("Clients can manage their own seating_tables", {
        as: 'permissive',
        for: 'all',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND slug = (auth.jwt() -> 'app_metadata' ->> 'slug')`,
        withCheck: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND slug = (auth.jwt() -> 'app_metadata' ->> 'slug')`
    })
]).enableRLS();

export const guests = pgTable('guests', {
    id: uuid('id').defaultRandom().primaryKey(),
    invitationId: integer('invitation_id').references(() => invitations.id).notNull(),
    firstName: varchar('first_name', { length: 255 }).notNull(),
    lastName: varchar('last_name', { length: 255 }).notNull(),
    pax: integer('pax').notNull().default(1),
    tableId: uuid('table_id').references(() => seatingTables.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'attending', 'declined'
    message: text('message'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
    pgPolicy("Admins have full access to guests", {
        as: 'permissive',
        for: 'all',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`,
        withCheck: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`
    }),
    pgPolicy("Clients can manage their own guests", {
        as: 'permissive',
        for: 'all',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND invitation_id IN (SELECT id FROM public.invitations WHERE slug = (auth.jwt() -> 'app_metadata' ->> 'slug'))`,
        withCheck: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND invitation_id IN (SELECT id FROM public.invitations WHERE slug = (auth.jwt() -> 'app_metadata' ->> 'slug'))`
    })
]).enableRLS();

export const expenses = pgTable('expenses', {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 255 }).references(() => invitations.slug).notNull(),
    category: varchar('category', { length: 255 }).notNull(),
    isIncluded: boolean('is_included').default(true),
    supplier: varchar('supplier', { length: 255 }),
    description: text('description'),
    estimatedCost: integer('estimated_cost').default(0),
    actualCost: integer('actual_cost').default(0),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
    pgPolicy("Admins have full access to expenses", {
        as: 'permissive',
        for: 'all',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`,
        withCheck: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`
    }),
    pgPolicy("Clients can manage their own expenses", {
        as: 'permissive',
        for: 'all',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND slug = (auth.jwt() -> 'app_metadata' ->> 'slug')`,
        withCheck: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND slug = (auth.jwt() -> 'app_metadata' ->> 'slug')`
    })
]).enableRLS();

export const payments = pgTable('payments', {
    id: uuid('id').defaultRandom().primaryKey(),
    expenseId: uuid('expense_id').references(() => expenses.id, { onDelete: 'cascade' }).notNull(),
    slug: varchar('slug', { length: 255 }).references(() => invitations.slug).notNull(),
    amount: integer('amount').notNull(),
    paymentDate: timestamp('payment_date').defaultNow(),
    receivedBy: varchar('received_by', { length: 255 }),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
    pgPolicy("Admins have full access to payments", {
        as: 'permissive',
        for: 'all',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`,
        withCheck: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`
    }),
    pgPolicy("Clients can view their own payments", {
        as: 'permissive',
        for: 'select',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'client' AND slug = (auth.jwt() -> 'app_metadata' ->> 'slug')`
    })
]).enableRLS();
