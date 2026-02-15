import { ipcMain } from 'electron'
import * as decisionService from '../services/decision.service'
import { getSqlite } from '../database/connection'
import type { Decision, Option, Evidence, Assumption, Stakeholder } from '@shared/types'

export function registerDecisionHandlers(): void {
  // Decisions
  ipcMain.handle('decisions:list', () => {
    return decisionService.listDecisions()
  })

  ipcMain.handle('decisions:get', (_event, id: string) => {
    return decisionService.getDecision(id)
  })

  ipcMain.handle('decisions:create', (_event, data: Partial<Decision>) => {
    return decisionService.createDecision(data)
  })

  ipcMain.handle('decisions:update', (_event, id: string, data: Partial<Decision>) => {
    return decisionService.updateDecision(id, data)
  })

  ipcMain.handle('decisions:delete', (_event, id: string) => {
    return decisionService.deleteDecision(id)
  })

  ipcMain.handle('decisions:search', (_event, query: string) => {
    if (!query.trim()) return decisionService.listDecisions()
    const sqlite = getSqlite()
    const rows = sqlite
      .prepare(
        `SELECT d.* FROM decisions d
         INNER JOIN decisions_fts fts ON d.rowid = fts.rowid
         WHERE decisions_fts MATCH ?
         ORDER BY rank`
      )
      .all(query + '*')
    return rows
  })

  // Options
  ipcMain.handle('options:create', (_event, data: Partial<Option>) => {
    return decisionService.createOption(data)
  })

  ipcMain.handle('options:update', (_event, id: string, data: Partial<Option>) => {
    return decisionService.updateOption(id, data)
  })

  ipcMain.handle('options:delete', (_event, id: string) => {
    return decisionService.deleteOption(id)
  })

  // Evidence
  ipcMain.handle('evidence:create', (_event, data: Partial<Evidence>) => {
    return decisionService.createEvidence(data)
  })

  ipcMain.handle('evidence:update', (_event, id: string, data: Partial<Evidence>) => {
    return decisionService.updateEvidence(id, data)
  })

  ipcMain.handle('evidence:delete', (_event, id: string) => {
    return decisionService.deleteEvidence(id)
  })

  // Assumptions
  ipcMain.handle('assumptions:create', (_event, data: Partial<Assumption>) => {
    return decisionService.createAssumption(data)
  })

  ipcMain.handle('assumptions:update', (_event, id: string, data: Partial<Assumption>) => {
    return decisionService.updateAssumption(id, data)
  })

  ipcMain.handle('assumptions:delete', (_event, id: string) => {
    return decisionService.deleteAssumption(id)
  })

  // Stakeholders
  ipcMain.handle('stakeholders:create', (_event, data: Partial<Stakeholder>) => {
    return decisionService.createStakeholder(data)
  })

  ipcMain.handle('stakeholders:update', (_event, id: string, data: Partial<Stakeholder>) => {
    return decisionService.updateStakeholder(id, data)
  })

  ipcMain.handle('stakeholders:delete', (_event, id: string) => {
    return decisionService.deleteStakeholder(id)
  })
}
