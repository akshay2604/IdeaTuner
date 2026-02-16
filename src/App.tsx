import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Dashboard } from '@/pages/Dashboard'
import { DecisionList } from '@/pages/DecisionList'
import { IdeaWorkspace } from '@/pages/IdeaWorkspace'
import { Settings } from '@/pages/Settings'
import { useDecisionsStore } from '@/stores/decisions.store'

export default function App() {
  useEffect(() => {
    // Fetch decisions on mount
    useDecisionsStore.getState().fetchDecisions()
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ideas" element={<DecisionList />} />
          <Route path="/ideas/:id" element={<IdeaWorkspace />} />
          {/* Redirect old routes */}
          <Route path="/decisions" element={<Navigate to="/ideas" replace />} />
          <Route path="/decisions/:id" element={<Navigate to="/ideas" replace />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
