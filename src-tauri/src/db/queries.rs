use rusqlite::{params, Connection};
use serde_json;
use uuid::Uuid;

use super::models::*;

fn new_id() -> String {
    Uuid::new_v4().to_string().replace("-", "")
}

fn slugify(text: &str) -> String {
    let s: String = text
        .to_lowercase()
        .trim()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == ' ' || c == '_' {
                c
            } else {
                ' '
            }
        })
        .collect();

    let slug: String = s
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join("-");

    if slug.len() > 100 {
        slug[..100].to_string()
    } else {
        slug
    }
}

fn now_iso() -> String {
    chrono_free_now()
}

fn chrono_free_now() -> String {
    // Use a simple approach without chrono dependency
    // SQLite's datetime('now') is used for DB defaults;
    // for Rust-generated timestamps we use a simple format
    let duration = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap();
    let secs = duration.as_secs();
    // Convert to approximate ISO format
    let days_since_epoch = secs / 86400;
    let time_of_day = secs % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    // Simple date calculation from days since epoch (1970-01-01)
    let (year, month, day) = days_to_ymd(days_since_epoch as i64);

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.000Z",
        year, month, day, hours, minutes, seconds
    )
}

fn days_to_ymd(mut days: i64) -> (i64, i64, i64) {
    // Algorithm from http://howardhinnant.github.io/date_algorithms.html
    days += 719468;
    let era = if days >= 0 { days } else { days - 146096 } / 146097;
    let doe = days - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

fn parse_json_or_default(s: Option<String>, default: &str) -> serde_json::Value {
    match s {
        Some(ref val) if !val.is_empty() => {
            serde_json::from_str(val).unwrap_or_else(|_| serde_json::from_str(default).unwrap())
        }
        _ => serde_json::from_str(default).unwrap(),
    }
}

// ---- Decisions ----

pub fn list_decisions(conn: &Connection) -> Result<Vec<Decision>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, slug, phase, raw_idea, context, problem_statement,
                    chosen_option_id, rationale, status, reversibility, urgency, impact,
                    quality_score, quality_breakdown, created_at, updated_at, decided_at, archived_at
             FROM decisions ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| Ok(map_decision_row(row)))
        .map_err(|e| e.to_string())?;

    let mut decisions = Vec::new();
    for row in rows {
        decisions.push(row.map_err(|e| e.to_string())?);
    }
    Ok(decisions)
}

pub fn get_decision(conn: &Connection, id: &str) -> Result<Option<DecisionWithRelations>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, slug, phase, raw_idea, context, problem_statement,
                    chosen_option_id, rationale, status, reversibility, urgency, impact,
                    quality_score, quality_breakdown, created_at, updated_at, decided_at, archived_at
             FROM decisions WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let decision = stmt
        .query_row(params![id], |row| Ok(map_decision_row(row)))
        .optional()
        .map_err(|e| e.to_string())?;

    let decision = match decision {
        Some(d) => d,
        None => return Ok(None),
    };

    let options = list_options_for_decision(conn, id)?;
    let evidence = list_evidence_for_decision(conn, id)?;
    let assumptions = list_assumptions_for_decision(conn, id)?;
    let stakeholders = list_stakeholders_for_decision(conn, id)?;
    let tags = list_tags_for_decision(conn, id)?;

    Ok(Some(DecisionWithRelations {
        decision,
        options,
        evidence,
        assumptions,
        stakeholders,
        tags,
    }))
}

pub fn create_decision(conn: &Connection, input: CreateDecisionInput) -> Result<Decision, String> {
    let id = input.id.unwrap_or_else(|| new_id());
    let title = input.title.unwrap_or_else(|| "Untitled Idea".to_string());
    let now = now_iso();
    let slug = slugify(&title);

    let quality_breakdown_str = input
        .quality_breakdown
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_default());

    conn.execute(
        "INSERT INTO decisions (id, title, slug, phase, raw_idea, context, problem_statement,
         rationale, status, reversibility, urgency, impact, quality_score, quality_breakdown,
         chosen_option_id, created_at, updated_at, decided_at, archived_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
        params![
            id,
            title,
            slug,
            input.phase.as_deref().unwrap_or("spark"),
            input.raw_idea.as_deref().unwrap_or(""),
            input.context.as_deref().unwrap_or(""),
            input.problem_statement.as_deref().unwrap_or(""),
            input.rationale.as_deref().unwrap_or(""),
            input.status.as_deref().unwrap_or("draft"),
            input.reversibility,
            input.urgency,
            input.impact,
            input.quality_score,
            quality_breakdown_str,
            input.chosen_option_id,
            now,
            now,
            input.decided_at,
            input.archived_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Decision {
        id,
        title,
        slug,
        phase: input.phase.unwrap_or_else(|| "spark".to_string()),
        raw_idea: input.raw_idea.unwrap_or_default(),
        context: input.context.unwrap_or_default(),
        problem_statement: input.problem_statement.unwrap_or_default(),
        chosen_option_id: input.chosen_option_id,
        rationale: input.rationale.unwrap_or_default(),
        status: input.status.unwrap_or_else(|| "draft".to_string()),
        reversibility: input.reversibility,
        urgency: input.urgency,
        impact: input.impact,
        quality_score: input.quality_score,
        quality_breakdown: input.quality_breakdown,
        created_at: now.clone(),
        updated_at: now,
        decided_at: input.decided_at,
        archived_at: input.archived_at,
    })
}

