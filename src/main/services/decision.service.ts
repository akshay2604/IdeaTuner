import { eq } from 'drizzle-orm'
import { getDb } from '../database/connection'
import * as schema from '@shared/schema'
import type {
  Decision,
  DecisionWithRelations,
  Option,
  Evidence,
  Assumption,
  Stakeholder,
  ProCon
} from '@shared/types'
import { randomId, slugify } from './utils'

// ---- Decisions ----

export function listDecisions(): Decision[] {
  const db = getDb()
  const rows = db.select().from(schema.decisions).all()
  return rows.map(mapDecisionRow)
}

export function getDecision(id: string): DecisionWithRelations | null {
  const db = getDb()
  const row = db.select().from(schema.decisions).where(eq(schema.decisions.id, id)).get()
  if (!row) return null

  const opts = db
    .select()
    .from(schema.options)
    .where(eq(schema.options.decisionId, id))
    .all()
    .map(mapOptionRow)

  const evs = db
    .select()
    .from(schema.evidence)
    .where(eq(schema.evidence.decisionId, id))
    .all()
    .map(mapEvidenceRow)

  const asms = db
    .select()
    .from(schema.assumptions)
    .where(eq(schema.assumptions.decisionId, id))
    .all()
    .map(mapAssumptionRow)

  const sths = db
    .select()
    .from(schema.stakeholders)
    .where(eq(schema.stakeholders.decisionId, id))
    .all()
    .map(mapStakeholderRow)

  const tagRows = db
    .select({ id: schema.tags.id, name: schema.tags.name, color: schema.tags.color })
    .from(schema.decisionTags)
    .innerJoin(schema.tags, eq(schema.decisionTags.tagId, schema.tags.id))
    .where(eq(schema.decisionTags.decisionId, id))
    .all()

  return {
    ...mapDecisionRow(row),
    options: opts,
    evidence: evs,
    assumptions: asms,
    stakeholders: sths,
    tags: tagRows
  }
}

export function createDecision(data: Partial<Decision>): Decision {
  const db = getDb()
  const id = data.id || randomId()
  const title = data.title || 'Untitled Idea'
  const now = new Date().toISOString()

  const row = {
    id,
    title,
    slug: slugify(title),
    context: data.context || '',
    problemStatement: data.problemStatement || '',
    rationale: data.rationale || '',
    phase: data.phase || 'spark',
    rawIdea: data.rawIdea || '',
    status: data.status || 'draft',
    reversibility: data.reversibility || null,
    urgency: data.urgency || null,
    impact: data.impact || null,
    qualityScore: data.qualityScore || null,
    qualityBreakdown: data.qualityBreakdown ? JSON.stringify(data.qualityBreakdown) : null,
    chosenOptionId: data.chosenOptionId || null,
    createdAt: now,
    updatedAt: now,
    decidedAt: data.decidedAt || null,
    archivedAt: data.archivedAt || null
  }

  db.insert(schema.decisions).values(row).run()
  return mapDecisionRow(row)
}

export function updateDecision(id: string, data: Partial<Decision>): Decision {
  const db = getDb()
  const updates: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() }
  if (data.title) {
    updates.slug = slugify(data.title)
  }
  if (data.qualityBreakdown) {
    updates.qualityBreakdown = JSON.stringify(data.qualityBreakdown)
  }
  // Remove id from updates
  delete updates.id

  db.update(schema.decisions).set(updates).where(eq(schema.decisions.id, id)).run()
  const row = db.select().from(schema.decisions).where(eq(schema.decisions.id, id)).get()
  return mapDecisionRow(row!)
}

export function deleteDecision(id: string): void {
  const db = getDb()
  db.delete(schema.decisions).where(eq(schema.decisions.id, id)).run()
}

// ---- Options ----

