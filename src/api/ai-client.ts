import Anthropic from '@anthropic-ai/sdk'
import { fetch } from '@tauri-apps/plugin-http'
import { getApiKeyRaw } from './commands'

export async function getAIClient(): Promise<Anthropic> {
  const apiKey = await getApiKeyRaw()
  if (!apiKey) {
    throw new Error('API key not configured. Please set your Anthropic API key in Settings.')
  }
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    fetch: fetch as unknown as typeof globalThis.fetch
  })
}

export async function validateApiKey(key: string): Promise<boolean> {
  try {
    const testClient = new Anthropic({
      apiKey: key,
      dangerouslyAllowBrowser: true,
      fetch: fetch as unknown as typeof globalThis.fetch
    })
    await testClient.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }]
    })
    return true
  } catch (error: unknown) {
    const err = error as { status?: number }
    if (err.status === 401) return false
    // Other errors (rate limit, etc.) mean the key is valid
    if (err.status === 429) return true
    return false
  }
}
