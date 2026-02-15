import Anthropic from '@anthropic-ai/sdk'
import { getApiKey } from '../services/keychain.service'

let client: Anthropic | null = null

export function getAIClient(): Anthropic {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('API key not configured. Please set your Anthropic API key in Settings.')
  }
  // Recreate client if key might have changed
  client = new Anthropic({ apiKey })
  return client
}

export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const testClient = new Anthropic({ apiKey: key })
    // Make a minimal request to validate
    await testClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    })
    return true
  } catch (error: unknown) {
    const err = error as { status?: number }
    if (err.status === 401) return false
    // Other errors (rate limit, etc) mean the key is valid
    if (err.status === 429) return true
    return false
  }
}
