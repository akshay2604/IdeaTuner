import { useEffect, useState } from 'react'
import { KeyRound, Check, X, Moon, Sun, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useSettingsStore } from '@/stores/settings.store'

export function Settings() {
  const {
    apiKeySet,
    apiKeyDisplay,
    darkMode,
    isLoading,
    checkApiKey,
    setApiKey,
    removeApiKey,
    toggleDarkMode
  } = useSettingsStore()

  const [keyInput, setKeyInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle')

  useEffect(() => {
    checkApiKey()
  }, [])

  const handleSaveKey = async () => {
    if (!keyInput.trim()) return
    setStatus('validating')
    const valid = await setApiKey(keyInput.trim())
    if (valid) {
      setStatus('success')
      setKeyInput('')
      setTimeout(() => setStatus('idle'), 2000)
    } else {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const handleRemoveKey = async () => {
    await removeApiKey()
    setStatus('idle')
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Configure IdeaTuner preferences and integrations
          </p>
        </div>

        {/* API Key */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Anthropic API Key</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Required for the AI Thinking Partner. Your key is stored securely using your
            system&apos;s keychain. It never leaves your machine.
          </p>

          {apiKeySet ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 font-mono text-sm bg-muted px-3 py-2 rounded-md">
                {apiKeyDisplay}
              </div>
              <Button variant="outline" size="sm" onClick={handleRemoveKey}>
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                  placeholder="sk-ant-..."
                  className="font-mono"
                />
                <Button onClick={handleSaveKey} disabled={!keyInput.trim() || isLoading}>
                  {status === 'validating' ? (
                    'Validating...'
                  ) : status === 'success' ? (
                    <>
                      <Check className="h-4 w-4" /> Saved
                    </>
                  ) : status === 'error' ? (
                    <>
                      <X className="h-4 w-4" /> Invalid
                    </>
                  ) : (
                    'Save Key'
                  )}
                </Button>
              </div>
              {status === 'error' && (
                <p className="text-sm text-destructive">
                  Invalid API key. Please check and try again.
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Appearance */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Dark Mode</p>
              <p className="text-xs text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={toggleDarkMode}>
              {darkMode ? (
                <>
                  <Sun className="h-4 w-4" /> Light Mode
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" /> Dark Mode
                </>
              )}
            </Button>
          </div>
        </div>

        <Separator />

        {/* About */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="text-sm text-muted-foreground">
            IdeaTuner v0.1.0 — Structured decision-making for Product Managers
          </p>
          <p className="text-xs text-muted-foreground">
            All data is stored locally on your machine. Your decisions and API keys never leave
            your device.
          </p>
        </div>
      </div>
    </div>
  )
}
