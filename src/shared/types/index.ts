import type {
  DecisionStatus,
  Reversibility,
  Urgency,
  Impact,
  EvidenceType,
  Confidence,
  AssumptionStatus,
  StakeholderInvolvement,
  StakeholderStance,
  AIMode,
  Weight,
  RiskProfile,
  AssumptionPriority,
  EvidenceDirection,
  IdeaPhase,
  AcceptedImageType
} from '../constants'

export type {
  DecisionStatus,
  Reversibility,
  Urgency,
  Impact,
  EvidenceType,
  Confidence,
  AssumptionStatus,
  StakeholderInvolvement,
  StakeholderStance,
  AIMode,
  Weight,
  RiskProfile,
  AssumptionPriority,
  EvidenceDirection,
  IdeaPhase,
  AcceptedImageType
}

// ---- Canvas types ----

export interface CanvasItem {
  id: string
  content: string
}

export interface CanvasOption extends CanvasItem {
  pros: string[]
  cons: string[]
}

export interface CanvasAssumption extends CanvasItem {
  status: 'untested' | 'validated' | 'invalidated'
  riskIfWrong?: string
}

export interface CanvasEvidence extends CanvasItem {
  type: string
  confidence: string
  direction?: 'supports' | 'contradicts' | 'neutral'
}

export interface CanvasRisk extends CanvasItem {
  severity?: 'low' | 'medium' | 'high'
}

export interface IdeaCanvas {
  problem?: string
  context?: string
  options: CanvasOption[]
  assumptions: CanvasAssumption[]
  evidence: CanvasEvidence[]
  risks: CanvasRisk[]
  stakeholders: CanvasItem[]
  tradeoffs: CanvasItem[]
}

// ---- Data types ----

export interface ProCon {
  text: string
  weight: Weight
}

export interface Decision {
  id: string
  title: string
  slug: string
  phase: IdeaPhase
  rawIdea: string
  context: string
  problemStatement: string
  chosenOptionId: string | null
  rationale: string
  status: DecisionStatus
  reversibility: Reversibility | null
  urgency: Urgency | null
  impact: Impact | null
  qualityScore: number | null
  qualityBreakdown: Record<string, number> | null
  createdAt: string
  updatedAt: string
  decidedAt: string | null
  archivedAt: string | null
}

export interface DecisionWithRelations extends Decision {
  options: Option[]
  evidence: Evidence[]
  assumptions: Assumption[]
  stakeholders: Stakeholder[]
  tags: Tag[]
}

export interface Option {
  id: string
  decisionId: string
  title: string
  description: string
  pros: ProCon[]
  cons: ProCon[]
  estimatedEffort: string | null
  estimatedCost: string | null
  timeToValue: string | null
  isRecommended: boolean
  isChosen: boolean
  eliminatedReason: string | null
  sortOrder: number
  // Phase 2: tradeoffs
  optimizesFor: string[]
  sacrifices: string[]
  optionAssumptions: string[]
  riskProfile: RiskProfile | null
}

export interface Evidence {
  id: string
  decisionId: string
  optionId: string | null
  type: EvidenceType
  title: string
  content: string
  sourceUrl: string | null
  sourceLabel: string | null
  confidence: Confidence
  createdAt: string
  // Phase 4: evidence system
  weight: number
  direction: EvidenceDirection | null
  conflictsWith: string[]
  collectedAt: string | null
  expiresAt: string | null
}

export interface Assumption {
  id: string
  decisionId: string
  statement: string
  status: AssumptionStatus
  riskIfWrong: string | null
  validationMethod: string | null
  aiSuggested: boolean
  createdAt: string
  // Phase 2: active assumptions
  linkedOptionIds: string[]
  linkedEvidenceIds: string[]
  impactIfFlipped: string | null
  validationDeadline: string | null
  priority: AssumptionPriority
}

export interface Stakeholder {
  id: string
  decisionId: string
  name: string
  role: string | null
  involvement: StakeholderInvolvement
  stance: StakeholderStance
  createdAt: string
}

export interface AIConversation {
  id: string
  decisionId: string
  mode: AIMode
  messages: AIMessage[]
  canvasState: IdeaCanvas | null
  createdAt: string
  updatedAt: string
  label: string | null
  parentConversationId: string | null
}

export interface ThreadSummary {
  id: string
  label: string | null
  updatedAt: string
}

export interface ImageAttachment {
  data: string // base64-encoded
  mediaType: AcceptedImageType
  name: string
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  images?: ImageAttachment[]
}

export interface Tag {
  id: string
  name: string
  color: string | null
}

// ---- IPC Contract ----

export interface IpcApi {
  // Decisions
  'decisions:list': () => Promise<Decision[]>
  'decisions:get': (id: string) => Promise<DecisionWithRelations | null>
  'decisions:create': (data: Partial<Decision>) => Promise<Decision>
  'decisions:update': (id: string, data: Partial<Decision>) => Promise<Decision>
  'decisions:delete': (id: string) => Promise<void>
  'decisions:search': (query: string) => Promise<Decision[]>

  // Options
  'options:create': (data: Partial<Option>) => Promise<Option>
  'options:update': (id: string, data: Partial<Option>) => Promise<Option>
  'options:delete': (id: string) => Promise<void>

  // Evidence
  'evidence:create': (data: Partial<Evidence>) => Promise<Evidence>
  'evidence:update': (id: string, data: Partial<Evidence>) => Promise<Evidence>
  'evidence:delete': (id: string) => Promise<void>

  // Assumptions
  'assumptions:create': (data: Partial<Assumption>) => Promise<Assumption>
  'assumptions:update': (id: string, data: Partial<Assumption>) => Promise<Assumption>
  'assumptions:delete': (id: string) => Promise<void>

  // Stakeholders
  'stakeholders:create': (data: Partial<Stakeholder>) => Promise<Stakeholder>
  'stakeholders:update': (id: string, data: Partial<Stakeholder>) => Promise<Stakeholder>
  'stakeholders:delete': (id: string) => Promise<void>

  // AI
  'ai:sendMessage': (params: {
    decisionId: string
    message: string
    mode: AIMode
    conversationId?: string
    images?: ImageAttachment[]
  }) => Promise<{ conversationId: string }>
  'ai:stopStream': () => Promise<void>
  'ai:getConversation': (id: string) => Promise<AIConversation | null>
  'ai:getLatestConversation': (decisionId: string) => Promise<AIConversation | null>
  'ai:listConversations': (decisionId: string) => Promise<ThreadSummary[]>
  'ai:createThread': (params: {
    decisionId: string
    label: string
    initialCanvas: IdeaCanvas | null
    mode: AIMode
  }) => Promise<AIConversation>

  // Settings
  'settings:getApiKey': () => Promise<string | null>
  'settings:setApiKey': (key: string) => Promise<void>
  'settings:removeApiKey': () => Promise<void>
  'settings:validateApiKey': (key: string) => Promise<boolean>

  // Export
  'export:markdown': (decisionId: string) => Promise<string>
}

// IPC event types (main → renderer)
export interface IpcEvents {
  'ai:stream:start': { conversationId: string }
  'ai:stream:delta': { conversationId: string; content: string }
  'ai:stream:canvas': { conversationId: string; canvas: IdeaCanvas }
  'ai:stream:title': { conversationId: string; title: string }
  'ai:stream:end': { conversationId: string }
  'ai:stream:error': { conversationId: string; error: string }
}