pub fn update_decision(
    conn: &Connection,
    id: &str,
    input: UpdateDecisionInput,
) -> Result<Decision, String> {
    let now = now_iso();

    // Get current values and merge with updates
    let current = get_decision_raw(conn, id)?
        .ok_or_else(|| format!("Decision not found: {}", id))?;

    let title = input.title.unwrap_or(current.title);
    let slug = slugify(&title);
    let phase = input.phase.unwrap_or(current.phase);
    let raw_idea = input.raw_idea.unwrap_or(current.raw_idea);
    let context = input.context.unwrap_or(current.context);
    let problem_statement = input.problem_statement.unwrap_or(current.problem_statement);
    let rationale = input.rationale.unwrap_or(current.rationale);
    let status = input.status.unwrap_or(current.status);
    let reversibility = input.reversibility.or(current.reversibility);
    let urgency = input.urgency.or(current.urgency);
    let impact = input.impact.or(current.impact);
    let quality_score = input.quality_score.or(current.quality_score);
    let quality_breakdown = input.quality_breakdown.or(current.quality_breakdown);
    let chosen_option_id = input.chosen_option_id.or(current.chosen_option_id);
    let decided_at = input.decided_at.or(current.decided_at);
    let archived_at = input.archived_at.or(current.archived_at);

    let quality_breakdown_str = quality_breakdown
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_default());

    conn.execute(
        "UPDATE decisions SET title = ?1, slug = ?2, phase = ?3, raw_idea = ?4,
         context = ?5, problem_statement = ?6, rationale = ?7, status = ?8,
         reversibility = ?9, urgency = ?10, impact = ?11, quality_score = ?12,
         quality_breakdown = ?13, chosen_option_id = ?14, updated_at = ?15,
         decided_at = ?16, archived_at = ?17
         WHERE id = ?18",
        params![
            title,
            slug,
            phase,
            raw_idea,
            context,
            problem_statement,
            rationale,
            status,
            reversibility,
            urgency,
            impact,
            quality_score,
            quality_breakdown_str,
            chosen_option_id,
            now,
            decided_at,
            archived_at,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Decision {
        id: id.to_string(),
        title,
        slug,
        phase,
        raw_idea,
        context,
        problem_statement,
        chosen_option_id,
        rationale,
        status,
        reversibility,
        urgency,
        impact,
        quality_score,
        quality_breakdown,
        created_at: current.created_at,
        updated_at: now,
        decided_at,
        archived_at,
    })
}

fn get_decision_raw(conn: &Connection, id: &str) -> Result<Option<Decision>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, slug, phase, raw_idea, context, problem_statement,
                    chosen_option_id, rationale, status, reversibility, urgency, impact,
                    quality_score, quality_breakdown, created_at, updated_at, decided_at, archived_at
             FROM decisions WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], |row| Ok(map_decision_row(row)))
        .optional()
        .map_err(|e| e.to_string())
}

pub fn delete_decision(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM decisions WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

pub fn search_decisions(conn: &Connection, query: &str) -> Result<Vec<Decision>, String> {
    if query.trim().is_empty() {
        return list_decisions(conn);
    }

    let fts_query = format!("{}*", query);
    let mut stmt = conn
        .prepare(
            "SELECT d.id, d.title, d.slug, d.phase, d.raw_idea, d.context, d.problem_statement,
                    d.chosen_option_id, d.rationale, d.status, d.reversibility, d.urgency, d.impact,
                    d.quality_score, d.quality_breakdown, d.created_at, d.updated_at, d.decided_at, d.archived_at
             FROM decisions d
             INNER JOIN decisions_fts fts ON d.rowid = fts.rowid
             WHERE decisions_fts MATCH ?1
             ORDER BY rank",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![fts_query], |row| Ok(map_decision_row(row)))
        .map_err(|e| e.to_string())?;

    let mut decisions = Vec::new();
    for row in rows {
        decisions.push(row.map_err(|e| e.to_string())?);
    }
    Ok(decisions)
}

// ---- Options ----

fn list_options_for_decision(
    conn: &Connection,
    decision_id: &str,
) -> Result<Vec<OptionModel>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, decision_id, title, description, pros, cons, estimated_effort,
                    estimated_cost, time_to_value, is_recommended, is_chosen, eliminated_reason,
                    sort_order, optimizes_for, sacrifices, option_assumptions, risk_profile
             FROM options WHERE decision_id = ?1 ORDER BY sort_order",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![decision_id], |row| Ok(map_option_row(row)))
        .map_err(|e| e.to_string())?;

    let mut options = Vec::new();
    for row in rows {
        options.push(row.map_err(|e| e.to_string())?);
    }
    Ok(options)
}

pub fn create_option(conn: &Connection, input: CreateOptionInput) -> Result<OptionModel, String> {
    let id = input.id.unwrap_or_else(|| new_id());
    let pros_str = input
        .pros
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()))
        .unwrap_or_else(|| "[]".to_string());
    let cons_str = input
        .cons
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()))
        .unwrap_or_else(|| "[]".to_string());
    let optimizes_for_str = input
        .optimizes_for
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()))
        .unwrap_or_else(|| "[]".to_string());
    let sacrifices_str = input
        .sacrifices
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()))
        .unwrap_or_else(|| "[]".to_string());
    let option_assumptions_str = input
        .option_assumptions
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()))
        .unwrap_or_else(|| "[]".to_string());

    conn.execute(
        "INSERT INTO options (id, decision_id, title, description, pros, cons, estimated_effort,
         estimated_cost, time_to_value, is_recommended, is_chosen, eliminated_reason, sort_order,
         optimizes_for, sacrifices, option_assumptions, risk_profile)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        params![
            id,
            input.decision_id,
            input.title.as_deref().unwrap_or("New Option"),
            input.description.as_deref().unwrap_or(""),
            pros_str,
            cons_str,
            input.estimated_effort,
            input.estimated_cost,
            input.time_to_value,
            input.is_recommended.unwrap_or(false) as i32,
            input.is_chosen.unwrap_or(false) as i32,
            input.eliminated_reason,
            input.sort_order.unwrap_or(0),
            optimizes_for_str,
            sacrifices_str,
            option_assumptions_str,
            input.risk_profile,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(OptionModel {
        id,
        decision_id: input.decision_id,
        title: input.title.unwrap_or_else(|| "New Option".to_string()),
        description: input.description.unwrap_or_default(),
        pros: input.pros.unwrap_or_else(|| serde_json::json!([])),
        cons: input.cons.unwrap_or_else(|| serde_json::json!([])),
        estimated_effort: input.estimated_effort,
        estimated_cost: input.estimated_cost,
        time_to_value: input.time_to_value,
        is_recommended: input.is_recommended.unwrap_or(false),
        is_chosen: input.is_chosen.unwrap_or(false),
        eliminated_reason: input.eliminated_reason,
        sort_order: input.sort_order.unwrap_or(0),
        optimizes_for: input.optimizes_for.unwrap_or_else(|| serde_json::json!([])),
        sacrifices: input.sacrifices.unwrap_or_else(|| serde_json::json!([])),
        option_assumptions: input
            .option_assumptions
            .unwrap_or_else(|| serde_json::json!([])),
        risk_profile: input.risk_profile,
    })
}