export function createOption(data: Partial<Option>): Option {
  const db = getDb()
  const id = data.id || randomId()
  const row = {
    id,
    decisionId: data.decisionId!,
    title: data.title || 'New Option',
    description: data.description || '',
    pros: JSON.stringify(data.pros || []),
    cons: JSON.stringify(data.cons || []),
    estimatedEffort: data.estimatedEffort || null,
    estimatedCost: data.estimatedCost || null,
    timeToValue: data.timeToValue || null,
    isRecommended: data.isRecommended || false,
    isChosen: data.isChosen || false,
    eliminatedReason: data.eliminatedReason || null,
    sortOrder: data.sortOrder || 0,
    optimizesFor: JSON.stringify(data.optimizesFor || []),
    sacrifices: JSON.stringify(data.sacrifices || []),
    optionAssumptions: JSON.stringify(data.optionAssumptions || []),
    riskProfile: data.riskProfile || null
  }
  db.insert(schema.options).values(row).run()
  return mapOptionRow(row)
}

export function updateOption(id: string, data: Partial<Option>): Option {
  const db = getDb()
  const updates: Record<string, unknown> = { ...data }
  if (data.pros) updates.pros = JSON.stringify(data.pros)
  if (data.cons) updates.cons = JSON.stringify(data.cons)
  if (data.optimizesFor) updates.optimizesFor = JSON.stringify(data.optimizesFor)
  if (data.sacrifices) updates.sacrifices = JSON.stringify(data.sacrifices)
  if (data.optionAssumptions) updates.optionAssumptions = JSON.stringify(data.optionAssumptions)
  delete updates.id
  db.update(schema.options).set(updates).where(eq(schema.options.id, id)).run()
  const row = db.select().from(schema.options).where(eq(schema.options.id, id)).get()
  return mapOptionRow(row!)
}

export function deleteOption(id: string): void {
  const db = getDb()
  db.delete(schema.options).where(eq(schema.options.id, id)).run()
}

// ---- Evidence ----

export function createEvidence(data: Partial<Evidence>): Evidence {
  const db = getDb()
  const id = data.id || randomId()
  const now = new Date().toISOString()
  const row = {
    id,
    decisionId: data.decisionId!,
    optionId: data.optionId || null,
    type: data.type || 'data_point',
    title: data.title || 'New Evidence',
    content: data.content || '',
    sourceUrl: data.sourceUrl || null,
    sourceLabel: data.sourceLabel || null,
    confidence: data.confidence || 'moderate',
    createdAt: now,
    weight: data.weight ?? 1.0,
    direction: data.direction || null,
    conflictsWith: JSON.stringify(data.conflictsWith || []),
    collectedAt: data.collectedAt || null,
    expiresAt: data.expiresAt || null
  }
  db.insert(schema.evidence).values(row).run()
  return mapEvidenceRow(row)
}

export function updateEvidence(id: string, data: Partial<Evidence>): Evidence {
  const db = getDb()
  const updates: Record<string, unknown> = { ...data }
  if (data.conflictsWith) updates.conflictsWith = JSON.stringify(data.conflictsWith)
  delete updates.id
  db.update(schema.evidence).set(updates).where(eq(schema.evidence.id, id)).run()
  const row = db.select().from(schema.evidence).where(eq(schema.evidence.id, id)).get()
  return mapEvidenceRow(row!)
}

export function deleteEvidence(id: string): void {
  const db = getDb()
  db.delete(schema.evidence).where(eq(schema.evidence.id, id)).run()
}

// ---- Assumptions ----

export function createAssumption(data: Partial<Assumption>): Assumption {
  const db = getDb()
  const id = data.id || randomId()
  const row = {
    id,
    decisionId: data.decisionId!,
    statement: data.statement || '',
    status: data.status || 'untested',
    riskIfWrong: data.riskIfWrong || null,
    validationMethod: data.validationMethod || null,
    aiSuggested: data.aiSuggested || false,
    createdAt: new Date().toISOString(),
    linkedOptionIds: JSON.stringify(data.linkedOptionIds || []),
    linkedEvidenceIds: JSON.stringify(data.linkedEvidenceIds || []),
    impactIfFlipped: data.impactIfFlipped || null,
    validationDeadline: data.validationDeadline || null,
    priority: data.priority || 'medium'
  }
  db.insert(schema.assumptions).values(row).run()
  return mapAssumptionRow(row)
}

