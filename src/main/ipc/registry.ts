import { registerDecisionHandlers } from './decisions.ipc'
import { registerAIHandlers } from './ai.ipc'
import { registerSettingsHandlers } from './settings.ipc'

export function registerAllHandlers(): void {
  registerDecisionHandlers()
  registerAIHandlers()
  registerSettingsHandlers()
}