pub fn update_option(
    conn: &Connection,
    id: &str,
    input: UpdateOptionInput,
) -> Result<OptionModel, String> {
    // Get current
    let current = get_option_raw(conn, id)?
        .ok_or_else(|| format!("Option not found: {}", id))?;

    let title = input.title.unwrap_or(current.title);
    let description = input.description.unwrap_or(current.description);
    let pros = input.pros.unwrap_or(current.pros);
    let cons = input.cons.unwrap_or(current.cons);
    let estimated_effort = input.estimated_effort.or(current.estimated_effort);
    let estimated_cost = input.estimated_cost.or(current.estimated_cost);
    let time_to_value = input.time_to_value.or(current.time_to_value);
    let is_recommended = input.is_recommended.unwrap_or(current.is_recommended);
    let is_chosen = input.is_chosen.unwrap_or(current.is_chosen);
    let eliminated_reason = input.eliminated_reason.or(current.eliminated_reason);
    let sort_order = input.sort_order.unwrap_or(current.sort_order);
    let optimizes_for = input.optimizes_for.unwrap_or(current.optimizes_for);
    let sacrifices = input.sacrifices.unwrap_or(current.sacrifices);
    let option_assumptions = input.option_assumptions.unwrap_or(current.option_assumptions);
    let risk_profile = input.risk_profile.or(current.risk_profile);

    conn.execute(
        "UPDATE options SET title = ?1, description = ?2, pros = ?3, cons = ?4,
         estimated_effort = ?5, estimated_cost = ?6, time_to_value = ?7,
         is_recommended = ?8, is_chosen = ?9, eliminated_reason = ?10, sort_order = ?11,
         optimizes_for = ?12, sacrifices = ?13, option_assumptions = ?14, risk_profile = ?15
         WHERE id = ?16",
        params![
            title,
            description,
            serde_json::to_string(&pros).unwrap_or_else(|_| "[]".to_string()),
            serde_json::to_string(&cons).unwrap_or_else(|_| "[]".to_string()),
            estimated_effort,
            estimated_cost,
            time_to_value,
            is_recommended as i32,
            is_chosen as i32,
            eliminated_reason,
            sort_order,
            serde_json::to_string(&optimizes_for).unwrap_or_else(|_| "[]".to_string()),
            serde_json::to_string(&sacrifices).unwrap_or_else(|_| "[]".to_string()),
            serde_json::to_string(&option_assumptions).unwrap_or_else(|_| "[]".to_string()),
            risk_profile,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(OptionModel {
        id: id.to_string(),
        decision_id: current.decision_id,
        title,
        description,
        pros,
        cons,
        estimated_effort,
        estimated_cost,
        time_to_value,
        is_recommended,
        is_chosen,
        eliminated_reason,
        sort_order,
        optimizes_for,
        sacrifices,
        option_assumptions,
        risk_profile,
    })
}

fn get_option_raw(conn: &Connection, id: &str) -> Result<Option<OptionModel>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, decision_id, title, description, pros, cons, estimated_effort,
                    estimated_cost, time_to_value, is_recommended, is_chosen, eliminated_reason,
                    sort_order, optimizes_for, sacrifices, option_assumptions, risk_profile
             FROM options WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], |row| Ok(map_option_row(row)))
        .optional()
        .map_err(|e| e.to_string())
}

pub fn delete_option(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM options WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---- Evidence ----

fn list_evidence_for_decision(
    conn: &Connection,
    decision_id: &str,
) -> Result<Vec<Evidence>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, decision_id, option_id, type, title, content, source_url, source_label,
                    confidence, created_at, weight, direction, conflicts_with, collected_at, expires_at
             FROM evidence WHERE decision_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![decision_id], |row| Ok(map_evidence_row(row)))
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