export function updateAssumption(id: string, data: Partial<Assumption>): Assumption {
  const db = getDb()
  const updates: Record<string, unknown> = { ...data }
  if (data.linkedOptionIds) updates.linkedOptionIds = JSON.stringify(data.linkedOptionIds)
  if (data.linkedEvidenceIds) updates.linkedEvidenceIds = JSON.stringify(data.linkedEvidenceIds)
  delete updates.id
  db.update(schema.assumptions).set(updates).where(eq(schema.assumptions.id, id)).run()
  const row = db.select().from(schema.assumptions).where(eq(schema.assumptions.id, id)).get()
  return mapAssumptionRow(row!)
}

export function deleteAssumption(id: string): void {
  const db = getDb()
  db.delete(schema.assumptions).where(eq(schema.assumptions.id, id)).run()
}

// ---- Stakeholders ----

export function createStakeholder(data: Partial<Stakeholder>): Stakeholder {
  const db = getDb()
  const id = data.id || randomId()
  const row = {
    id,
    decisionId: data.decisionId!,
    name: data.name || '',
    role: data.role || null,
    involvement: data.involvement || 'informed',
    stance: data.stance || 'unknown',
    createdAt: new Date().toISOString()
  }
  db.insert(schema.stakeholders).values(row).run()
  return mapStakeholderRow(row)
}

export function updateStakeholder(id: string, data: Partial<Stakeholder>): Stakeholder {
  const db = getDb()
  const updates = { ...data }
  delete updates.id
  db.update(schema.stakeholders).set(updates).where(eq(schema.stakeholders.id, id)).run()
  const row = db.select().from(schema.stakeholders).where(eq(schema.stakeholders.id, id)).get()
  return mapStakeholderRow(row!)
}

export function deleteStakeholder(id: string): void {
  const db = getDb()
  db.delete(schema.stakeholders).where(eq(schema.stakeholders.id, id)).run()
}

// ---- Row mappers ----

function mapDecisionRow(row: Record<string, unknown>): Decision {
  return {
    id: row.id as string,
    title: row.title as string,
    slug: row.slug as string,
    phase: ((row.phase as string) || 'spark') as Decision['phase'],
    rawIdea: (row.rawIdea as string) || (row.raw_idea as string) || '',
    context: (row.context as string) || '',
    problemStatement: (row.problemStatement as string) || (row.problem_statement as string) || '',
    chosenOptionId: (row.chosenOptionId as string) || (row.chosen_option_id as string) || null,
    rationale: (row.rationale as string) || '',
    status: (row.status as Decision['status']) || 'draft',
    reversibility: (row.reversibility as Decision['reversibility']) || null,
    urgency: (row.urgency as Decision['urgency']) || null,
    impact: (row.impact as Decision['impact']) || null,
    qualityScore: (row.qualityScore as number) || (row.quality_score as number) || null,
    qualityBreakdown: parseJson(
      (row.qualityBreakdown as string) || (row.quality_breakdown as string)
    ) as Record<string, number> | null,
    createdAt: (row.createdAt as string) || (row.created_at as string) || '',
    updatedAt: (row.updatedAt as string) || (row.updated_at as string) || '',
    decidedAt: (row.decidedAt as string) || (row.decided_at as string) || null,
    archivedAt: (row.archivedAt as string) || (row.archived_at as string) || null
  }
}

