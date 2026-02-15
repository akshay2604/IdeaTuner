import { ipcMain } from 'electron'
import * as keychainService from '../services/keychain.service'
import { exportToMarkdown } from '../services/export.service'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:getApiKey', () => {
    const key = keychainService.getApiKey()
    // Return masked version for display, or null
    if (!key) return null
    return key.slice(0, 10) + '...' + key.slice(-4)
  })

  ipcMain.handle('settings:setApiKey', (_event, key: string) => {
    keychainService.setApiKey(key)
  })

  ipcMain.handle('settings:removeApiKey', () => {
    keychainService.removeApiKey()
  })

  ipcMain.handle('export:markdown', (_event, decisionId: string) => {
    return exportToMarkdown(decisionId)
  })
}
