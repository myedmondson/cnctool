import { pgTable, uuid, text, numeric, integer, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const toolTypes = pgTable('tool_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tools = pgTable('tools', {
  id: uuid('id').defaultRandom().primaryKey(),
  tnum: text('tnum').notNull().unique(), // User-facing tool identifier (e.g. "1", "101")
  description: text('description'),
  shankIn: numeric('shank_in'),
  shankM: numeric('shank_m'),
  cutDia: numeric('cut_dia'),
  loc: numeric('loc'), // Length of cut
  type: text('type'),
  part: text('part'),
  series: text('series'),
  coating: text('coating'),
  hsm: text('hsm'),
  radius: numeric('radius'),
  isAssembled: boolean('is_assembled').default(false).notNull(),
  isOutOfStock: boolean('is_out_of_stock').default(false).notNull(),
  holder: text('holder'),
  collet: text('collet'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const magazines = pgTable('magazines', {
  id: uuid('id').defaultRandom().primaryKey(),
  machineName: text('machine_name').notNull(),
  totalPockets: integer('total_pockets').default(21).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const magazinePockets = pgTable('magazine_pockets', {
  id: uuid('id').defaultRandom().primaryKey(),
  magazineId: uuid('magazine_id').references(() => magazines.id, { onDelete: 'cascade' }).notNull(),
  pocketNumber: integer('pocket_number').notNull(), // 1 to 21
  toolId: uuid('tool_id').references(() => tools.id, { onDelete: 'set null' }),
});

export const purchases = pgTable('purchases', {
  id: uuid('id').defaultRandom().primaryKey(),
  toolId: uuid('tool_id').references(() => tools.id, { onDelete: 'cascade' }).notNull(),
  date: timestamp('date').defaultNow().notNull(),
  vendor: text('vendor'),
  price: numeric('price'),
  poNumber: text('po_number'),
  quantity: integer('quantity').default(1).notNull(),
  dateIndex: integer('date_index'),
});

export const fusionJobs = pgTable('fusion_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  machineName: text('machine_name').notNull(),
  requiredTools: jsonb('required_tools').notNull().$type<Array<{ tnum: string; description: string }>>(),
  status: text('status').default('active').notNull(),
  receivedAt: timestamp('received_at').defaultNow().notNull(),
});

// Relations for ergonomic querying
export const toolsRelations = relations(tools, ({ many }) => ({
  purchases: many(purchases),
  pockets: many(magazinePockets),
}));

export const magazinesRelations = relations(magazines, ({ many }) => ({
  pockets: many(magazinePockets),
}));

export const magazinePocketsRelations = relations(magazinePockets, ({ one }) => ({
  magazine: one(magazines, {
    fields: [magazinePockets.magazineId],
    references: [magazines.id],
  }),
  tool: one(tools, {
    fields: [magazinePockets.toolId],
    references: [tools.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  tool: one(tools, {
    fields: [purchases.toolId],
    references: [tools.id],
  }),
}));