function mapOptionRow(row: Record<string, unknown>): Option {
  return {
    id: row.id as string,
    decisionId: (row.decisionId as string) || (row.decision_id as string),
    title: row.title as string,
    description: (row.description as string) || '',
    pros: parseJson((row.pros as string) || '[]') as ProCon[],
    cons: parseJson((row.cons as string) || '[]') as ProCon[],
    estimatedEffort:
      (row.estimatedEffort as string) || (row.estimated_effort as string) || null,
    estimatedCost: (row.estimatedCost as string) || (row.estimated_cost as string) || null,
    timeToValue: (row.timeToValue as string) || (row.time_to_value as string) || null,
    isRecommended: Boolean(row.isRecommended ?? row.is_recommended),
    isChosen: Boolean(row.isChosen ?? row.is_chosen),
    eliminatedReason:
      (row.eliminatedReason as string) || (row.eliminated_reason as string) || null,
    sortOrder: (row.sortOrder as number) || (row.sort_order as number) || 0,
    optimizesFor: (parseJson(
      (row.optimizesFor as string) || (row.optimizes_for as string) || '[]'
    ) || []) as string[],
    sacrifices: (parseJson(
      (row.sacrifices as string) || '[]'
    ) || []) as string[],
    optionAssumptions: (parseJson(
      (row.optionAssumptions as string) || (row.option_assumptions as string) || '[]'
    ) || []) as string[],
    riskProfile:
      ((row.riskProfile as string) || (row.risk_profile as string) || null) as Option['riskProfile']
  }
}

function mapEvidenceRow(row: Record<string, unknown>): Evidence {
  return {
    id: row.id as string,
    decisionId: (row.decisionId as string) || (row.decision_id as string),
    optionId: (row.optionId as string) || (row.option_id as string) || null,
    type: row.type as Evidence['type'],
    title: row.title as string,
    content: (row.content as string) || '',
    sourceUrl: (row.sourceUrl as string) || (row.source_url as string) || null,
    sourceLabel: (row.sourceLabel as string) || (row.source_label as string) || null,
    confidence: (row.confidence as Evidence['confidence']) || 'moderate',
    createdAt: (row.createdAt as string) || (row.created_at as string) || '',
    weight: (row.weight as number) ?? 1.0,
    direction: (row.direction as Evidence['direction']) || null,
    conflictsWith: (parseJson(
      (row.conflictsWith as string) || (row.conflicts_with as string) || '[]'
    ) || []) as string[],
    collectedAt: (row.collectedAt as string) || (row.collected_at as string) || null,
    expiresAt: (row.expiresAt as string) || (row.expires_at as string) || null
  }
}

function mapAssumptionRow(row: Record<string, unknown>): Assumption {
  return {
    id: row.id as string,
    decisionId: (row.decisionId as string) || (row.decision_id as string),
    statement: row.statement as string,
    status: (row.status as Assumption['status']) || 'untested',
    riskIfWrong: (row.riskIfWrong as string) || (row.risk_if_wrong as string) || null,
    validationMethod:
      (row.validationMethod as string) || (row.validation_method as string) || null,
    aiSuggested: Boolean(row.aiSuggested ?? row.ai_suggested),
    createdAt: (row.createdAt as string) || (row.created_at as string) || '',
    linkedOptionIds: (parseJson(
      (row.linkedOptionIds as string) || (row.linked_option_ids as string) || '[]'
    ) || []) as string[],
    linkedEvidenceIds: (parseJson(
      (row.linkedEvidenceIds as string) || (row.linked_evidence_ids as string) || '[]'
    ) || []) as string[],
    impactIfFlipped:
      (row.impactIfFlipped as string) || (row.impact_if_flipped as string) || null,
    validationDeadline:
      (row.validationDeadline as string) || (row.validation_deadline as string) || null,
    priority:
      ((row.priority as string) as Assumption['priority']) || 'medium'
  }
}

function mapStakeholderRow(row: Record<string, unknown>): Stakeholder {
  return {
    id: row.id as string,
    decisionId: (row.decisionId as string) || (row.decision_id as string),
    name: row.name as string,
    role: (row.role as string) || null,
    involvement: (row.involvement as Stakeholder['involvement']) || 'informed',
    stance: (row.stance as Stakeholder['stance']) || 'unknown',
    createdAt: (row.createdAt as string) || (row.created_at as string) || ''
  }
}

function parseJson(str: string | null | undefined): unknown {
  if (!str) return null
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}
