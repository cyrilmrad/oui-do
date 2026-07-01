import { pgTable, serial, text, varchar, timestamp, boolean, integer, jsonb, uuid, pgPolicy, index, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel } from 'drizzle-orm';

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
    receptionAddress: varchar('reception_address', { length: 255 }),
    mapLink: text('map_link'),
    heroImage: text('hero_image'),
    metadataImageUrl: text('metadata_image_url'),
    heroVideo: text('hero_video'),
    detailsBackgroundUrl: text('details_background_url'),
    audioUrl: text('audio_url'),
    message: text('message'),
    giftMessage: text('gift_message'),
    bankAccountName: varchar('bank_account_name', { length: 255 }),
    bankAccountNumber: varchar('bank_account_number', { length: 255 }),
    mobileTransferNumber: varchar('mobile_transfer_number', { length: 255 }),
    giftOptions: jsonb('gift_options').default([]),
    theme: jsonb('theme'), // Store Theme object here
    heroLogoUrl: text('hero_logo_url'),
    showHeroLogo: boolean('show_hero_logo').default(false),
    showHeroDate: boolean('show_hero_date').default(true),
    showFormalInvitation: boolean('show_formal_invitation').default(false),
    formalInvitationImage: text('formal_invitation_image'),
    preCeremonyMedia: text('pre_ceremony_media'),
    showHouses: boolean('show_houses').default(false),
    housesData: jsonb('houses_data'),
    showNavigation: boolean('show_navigation').default(false),
    navigationPages: jsonb('navigation_pages'),
    customSections: jsonb('custom_sections').default([]),
    seatFinderSettings: jsonb('seat_finder_settings').default(null),
    footnote: text('footnote'),
    showRsvp: boolean('show_rsvp').default(true),
    /** Shown on the invite when `show_rsvp` is false; use `**text**` for bold. */
    rsvpClosedMessage: text('rsvp_closed_message'),
    multiGuestNameCollectionEnabled: boolean('multi_guest_name_collection_enabled').notNull().default(false),
    archiveMessage: text('archive_message'),
    clientLocked: boolean('client_locked').notNull().default(false),
    clientLockedAt: timestamp('client_locked_at'),
    isArchived: boolean('is_archived').notNull().default(false),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}).enableRLS();

/** Row shape returned by `db.select().from(invitations)` (camelCase JS keys, DB columns snake_case). */
export type InvitationSelect = InferSelectModel<typeof invitations>;

export const seatingTables = pgTable('seating_tables', {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 255 }).references(() => invitations.slug).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    capacity: integer('capacity').default(8),
    shape: varchar('shape', { length: 50 }).default('round'),
    // Optional 2D floor-plan coordinates (px from the canvas top-left). Null until
    // the table is first positioned in the floor-plan view.
    posX: integer('pos_x'),
    posY: integer('pos_y'),
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
    parentGuestId: uuid('parent_guest_id').references((): AnyPgColumn => guests.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id').references(() => seatingTables.id, { onDelete: 'set null' }),
    status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'attending', 'declined'
    message: text('message'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
    index('idx_guests_invitation_id').on(t.invitationId),
    index('idx_guests_parent_guest_id').on(t.parentGuestId),
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

/** Feature flags per client slug (matches Supabase Auth app_metadata.slug). */
export const clientEntitlements = pgTable('client_entitlements', {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 255 }).references(() => invitations.slug).notNull().unique(),
    guestsEnabled: boolean('guests_enabled').notNull().default(true),
    messagesEnabled: boolean('messages_enabled').notNull().default(true),
    budgetEnabled: boolean('budget_enabled').notNull().default(false),
    seatingEnabled: boolean('seating_enabled').notNull().default(false),
    settingsEnabled: boolean('settings_enabled').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow()
});

/**
 * 1:1 subscription / billing record per invitation.
 * Note: `invitations.id` is a serial integer (not uuid), so `invitationId` is integer
 * even though the plan called for uuid. The subscription's own `id` is uuid for consistency
 * with the rest of the uuid-keyed tables (guests, payments, seating).
 */
export const subscriptions = pgTable('subscriptions', {
    id: uuid('id').defaultRandom().primaryKey(),
    invitationId: integer('invitation_id')
        .references(() => invitations.id, { onDelete: 'cascade' })
        .notNull()
        .unique(),
    planTier: varchar('plan_tier', { length: 50 }).notNull().default('basic'),
    /** Whole-dollar price (no decimals). Aligns with the rest of the schema (`expenses.actualCost`, etc.). */
    price: integer('price').notNull().default(0),
    isPaid: boolean('is_paid').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
    pgPolicy("Admins have full access to subscriptions", {
        as: 'permissive',
        for: 'all',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`,
        withCheck: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`
    })
]).enableRLS();

export type SubscriptionSelect = InferSelectModel<typeof subscriptions>;

/** Day-of runsheet for suppliers — one per invitation slug. */
export const weddingSchedules = pgTable('wedding_schedules', {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 255 })
        .references(() => invitations.slug, { onDelete: 'cascade' })
        .notNull()
        .unique(),
    title: text('title').notNull().default(''),
    weddingDate: text('wedding_date'), // ISO date string YYYY-MM-DD
    backgroundColor: text('background_color').notNull().default('#cfe8e0'),
    backgroundImageUrl: text('background_image_url'),
    accentColor: text('accent_color').notNull().default('#00150f'),
    textColor: text('text_color').notNull().default('#1a2e25'),
    /** Array of ScheduleItem objects stored as JSONB. */
    items: jsonb('items').notNull().default([]),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
    pgPolicy("admin_all_schedule", {
        as: 'permissive',
        for: 'all',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`,
        withCheck: sql`(auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'`
    }),
    pgPolicy("public_read_schedule", {
        as: 'permissive',
        for: 'select',
        using: sql`true`
    })
]).enableRLS();

/** Admin/assistant planner — calendar events (global, not per-client). */
export const plannerEvents = pgTable('planner_events', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    /** ISO string — text avoids tz coercion; FullCalendar reads ISO strings natively. */
    startAt: text('start_at').notNull(),
    endAt: text('end_at'),
    allDay: boolean('all_day').notNull().default(false),
    /** Optional HEX color, e.g. '#10b981'. */
    color: varchar('color', { length: 20 }),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
    index('idx_planner_events_start_at').on(t.startAt),
    pgPolicy('admin_and_assistant_all_planner_events', {
        as: 'permissive',
        for: 'all',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'assistant')`,
        withCheck: sql`(auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'assistant')`,
    }),
]).enableRLS();

export type PlannerEventSelect = InferSelectModel<typeof plannerEvents>;

/** Admin/assistant planner — to-do checklist items (global, not per-client). */
export const plannerTodos = pgTable('planner_todos', {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    isCompleted: boolean('is_completed').notNull().default(false),
    /** Manual sort order for drag-to-reorder. */
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => [
    index('idx_planner_todos_sort_order').on(t.sortOrder),
    pgPolicy('admin_and_assistant_all_planner_todos', {
        as: 'permissive',
        for: 'all',
        using: sql`(auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'assistant')`,
        withCheck: sql`(auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'assistant')`,
    }),
]).enableRLS();

export type PlannerTodoSelect = InferSelectModel<typeof plannerTodos>;

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
