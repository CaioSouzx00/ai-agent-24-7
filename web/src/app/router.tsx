import { useState, useEffect } from 'react'
import { AppLayout } from './layout'
import { DashboardView } from '@/features/dashboard'
import { HandoffView } from '@/features/handoff'
import { ChatView } from '@/features/chat'
import { ToolsView } from '@/features/tools'

export function AppRouter() {
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname
      return p === '/' ? '/dashboard' : p
    }
    return '/dashboard'
  })

  useEffect(() => {
    const onPopState = () => {
      const p = window.location.pathname
      setCurrentPath(p === '/' ? '/dashboard' : p)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path)
      setCurrentPath(path)
    }
  }

  const renderContent = () => {
    switch (currentPath) {
      case '/handoff':
      case '/handoff/ui':
        return <HandoffView />
      case '/chat':
        return <ChatView />
      case '/tools':
        return <ToolsView />
      case '/dashboard':
      case '/':
      default:
        return <DashboardView />
    }
  }

  return (
    <AppLayout currentPath={currentPath} onNavigate={navigate}>
      {renderContent()}
    </AppLayout>
  )
}
