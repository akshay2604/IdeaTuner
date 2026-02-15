import { safeStorage } from 'electron'
import { getSqlite } from '../database/connection'

const KEY_NAME = 'anthropic_api_key'

// We store the encrypted key in a simple key-value table in SQLite
function ensureSettingsTable(): void {
  const sqlite = getSqlite()
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value BLOB
    )
  `)
}

export function getApiKey(): string | null {
  ensureSettingsTable()
  if (!safeStorage.isEncryptionAvailable()) {
    return null
  }
  const sqlite = getSqlite()
  const row = sqlite.prepare('SELECT value FROM app_settings WHERE key = ?').get(KEY_NAME) as
    | { value: Buffer }
    | undefined
  if (!row) return null
  try {
    return safeStorage.decryptString(row.value)
  } catch {
    return null
  }
}

export function setApiKey(key: string): void {
  ensureSettingsTable()
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption is not available on this system')
  }
  const encrypted = safeStorage.encryptString(key)
  const sqlite = getSqlite()
  sqlite
    .prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)')
    .run(KEY_NAME, encrypted)
}

export function removeApiKey(): void {
  ensureSettingsTable()
  const sqlite = getSqlite()
  sqlite.prepare('DELETE FROM app_settings WHERE key = ?').run(KEY_NAME)
}