pub fn create_evidence(
    conn: &Connection,
    input: CreateEvidenceInput,
) -> Result<Evidence, String> {
    let id = input.id.unwrap_or_else(|| new_id());
    let now = now_iso();
    let conflicts_with_str = input
        .conflicts_with
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()))
        .unwrap_or_else(|| "[]".to_string());

    conn.execute(
        "INSERT INTO evidence (id, decision_id, option_id, type, title, content, source_url,
         source_label, confidence, created_at, weight, direction, conflicts_with, collected_at, expires_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![
            id,
            input.decision_id,
            input.option_id,
            input.evidence_type.as_deref().unwrap_or("data_point"),
            input.title.as_deref().unwrap_or("New Evidence"),
            input.content.as_deref().unwrap_or(""),
            input.source_url,
            input.source_label,
            input.confidence.as_deref().unwrap_or("moderate"),
            now,
            input.weight.unwrap_or(1.0),
            input.direction,
            conflicts_with_str,
            input.collected_at,
            input.expires_at,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Evidence {
        id,
        decision_id: input.decision_id,
        option_id: input.option_id,
        evidence_type: input.evidence_type.unwrap_or_else(|| "data_point".to_string()),
        title: input.title.unwrap_or_else(|| "New Evidence".to_string()),
        content: input.content.unwrap_or_default(),
        source_url: input.source_url,
        source_label: input.source_label,
        confidence: input.confidence.unwrap_or_else(|| "moderate".to_string()),
        created_at: now,
        weight: input.weight.unwrap_or(1.0),
        direction: input.direction,
        conflicts_with: input.conflicts_with.unwrap_or_else(|| serde_json::json!([])),
        collected_at: input.collected_at,
        expires_at: input.expires_at,
    })
}

pub fn update_evidence(
    conn: &Connection,
    id: &str,
    input: UpdateEvidenceInput,
) -> Result<Evidence, String> {
    let current = get_evidence_raw(conn, id)?
        .ok_or_else(|| format!("Evidence not found: {}", id))?;

    let option_id = input.option_id.or(current.option_id);
    let evidence_type = input.evidence_type.unwrap_or(current.evidence_type);
    let title = input.title.unwrap_or(current.title);
    let content = input.content.unwrap_or(current.content);
    let source_url = input.source_url.or(current.source_url);
    let source_label = input.source_label.or(current.source_label);
    let confidence = input.confidence.unwrap_or(current.confidence);
    let weight = input.weight.unwrap_or(current.weight);
    let direction = input.direction.or(current.direction);
    let conflicts_with = input.conflicts_with.unwrap_or(current.conflicts_with);
    let collected_at = input.collected_at.or(current.collected_at);
    let expires_at = input.expires_at.or(current.expires_at);

    conn.execute(
        "UPDATE evidence SET option_id = ?1, type = ?2, title = ?3, content = ?4,
         source_url = ?5, source_label = ?6, confidence = ?7, weight = ?8,
         direction = ?9, conflicts_with = ?10, collected_at = ?11, expires_at = ?12
         WHERE id = ?13",
        params![
            option_id,
            evidence_type,
            title,
            content,
            source_url,
            source_label,
            confidence,
            weight,
            direction,
            serde_json::to_string(&conflicts_with).unwrap_or_else(|_| "[]".to_string()),
            collected_at,
            expires_at,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Evidence {
        id: id.to_string(),
        decision_id: current.decision_id,
        option_id,
        evidence_type,
        title,
        content,
        source_url,
        source_label,
        confidence,
        created_at: current.created_at,
        weight,
        direction,
        conflicts_with,
        collected_at,
        expires_at,
    })
}

fn get_evidence_raw(conn: &Connection, id: &str) -> Result<Option<Evidence>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, decision_id, option_id, type, title, content, source_url, source_label,
                    confidence, created_at, weight, direction, conflicts_with, collected_at, expires_at
             FROM evidence WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], |row| Ok(map_evidence_row(row)))
        .optional()
        .map_err(|e| e.to_string())
}

pub fn delete_evidence(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM evidence WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---- Assumptions ----

fn list_assumptions_for_decision(
    conn: &Connection,
    decision_id: &str,
) -> Result<Vec<Assumption>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, decision_id, statement, status, risk_if_wrong, validation_method,
                    ai_suggested, created_at, linked_option_ids, linked_evidence_ids,
                    impact_if_flipped, validation_deadline, priority
             FROM assumptions WHERE decision_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![decision_id], |row| Ok(map_assumption_row(row)))
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

pub fn create_assumption(
    conn: &Connection,
    input: CreateAssumptionInput,
) -> Result<Assumption, String> {
    let id = input.id.unwrap_or_else(|| new_id());
    let now = now_iso();
    let linked_option_ids_str = input
        .linked_option_ids
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()))
        .unwrap_or_else(|| "[]".to_string());
    let linked_evidence_ids_str = input
        .linked_evidence_ids
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "[]".to_string()))
        .unwrap_or_else(|| "[]".to_string());

    conn.execute(
        "INSERT INTO assumptions (id, decision_id, statement, status, risk_if_wrong,
         validation_method, ai_suggested, created_at, linked_option_ids, linked_evidence_ids,
         impact_if_flipped, validation_deadline, priority)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            id,
            input.decision_id,
            input.statement.as_deref().unwrap_or(""),
            input.status.as_deref().unwrap_or("untested"),
            input.risk_if_wrong,
            input.validation_method,
            input.ai_suggested.unwrap_or(false) as i32,
            now,
            linked_option_ids_str,
            linked_evidence_ids_str,
            input.impact_if_flipped,
            input.validation_deadline,
            input.priority.as_deref().unwrap_or("medium"),
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Assumption {
        id,
        decision_id: input.decision_id,
        statement: input.statement.unwrap_or_default(),
        status: input.status.unwrap_or_else(|| "untested".to_string()),
        risk_if_wrong: input.risk_if_wrong,
        validation_method: input.validation_method,
        ai_suggested: input.ai_suggested.unwrap_or(false),
        created_at: now,
        linked_option_ids: input
            .linked_option_ids
            .unwrap_or_else(|| serde_json::json!([])),
        linked_evidence_ids: input
            .linked_evidence_ids
            .unwrap_or_else(|| serde_json::json!([])),
        impact_if_flipped: input.impact_if_flipped,
        validation_deadline: input.validation_deadline,
        priority: input.priority.unwrap_or_else(|| "medium".to_string()),
    })
}

