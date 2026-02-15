import { defineConfig } from 'drizzle-kit'
import { resolve } from 'path'

const dbPath = process.env.PMHUB_DB_PATH || resolve('pmhub.db')

export default defineConfig({
  schema: './src/shared/schema/index.ts',
  out: './src/main/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath
  }
})
