export const DECISION_STATUS = [
  'draft',
  'exploring',
  'deciding',
  'decided',
  'revisiting',
  'superseded'
] as const
export type DecisionStatus = (typeof DECISION_STATUS)[number]

export const REVERSIBILITY = [
  'easily_reversible',
  'costly_to_reverse',
  'irreversible'
] as const
export type Reversibility = (typeof REVERSIBILITY)[number]

export const URGENCY = ['low', 'medium', 'high', 'critical'] as const
export type Urgency = (typeof URGENCY)[number]

export const IMPACT = ['low', 'medium', 'high', 'transformative'] as const
export type Impact = (typeof IMPACT)[number]

export const EVIDENCE_TYPE = [
  'data_point',
  'user_research',
  'market_data',
  'competitor_intel',
  'expert_opinion',
  'analogy',
  'assumption',
  'constraint'
] as const
export type EvidenceType = (typeof EVIDENCE_TYPE)[number]

export const CONFIDENCE = [
  'verified',
  'high',
  'moderate',
  'low',
  'speculation'
] as const
export type Confidence = (typeof CONFIDENCE)[number]

export const ASSUMPTION_STATUS = [
  'untested',
  'testing',
  'validated',
  'invalidated'
] as const
export type AssumptionStatus = (typeof ASSUMPTION_STATUS)[number]

export const STAKEHOLDER_INVOLVEMENT = [
  'decider',
  'approver',
  'consulted',
  'informed'
] as const
export type StakeholderInvolvement = (typeof STAKEHOLDER_INVOLVEMENT)[number]

export const STAKEHOLDER_STANCE = [
  'supportive',
  'neutral',
  'concerned',
  'opposed',
  'unknown'
] as const
export type StakeholderStance = (typeof STAKEHOLDER_STANCE)[number]

export const AI_MODE = [
  'tuner',
  'brainstorm',
  'decision_coach',
  'option_analyst',
  'quality_reviewer'
] as const
export type AIMode = (typeof AI_MODE)[number]

export const AI_MODE_LABELS: Record<AIMode, string> = {
  tuner: 'Tuner',
  brainstorm: 'Brainstorm',
  decision_coach: 'Coach',
  option_analyst: 'Analyze',
  quality_reviewer: 'Quality Review'
}

export const IDEA_PHASE = ['spark', 'shaping'] as const
export type IdeaPhase = (typeof IDEA_PHASE)[number]

export const IDEA_PHASE_LABELS: Record<IdeaPhase, string> = {
  spark: 'Spark',
  shaping: 'Shape'
}

export const IDEA_PHASE_COLORS: Record<IdeaPhase, string> = {
  spark: 'bg-amber-100 text-amber-700',
  shaping: 'bg-blue-100 text-blue-700'
}

export const RISK_PROFILE = ['conservative', 'moderate', 'aggressive'] as const
export type RiskProfile = (typeof RISK_PROFILE)[number]

export const ASSUMPTION_PRIORITY = ['critical', 'high', 'medium', 'low'] as const
export type AssumptionPriority = (typeof ASSUMPTION_PRIORITY)[number]

export const EVIDENCE_DIRECTION = ['supports', 'contradicts', 'neutral'] as const
export type EvidenceDirection = (typeof EVIDENCE_DIRECTION)[number]

export const WEIGHT = ['minor', 'moderate', 'major'] as const
export type Weight = (typeof WEIGHT)[number]

export const CANVAS_REGENERATE_PROMPT =
  'Rebuild the canvas from scratch based on everything we\'ve discussed. Review the full conversation and emit a fresh, accurate [CANVAS] reflecting the current state of the idea — drop anything we\'ve moved past, add anything new.'

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
] as const
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number]