pub fn update_assumption(
    conn: &Connection,
    id: &str,
    input: UpdateAssumptionInput,
) -> Result<Assumption, String> {
    let current = get_assumption_raw(conn, id)?
        .ok_or_else(|| format!("Assumption not found: {}", id))?;

    let statement = input.statement.unwrap_or(current.statement);
    let status = input.status.unwrap_or(current.status);
    let risk_if_wrong = input.risk_if_wrong.or(current.risk_if_wrong);
    let validation_method = input.validation_method.or(current.validation_method);
    let ai_suggested = input.ai_suggested.unwrap_or(current.ai_suggested);
    let linked_option_ids = input.linked_option_ids.unwrap_or(current.linked_option_ids);
    let linked_evidence_ids = input
        .linked_evidence_ids
        .unwrap_or(current.linked_evidence_ids);
    let impact_if_flipped = input.impact_if_flipped.or(current.impact_if_flipped);
    let validation_deadline = input.validation_deadline.or(current.validation_deadline);
    let priority = input.priority.unwrap_or(current.priority);

    conn.execute(
        "UPDATE assumptions SET statement = ?1, status = ?2, risk_if_wrong = ?3,
         validation_method = ?4, ai_suggested = ?5, linked_option_ids = ?6,
         linked_evidence_ids = ?7, impact_if_flipped = ?8, validation_deadline = ?9,
         priority = ?10 WHERE id = ?11",
        params![
            statement,
            status,
            risk_if_wrong,
            validation_method,
            ai_suggested as i32,
            serde_json::to_string(&linked_option_ids).unwrap_or_else(|_| "[]".to_string()),
            serde_json::to_string(&linked_evidence_ids).unwrap_or_else(|_| "[]".to_string()),
            impact_if_flipped,
            validation_deadline,
            priority,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Assumption {
        id: id.to_string(),
        decision_id: current.decision_id,
        statement,
        status,
        risk_if_wrong,
        validation_method,
        ai_suggested,
        created_at: current.created_at,
        linked_option_ids,
        linked_evidence_ids,
        impact_if_flipped,
        validation_deadline,
        priority,
    })
}

fn get_assumption_raw(conn: &Connection, id: &str) -> Result<Option<Assumption>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, decision_id, statement, status, risk_if_wrong, validation_method,
                    ai_suggested, created_at, linked_option_ids, linked_evidence_ids,
                    impact_if_flipped, validation_deadline, priority
             FROM assumptions WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], |row| Ok(map_assumption_row(row)))
        .optional()
        .map_err(|e| e.to_string())
}

pub fn delete_assumption(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM assumptions WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---- Stakeholders ----

fn list_stakeholders_for_decision(
    conn: &Connection,
    decision_id: &str,
) -> Result<Vec<Stakeholder>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, decision_id, name, role, involvement, stance, created_at
             FROM stakeholders WHERE decision_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![decision_id], |row| Ok(map_stakeholder_row(row)))
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

pub fn create_stakeholder(
    conn: &Connection,
    input: CreateStakeholderInput,
) -> Result<Stakeholder, String> {
    let id = input.id.unwrap_or_else(|| new_id());
    let now = now_iso();

    conn.execute(
        "INSERT INTO stakeholders (id, decision_id, name, role, involvement, stance, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            input.decision_id,
            input.name.as_deref().unwrap_or(""),
            input.role,
            input.involvement.as_deref().unwrap_or("informed"),
            input.stance.as_deref().unwrap_or("unknown"),
            now,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(Stakeholder {
        id,
        decision_id: input.decision_id,
        name: input.name.unwrap_or_default(),
        role: input.role,
        involvement: input.involvement.unwrap_or_else(|| "informed".to_string()),
        stance: input.stance.unwrap_or_else(|| "unknown".to_string()),
        created_at: now,
    })
}

pub fn update_stakeholder(
    conn: &Connection,
    id: &str,
    input: UpdateStakeholderInput,
) -> Result<Stakeholder, String> {
    let current = get_stakeholder_raw(conn, id)?
        .ok_or_else(|| format!("Stakeholder not found: {}", id))?;

    let name = input.name.unwrap_or(current.name);
    let role = input.role.or(current.role);
    let involvement = input.involvement.unwrap_or(current.involvement);
    let stance = input.stance.unwrap_or(current.stance);

    conn.execute(
        "UPDATE stakeholders SET name = ?1, role = ?2, involvement = ?3, stance = ?4
         WHERE id = ?5",
        params![name, role, involvement, stance, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(Stakeholder {
        id: id.to_string(),
        decision_id: current.decision_id,
        name,
        role,
        involvement,
        stance,
        created_at: current.created_at,
    })
}

fn get_stakeholder_raw(conn: &Connection, id: &str) -> Result<Option<Stakeholder>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, decision_id, name, role, involvement, stance, created_at
             FROM stakeholders WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], |row| Ok(map_stakeholder_row(row)))
        .optional()
        .map_err(|e| e.to_string())
}

pub fn delete_stakeholder(conn: &Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM stakeholders WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---- Tags ----

fn list_tags_for_decision(conn: &Connection, decision_id: &str) -> Result<Vec<Tag>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, t.color FROM tags t
             INNER JOIN decision_tags dt ON dt.tag_id = t.id
             WHERE dt.decision_id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![decision_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut tags = Vec::new();
    for row in rows {
        tags.push(row.map_err(|e| e.to_string())?);
    }
    Ok(tags)
}

// ---- AI Conversations ----

pub fn get_conversation(
    conn: &Connection,
    id: &str,
) -> Result<Option<AiConversation>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, decision_id, mode, messages, canvas_state, created_at, updated_at,
                    label, parent_conversation_id
             FROM ai_conversations WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], |row| Ok(map_conversation_row(row)))
        .optional()
        .map_err(|e| e.to_string())
}

