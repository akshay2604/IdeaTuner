import { getDecision } from './decision.service'

export function exportToMarkdown(decisionId: string): string {
  const decision = getDecision(decisionId)
  if (!decision) throw new Error(`Idea not found: ${decisionId}`)

  const lines: string[] = []
  const d = decision

  lines.push(`# ${d.title}`)
  lines.push('')
  lines.push(`**Status:** ${d.status} | **Created:** ${formatDate(d.createdAt)}`)
  if (d.decidedAt) lines.push(`**Decided:** ${formatDate(d.decidedAt)}`)
  if (d.reversibility) lines.push(`**Reversibility:** ${d.reversibility.replace(/_/g, ' ')}`)
  if (d.urgency) lines.push(`**Urgency:** ${d.urgency}`)
  if (d.impact) lines.push(`**Impact:** ${d.impact}`)
  lines.push('')

  if (d.context) {
    lines.push('## Context')
    lines.push(stripHtml(d.context))
    lines.push('')
  }

  if (d.problemStatement) {
    lines.push('## Problem Statement')
    lines.push(stripHtml(d.problemStatement))
    lines.push('')
  }

  if (d.options.length > 0) {
    lines.push('## Options')
    for (const opt of d.options) {
      const markers = [
        opt.isChosen ? '(CHOSEN)' : '',
        opt.isRecommended ? '(recommended)' : '',
        opt.eliminatedReason ? '(eliminated)' : ''
      ]
        .filter(Boolean)
        .join(' ')
      lines.push(`### ${opt.title} ${markers}`)
      if (opt.description) lines.push(stripHtml(opt.description))
      if (opt.pros.length > 0) {
        lines.push('**Pros:**')
        for (const p of opt.pros) lines.push(`- [${p.weight}] ${p.text}`)
      }
      if (opt.cons.length > 0) {
        lines.push('**Cons:**')
        for (const c of opt.cons) lines.push(`- [${c.weight}] ${c.text}`)
      }
      if (opt.eliminatedReason) lines.push(`*Eliminated:* ${opt.eliminatedReason}`)
      lines.push('')
    }
  }

  if (d.assumptions.length > 0) {
    lines.push('## Assumptions')
    for (const a of d.assumptions) {
      lines.push(
        `- **[${a.status}]** ${a.statement}${a.aiSuggested ? ' _(AI suggested)_' : ''}`
      )
      if (a.riskIfWrong) lines.push(`  - Risk if wrong: ${a.riskIfWrong}`)
      if (a.validationMethod) lines.push(`  - Validation: ${a.validationMethod}`)
    }
    lines.push('')
  }

  if (d.evidence.length > 0) {
    lines.push('## Evidence')
    for (const e of d.evidence) {
      lines.push(`- **[${e.type}] [${e.confidence}]** ${e.title}`)
      if (e.content) lines.push(`  ${stripHtml(e.content)}`)
      if (e.sourceUrl) lines.push(`  Source: [${e.sourceLabel || e.sourceUrl}](${e.sourceUrl})`)
    }
    lines.push('')
  }

  if (d.stakeholders.length > 0) {
    lines.push('## Stakeholders (DACI)')
    for (const s of d.stakeholders) {
      lines.push(
        `- **${s.name}** — ${s.involvement}${s.role ? ` (${s.role})` : ''} — ${s.stance}`
      )
    }
    lines.push('')
  }

  if (d.rationale) {
    lines.push('## Rationale')
    lines.push(stripHtml(d.rationale))
    lines.push('')
  }

  if (d.qualityScore != null && d.qualityBreakdown) {
    lines.push(`## Quality Score: ${Math.round(d.qualityScore * 100)}%`)
    for (const [dim, score] of Object.entries(d.qualityBreakdown)) {
      const label = dim.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      lines.push(`- ${label}: ${Math.round((score as number) * 100)}%`)
    }
    lines.push('')
  }

  if (d.tags.length > 0) {
    lines.push(`**Tags:** ${d.tags.map((t) => t.name).join(', ')}`)
    lines.push('')
  }

  lines.push('---')
  lines.push('_Exported from IdeaTuner_')

  return lines.join('\n')
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return iso
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}
