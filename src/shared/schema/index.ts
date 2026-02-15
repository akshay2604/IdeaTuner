import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const decisions = sqliteTable('decisions', {
  id: text('id').primaryKey(),
  title: text('title').notNull().default('Untitled Idea'),
  slug: text('slug').notNull(),
  phase: text('phase').notNull().default('spark'),
  rawIdea: text('raw_idea').default(''),
  context: text('context').default(''),
  problemStatement: text('problem_statement').default(''),
  chosenOptionId: text('chosen_option_id'),
  rationale: text('rationale').default(''),
  status: text('status').notNull().default('draft'),
  reversibility: text('reversibility'),
  urgency: text('urgency'),
  impact: text('impact'),
  qualityScore: real('quality_score'),
  qualityBreakdown: text('quality_breakdown'), // JSON
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  decidedAt: text('decided_at'),
  archivedAt: text('archived_at'),
})

export const options = sqliteTable('options', {
  id: text('id').primaryKey(),
  decisionId: text('decision_id')
    .notNull()
    .references(() => decisions.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').default(''),
  pros: text('pros').default('[]'), // JSON array of { text, weight }
  cons: text('cons').default('[]'), // JSON array of { text, weight }
  estimatedEffort: text('estimated_effort'),
  estimatedCost: text('estimated_cost'),
  timeToValue: text('time_to_value'),
  isRecommended: integer('is_recommended', { mode: 'boolean' }).default(false),
  isChosen: integer('is_chosen', { mode: 'boolean' }).default(false),
  eliminatedReason: text('eliminated_reason'),
  sortOrder: integer('sort_order').notNull().default(0),
  // Phase 2: tradeoffs
  optimizesFor: text('optimizes_for').default('[]'), // JSON
  sacrifices: text('sacrifices').default('[]'), // JSON
  optionAssumptions: text('option_assumptions').default('[]'), // JSON
  riskProfile: text('risk_profile')
})

export const evidence = sqliteTable('evidence', {
  id: text('id').primaryKey(),
  decisionId: text('decision_id')
    .notNull()
    .references(() => decisions.id, { onDelete: 'cascade' }),
  optionId: text('option_id').references(() => options.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  content: text('content').default(''),
  sourceUrl: text('source_url'),
  sourceLabel: text('source_label'),
  confidence: text('confidence').notNull().default('moderate'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  // Phase 4: evidence system
  weight: real('weight').default(1.0),
  direction: text('direction'),
  conflictsWith: text('conflicts_with').default('[]'), // JSON
  collectedAt: text('collected_at'),
  expiresAt: text('expires_at')
})

export const assumptions = sqliteTable('assumptions', {
  id: text('id').primaryKey(),
  decisionId: text('decision_id')
    .notNull()
    .references(() => decisions.id, { onDelete: 'cascade' }),
  statement: text('statement').notNull(),
  status: text('status').notNull().default('untested'),
  riskIfWrong: text('risk_if_wrong'),
  validationMethod: text('validation_method'),
  aiSuggested: integer('ai_suggested', { mode: 'boolean' }).default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  // Phase 2: active assumptions
  linkedOptionIds: text('linked_option_ids').default('[]'), // JSON
  linkedEvidenceIds: text('linked_evidence_ids').default('[]'), // JSON
  impactIfFlipped: text('impact_if_flipped'),
  validationDeadline: text('validation_deadline'),
  priority: text('priority').default('medium')
})

export const stakeholders = sqliteTable('stakeholders', {
  id: text('id').primaryKey(),
  decisionId: text('decision_id')
    .notNull()
    .references(() => decisions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role'),
  involvement: text('involvement').notNull().default('informed'),
  stance: text('stance').default('unknown'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`)
})

export const aiConversations = sqliteTable('ai_conversations', {
  id: text('id').primaryKey(),
  decisionId: text('decision_id')
    .notNull()
    .references(() => decisions.id, { onDelete: 'cascade' }),
  mode: text('mode').notNull(),
  messages: text('messages').notNull().default('[]'), // JSON
  extractedInsights: text('extracted_insights').default('[]'), // JSON
  canvasState: text('canvas_state'), // JSON - IdeaCanvas
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  label: text('label'),
  parentConversationId: text('parent_conversation_id')
})

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color')
})

export const decisionTags = sqliteTable('decision_tags', {
  decisionId: text('decision_id')
    .notNull()
    .references(() => decisions.id, { onDelete: 'cascade' }),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' })
})

export const optionComparisons = sqliteTable('option_comparisons', {
  id: text('id').primaryKey(),
  decisionId: text('decision_id')
    .notNull()
    .references(() => decisions.id, { onDelete: 'cascade' }),
  optionAId: text('option_a_id')
    .notNull()
    .references(() => options.id, { onDelete: 'cascade' }),
  optionBId: text('option_b_id')
    .notNull()
    .references(() => options.id, { onDelete: 'cascade' }),
  dimension: text('dimension').notNull(),
  winner: text('winner'),
  reasoning: text('reasoning').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`)
})