pub fn get_latest_conversation(
    conn: &Connection,
    decision_id: &str,
) -> Result<Option<AiConversation>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, decision_id, mode, messages, canvas_state, created_at, updated_at,
                    label, parent_conversation_id
             FROM ai_conversations WHERE decision_id = ?1
             ORDER BY updated_at DESC LIMIT 1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![decision_id], |row| Ok(map_conversation_row(row)))
        .optional()
        .map_err(|e| e.to_string())
}

pub fn list_conversations(
    conn: &Connection,
    decision_id: &str,
) -> Result<Vec<ThreadSummary>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, label, updated_at FROM ai_conversations
             WHERE decision_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![decision_id], |row| {
            Ok(ThreadSummary {
                id: row.get(0)?,
                label: row.get(1)?,
                updated_at: row.get(2)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(items)
}

pub fn create_conversation(
    conn: &Connection,
    decision_id: &str,
    mode: &str,
) -> Result<AiConversation, String> {
    let id = new_id();
    let now = now_iso();

    conn.execute(
        "INSERT INTO ai_conversations (id, decision_id, mode, messages, extracted_insights,
         created_at, updated_at)
         VALUES (?1, ?2, ?3, '[]', '[]', ?4, ?5)",
        params![id, decision_id, mode, now, now],
    )
    .map_err(|e| e.to_string())?;

    Ok(AiConversation {
        id,
        decision_id: decision_id.to_string(),
        mode: mode.to_string(),
        messages: serde_json::json!([]),
        canvas_state: None,
        created_at: now.clone(),
        updated_at: now,
        label: None,
        parent_conversation_id: None,
    })
}

pub fn create_thread(
    conn: &Connection,
    input: CreateThreadInput,
) -> Result<AiConversation, String> {
    let id = new_id();
    let now = now_iso();

    // Find main (first) conversation for this decision
    let parent_id: Option<String> = conn
        .prepare(
            "SELECT id FROM ai_conversations WHERE decision_id = ?1
             ORDER BY created_at ASC LIMIT 1",
        )
        .map_err(|e| e.to_string())?
        .query_row(params![input.decision_id], |row| row.get(0))
        .optional()
        .map_err(|e| e.to_string())?;

    let canvas_str = input
        .initial_canvas
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_default());

    conn.execute(
        "INSERT INTO ai_conversations (id, decision_id, mode, messages, extracted_insights,
         canvas_state, created_at, updated_at, label, parent_conversation_id)
         VALUES (?1, ?2, ?3, '[]', '[]', ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            input.decision_id,
            input.mode,
            canvas_str,
            now,
            now,
            input.label,
            parent_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(AiConversation {
        id,
        decision_id: input.decision_id,
        mode: input.mode,
        messages: serde_json::json!([]),
        canvas_state: input.initial_canvas,
        created_at: now.clone(),
        updated_at: now,
        label: Some(input.label),
        parent_conversation_id: parent_id,
    })
}

pub fn save_conversation_messages(
    conn: &Connection,
    input: SaveMessagesInput,
) -> Result<(), String> {
    let now = now_iso();
    let messages_str = serde_json::to_string(&input.messages).unwrap_or_else(|_| "[]".to_string());
    let canvas_str = input
        .canvas_state
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_default());

    conn.execute(
        "UPDATE ai_conversations SET messages = ?1, canvas_state = ?2, updated_at = ?3
         WHERE id = ?4",
        params![messages_str, canvas_str, now, input.conversation_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ---- Export ----

pub fn export_markdown(conn: &Connection, decision_id: &str) -> Result<String, String> {
    let decision = get_decision(conn, decision_id)?
        .ok_or_else(|| format!("Idea not found: {}", decision_id))?;

    let d = &decision.decision;
    let mut lines: Vec<String> = Vec::new();

    lines.push(format!("# {}", d.title));
    lines.push(String::new());
    lines.push(format!(
        "**Status:** {} | **Created:** {}",
        d.status,
        format_date(&d.created_at)
    ));
    if let Some(ref da) = d.decided_at {
        lines.push(format!("**Decided:** {}", format_date(da)));
    }
    if let Some(ref r) = d.reversibility {
        lines.push(format!("**Reversibility:** {}", r.replace('_', " ")));
    }
    if let Some(ref u) = d.urgency {
        lines.push(format!("**Urgency:** {}", u));
    }
    if let Some(ref i) = d.impact {
        lines.push(format!("**Impact:** {}", i));
    }
    lines.push(String::new());

    if !d.context.is_empty() {
        lines.push("## Context".to_string());
        lines.push(strip_html(&d.context));
        lines.push(String::new());
    }

    if !d.problem_statement.is_empty() {
        lines.push("## Problem Statement".to_string());
        lines.push(strip_html(&d.problem_statement));
        lines.push(String::new());
    }

    if !decision.options.is_empty() {
        lines.push("## Options".to_string());
        for opt in &decision.options {
            let mut markers = Vec::new();
            if opt.is_chosen {
                markers.push("(CHOSEN)");
            }
            if opt.is_recommended {
                markers.push("(recommended)");
            }
            if opt.eliminated_reason.is_some() {
                markers.push("(eliminated)");
            }
            let marker_str = markers.join(" ");
            lines.push(format!("### {} {}", opt.title, marker_str));
            if !opt.description.is_empty() {
                lines.push(strip_html(&opt.description));
            }
            if let Some(pros) = opt.pros.as_array() {
                if !pros.is_empty() {
                    lines.push("**Pros:**".to_string());
                    for p in pros {
                        let text = p.get("text").and_then(|v| v.as_str()).unwrap_or("");
                        let weight = p.get("weight").and_then(|v| v.as_str()).unwrap_or("moderate");
                        lines.push(format!("- [{}] {}", weight, text));
                    }
                }
            }
            if let Some(cons) = opt.cons.as_array() {
                if !cons.is_empty() {
                    lines.push("**Cons:**".to_string());
                    for c in cons {
                        let text = c.get("text").and_then(|v| v.as_str()).unwrap_or("");
                        let weight = c.get("weight").and_then(|v| v.as_str()).unwrap_or("moderate");
                        lines.push(format!("- [{}] {}", weight, text));
                    }
                }
            }
            if let Some(ref reason) = opt.eliminated_reason {
                lines.push(format!("*Eliminated:* {}", reason));
            }
            lines.push(String::new());
        }
    }

    if !decision.assumptions.is_empty() {
        lines.push("## Assumptions".to_string());
        for a in &decision.assumptions {
            let ai_tag = if a.ai_suggested {
                " _(AI suggested)_"
            } else {
                ""
            };
            lines.push(format!("- **[{}]** {}{}", a.status, a.statement, ai_tag));
            if let Some(ref r) = a.risk_if_wrong {
                lines.push(format!("  - Risk if wrong: {}", r));
            }
            if let Some(ref v) = a.validation_method {
                lines.push(format!("  - Validation: {}", v));
            }
        }
        lines.push(String::new());
    }

    if !decision.evidence.is_empty() {
        lines.push("## Evidence".to_string());
        for e in &decision.evidence {
            lines.push(format!(
                "- **[{}] [{}]** {}",
                e.evidence_type, e.confidence, e.title
            ));
            if !e.content.is_empty() {
                lines.push(format!("  {}", strip_html(&e.content)));
            }
            if let Some(ref url) = e.source_url {
                let label = e.source_label.as_deref().unwrap_or(url);
                lines.push(format!("  Source: [{}]({})", label, url));
            }
        }
        lines.push(String::new());
    }

    if !decision.stakeholders.is_empty() {
        lines.push("## Stakeholders (DACI)".to_string());
        for s in &decision.stakeholders {
            let role_str = s
                .role
                .as_ref()
                .map(|r| format!(" ({})", r))
                .unwrap_or_default();
            lines.push(format!(
                "- **{}** — {}{} — {}",
                s.name, s.involvement, role_str, s.stance
            ));
        }
        lines.push(String::new());
    }

    if !d.rationale.is_empty() {
        lines.push("## Rationale".to_string());
        lines.push(strip_html(&d.rationale));
        lines.push(String::new());
    }

    if let (Some(score), Some(ref breakdown)) = (d.quality_score, &d.quality_breakdown) {
        lines.push(format!(
            "## Quality Score: {}%",
            (score * 100.0).round() as i32
        ));
        if let Some(obj) = breakdown.as_object() {
            for (dim, val) in obj {
                let label = dim
                    .replace('_', " ")
                    .split_whitespace()
                    .map(|w| {
                        let mut c = w.chars();
                        match c.next() {
                            None => String::new(),
                            Some(f) => {
                                f.to_uppercase().collect::<String>() + c.as_str()
                            }
                        }
                    })
                    .collect::<Vec<_>>()
                    .join(" ");
                let pct = val.as_f64().unwrap_or(0.0);
                lines.push(format!("- {}: {}%", label, (pct * 100.0).round() as i32));
            }
        }
        lines.push(String::new());
    }

    if !decision.tags.is_empty() {
        let tag_names: Vec<&str> = decision.tags.iter().map(|t| t.name.as_str()).collect();
        lines.push(format!("**Tags:** {}", tag_names.join(", ")));
        lines.push(String::new());
    }

    lines.push("---".to_string());
    lines.push("_Exported from IdeaTuner_".to_string());

    Ok(lines.join("\n"))
}

fn format_date(iso: &str) -> String {
    // Simple date formatting without chrono
    if iso.len() >= 10 {
        iso[..10].to_string()
    } else {
        iso.to_string()
    }
}

fn strip_html(html: &str) -> String {
    // Simple HTML strip
    let mut result = html.to_string();
    // Replace <br> with newlines
    result = result.replace("<br>", "\n").replace("<br/>", "\n").replace("<br />", "\n");
    result = result.replace("</p>", "\n");
    // Strip remaining tags
    let mut output = String::new();
    let mut in_tag = false;
    for c in result.chars() {
        if c == '<' {
            in_tag = true;
        } else if c == '>' {
            in_tag = false;
        } else if !in_tag {
            output.push(c);
        }
    }
    // Decode entities
    output = output
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'");
    output.trim().to_string()
}

// ---- Row mappers ----

fn map_decision_row(row: &rusqlite::Row) -> Decision {
    let quality_breakdown_str: Option<String> = row.get(14).unwrap_or(None);
    let quality_breakdown = quality_breakdown_str
        .and_then(|s| serde_json::from_str(&s).ok());

    Decision {
        id: row.get(0).unwrap_or_default(),
        title: row.get(1).unwrap_or_default(),
        slug: row.get(2).unwrap_or_default(),
        phase: row.get::<_, Option<String>>(3).unwrap_or(None).unwrap_or_else(|| "spark".to_string()),
        raw_idea: row.get::<_, Option<String>>(4).unwrap_or(None).unwrap_or_default(),
        context: row.get::<_, Option<String>>(5).unwrap_or(None).unwrap_or_default(),
        problem_statement: row.get::<_, Option<String>>(6).unwrap_or(None).unwrap_or_default(),
        chosen_option_id: row.get(7).unwrap_or(None),
        rationale: row.get::<_, Option<String>>(8).unwrap_or(None).unwrap_or_default(),
        status: row.get(9).unwrap_or_else(|_| "draft".to_string()),
        reversibility: row.get(10).unwrap_or(None),
        urgency: row.get(11).unwrap_or(None),
        impact: row.get(12).unwrap_or(None),
        quality_score: row.get(13).unwrap_or(None),
        quality_breakdown,
        created_at: row.get(15).unwrap_or_default(),
        updated_at: row.get(16).unwrap_or_default(),
        decided_at: row.get(17).unwrap_or(None),
        archived_at: row.get(18).unwrap_or(None),
    }
}

fn map_option_row(row: &rusqlite::Row) -> OptionModel {
    let pros_str: Option<String> = row.get(4).unwrap_or(None);
    let cons_str: Option<String> = row.get(5).unwrap_or(None);
    let optimizes_for_str: Option<String> = row.get(13).unwrap_or(None);
    let sacrifices_str: Option<String> = row.get(14).unwrap_or(None);
    let option_assumptions_str: Option<String> = row.get(15).unwrap_or(None);

    OptionModel {
        id: row.get(0).unwrap_or_default(),
        decision_id: row.get(1).unwrap_or_default(),
        title: row.get(2).unwrap_or_default(),
        description: row.get::<_, Option<String>>(3).unwrap_or(None).unwrap_or_default(),
        pros: parse_json_or_default(pros_str, "[]"),
        cons: parse_json_or_default(cons_str, "[]"),
        estimated_effort: row.get(6).unwrap_or(None),
        estimated_cost: row.get(7).unwrap_or(None),
        time_to_value: row.get(8).unwrap_or(None),
        is_recommended: row.get::<_, i32>(9).unwrap_or(0) != 0,
        is_chosen: row.get::<_, i32>(10).unwrap_or(0) != 0,
        eliminated_reason: row.get(11).unwrap_or(None),
        sort_order: row.get(12).unwrap_or(0),
        optimizes_for: parse_json_or_default(optimizes_for_str, "[]"),
        sacrifices: parse_json_or_default(sacrifices_str, "[]"),
        option_assumptions: parse_json_or_default(option_assumptions_str, "[]"),
        risk_profile: row.get(16).unwrap_or(None),
    }
}

fn map_evidence_row(row: &rusqlite::Row) -> Evidence {
    let conflicts_with_str: Option<String> = row.get(12).unwrap_or(None);

    Evidence {
        id: row.get(0).unwrap_or_default(),
        decision_id: row.get(1).unwrap_or_default(),
        option_id: row.get(2).unwrap_or(None),
        evidence_type: row.get(3).unwrap_or_default(),
        title: row.get(4).unwrap_or_default(),
        content: row.get::<_, Option<String>>(5).unwrap_or(None).unwrap_or_default(),
        source_url: row.get(6).unwrap_or(None),
        source_label: row.get(7).unwrap_or(None),
        confidence: row.get(8).unwrap_or_else(|_| "moderate".to_string()),
        created_at: row.get(9).unwrap_or_default(),
        weight: row.get(10).unwrap_or(1.0),
        direction: row.get(11).unwrap_or(None),
        conflicts_with: parse_json_or_default(conflicts_with_str, "[]"),
        collected_at: row.get(13).unwrap_or(None),
        expires_at: row.get(14).unwrap_or(None),
    }
}

fn map_assumption_row(row: &rusqlite::Row) -> Assumption {
    let linked_option_ids_str: Option<String> = row.get(8).unwrap_or(None);
    let linked_evidence_ids_str: Option<String> = row.get(9).unwrap_or(None);

    Assumption {
        id: row.get(0).unwrap_or_default(),
        decision_id: row.get(1).unwrap_or_default(),
        statement: row.get(2).unwrap_or_default(),
        status: row.get(3).unwrap_or_else(|_| "untested".to_string()),
        risk_if_wrong: row.get(4).unwrap_or(None),
        validation_method: row.get(5).unwrap_or(None),
        ai_suggested: row.get::<_, i32>(6).unwrap_or(0) != 0,
        created_at: row.get(7).unwrap_or_default(),
        linked_option_ids: parse_json_or_default(linked_option_ids_str, "[]"),
        linked_evidence_ids: parse_json_or_default(linked_evidence_ids_str, "[]"),
        impact_if_flipped: row.get(10).unwrap_or(None),
        validation_deadline: row.get(11).unwrap_or(None),
        priority: row.get(12).unwrap_or_else(|_| "medium".to_string()),
    }
}

fn map_stakeholder_row(row: &rusqlite::Row) -> Stakeholder {
    Stakeholder {
        id: row.get(0).unwrap_or_default(),
        decision_id: row.get(1).unwrap_or_default(),
        name: row.get(2).unwrap_or_default(),
        role: row.get(3).unwrap_or(None),
        involvement: row.get(4).unwrap_or_else(|_| "informed".to_string()),
        stance: row.get(5).unwrap_or_else(|_| "unknown".to_string()),
        created_at: row.get(6).unwrap_or_default(),
    }
}

fn map_conversation_row(row: &rusqlite::Row) -> AiConversation {
    let messages_str: String = row.get(3).unwrap_or_else(|_| "[]".to_string());
    let canvas_str: Option<String> = row.get(4).unwrap_or(None);

    AiConversation {
        id: row.get(0).unwrap_or_default(),
        decision_id: row.get(1).unwrap_or_default(),
        mode: row.get(2).unwrap_or_default(),
        messages: serde_json::from_str(&messages_str).unwrap_or_else(|_| serde_json::json!([])),
        canvas_state: canvas_str.and_then(|s| serde_json::from_str(&s).ok()),
        created_at: row.get(5).unwrap_or_default(),
        updated_at: row.get(6).unwrap_or_default(),
        label: row.get(7).unwrap_or(None),
        parent_conversation_id: row.get(8).unwrap_or(None),
    }
}

// Import the optional extension trait
use rusqlite::OptionalExtension;
