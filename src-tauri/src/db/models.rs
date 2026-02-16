use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Decision {
    pub id: String,
    pub title: String,
    pub slug: String,
    pub phase: String,
    pub raw_idea: String,
    pub context: String,
    pub problem_statement: String,
    pub chosen_option_id: Option<String>,
    pub rationale: String,
    pub status: String,
    pub reversibility: Option<String>,
    pub urgency: Option<String>,
    pub impact: Option<String>,
    pub quality_score: Option<f64>,
    pub quality_breakdown: Option<serde_json::Value>,
    pub created_at: String,
    pub updated_at: String,
    pub decided_at: Option<String>,
    pub archived_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DecisionWithRelations {
    #[serde(flatten)]
    pub decision: Decision,
    pub options: Vec<OptionModel>,
    pub evidence: Vec<Evidence>,
    pub assumptions: Vec<Assumption>,
    pub stakeholders: Vec<Stakeholder>,
    pub tags: Vec<Tag>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OptionModel {
    pub id: String,
    pub decision_id: String,
    pub title: String,
    pub description: String,
    pub pros: serde_json::Value,
    pub cons: serde_json::Value,
    pub estimated_effort: Option<String>,
    pub estimated_cost: Option<String>,
    pub time_to_value: Option<String>,
    pub is_recommended: bool,
    pub is_chosen: bool,
    pub eliminated_reason: Option<String>,
    pub sort_order: i32,
    pub optimizes_for: serde_json::Value,
    pub sacrifices: serde_json::Value,
    pub option_assumptions: serde_json::Value,
    pub risk_profile: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Evidence {
    pub id: String,
    pub decision_id: String,
    pub option_id: Option<String>,
    #[serde(rename = "type")]
    pub evidence_type: String,
    pub title: String,
    pub content: String,
    pub source_url: Option<String>,
    pub source_label: Option<String>,
    pub confidence: String,
    pub created_at: String,
    pub weight: f64,
    pub direction: Option<String>,
    pub conflicts_with: serde_json::Value,
    pub collected_at: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Assumption {
    pub id: String,
    pub decision_id: String,
    pub statement: String,
    pub status: String,
    pub risk_if_wrong: Option<String>,
    pub validation_method: Option<String>,
    pub ai_suggested: bool,
    pub created_at: String,
    pub linked_option_ids: serde_json::Value,
    pub linked_evidence_ids: serde_json::Value,
    pub impact_if_flipped: Option<String>,
    pub validation_deadline: Option<String>,
    pub priority: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Stakeholder {
    pub id: String,
    pub decision_id: String,
    pub name: String,
    pub role: Option<String>,
    pub involvement: String,
    pub stance: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AiConversation {
    pub id: String,
    pub decision_id: String,
    pub mode: String,
    pub messages: serde_json::Value,
    pub canvas_state: Option<serde_json::Value>,
    pub created_at: String,
    pub updated_at: String,
    pub label: Option<String>,
    pub parent_conversation_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ThreadSummary {
    pub id: String,
    pub label: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
}

// Input types for create/update operations

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDecisionInput {
    pub id: Option<String>,
    pub title: Option<String>,
    pub phase: Option<String>,
    pub raw_idea: Option<String>,
    pub context: Option<String>,
    pub problem_statement: Option<String>,
    pub rationale: Option<String>,
    pub status: Option<String>,
    pub reversibility: Option<String>,
    pub urgency: Option<String>,
    pub impact: Option<String>,
    pub quality_score: Option<f64>,
    pub quality_breakdown: Option<serde_json::Value>,
    pub chosen_option_id: Option<String>,
    pub decided_at: Option<String>,
    pub archived_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDecisionInput {
    pub title: Option<String>,
    pub phase: Option<String>,
    pub raw_idea: Option<String>,
    pub context: Option<String>,
    pub problem_statement: Option<String>,
    pub rationale: Option<String>,
    pub status: Option<String>,
    pub reversibility: Option<String>,
    pub urgency: Option<String>,
    pub impact: Option<String>,
    pub quality_score: Option<f64>,
    pub quality_breakdown: Option<serde_json::Value>,
    pub chosen_option_id: Option<String>,
    pub decided_at: Option<String>,
    pub archived_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOptionInput {
    pub id: Option<String>,
    pub decision_id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub pros: Option<serde_json::Value>,
    pub cons: Option<serde_json::Value>,
    pub estimated_effort: Option<String>,
    pub estimated_cost: Option<String>,
    pub time_to_value: Option<String>,
    pub is_recommended: Option<bool>,
    pub is_chosen: Option<bool>,
    pub eliminated_reason: Option<String>,
    pub sort_order: Option<i32>,
    pub optimizes_for: Option<serde_json::Value>,
    pub sacrifices: Option<serde_json::Value>,
    pub option_assumptions: Option<serde_json::Value>,
    pub risk_profile: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOptionInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub pros: Option<serde_json::Value>,
    pub cons: Option<serde_json::Value>,
    pub estimated_effort: Option<String>,
    pub estimated_cost: Option<String>,
    pub time_to_value: Option<String>,
    pub is_recommended: Option<bool>,
    pub is_chosen: Option<bool>,
    pub eliminated_reason: Option<String>,
    pub sort_order: Option<i32>,
    pub optimizes_for: Option<serde_json::Value>,
    pub sacrifices: Option<serde_json::Value>,
    pub option_assumptions: Option<serde_json::Value>,
    pub risk_profile: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEvidenceInput {
    pub id: Option<String>,
    pub decision_id: String,
    pub option_id: Option<String>,
    #[serde(rename = "type")]
    pub evidence_type: Option<String>,
    pub title: Option<String>,
    pub content: Option<String>,
    pub source_url: Option<String>,
    pub source_label: Option<String>,
    pub confidence: Option<String>,
    pub weight: Option<f64>,
    pub direction: Option<String>,
    pub conflicts_with: Option<serde_json::Value>,
    pub collected_at: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEvidenceInput {
    pub option_id: Option<String>,
    #[serde(rename = "type")]
    pub evidence_type: Option<String>,
    pub title: Option<String>,
    pub content: Option<String>,
    pub source_url: Option<String>,
    pub source_label: Option<String>,
    pub confidence: Option<String>,
    pub weight: Option<f64>,
    pub direction: Option<String>,
    pub conflicts_with: Option<serde_json::Value>,
    pub collected_at: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAssumptionInput {
    pub id: Option<String>,
    pub decision_id: String,
    pub statement: Option<String>,
    pub status: Option<String>,
    pub risk_if_wrong: Option<String>,
    pub validation_method: Option<String>,
    pub ai_suggested: Option<bool>,
    pub linked_option_ids: Option<serde_json::Value>,
    pub linked_evidence_ids: Option<serde_json::Value>,
    pub impact_if_flipped: Option<String>,
    pub validation_deadline: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAssumptionInput {
    pub statement: Option<String>,
    pub status: Option<String>,
    pub risk_if_wrong: Option<String>,
    pub validation_method: Option<String>,
    pub ai_suggested: Option<bool>,
    pub linked_option_ids: Option<serde_json::Value>,
    pub linked_evidence_ids: Option<serde_json::Value>,
    pub impact_if_flipped: Option<String>,
    pub validation_deadline: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateStakeholderInput {
    pub id: Option<String>,
    pub decision_id: String,
    pub name: Option<String>,
    pub role: Option<String>,
    pub involvement: Option<String>,
    pub stance: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStakeholderInput {
    pub name: Option<String>,
    pub role: Option<String>,
    pub involvement: Option<String>,
    pub stance: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateThreadInput {
    pub decision_id: String,
    pub label: String,
    pub initial_canvas: Option<serde_json::Value>,
    pub mode: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveMessagesInput {
    pub conversation_id: String,
    pub messages: serde_json::Value,
    pub canvas_state: Option<serde_json::Value>,
}
