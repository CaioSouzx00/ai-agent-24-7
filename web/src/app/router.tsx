import { useState, useEffect } from 'react'
import { AppLayout } from './layout'
import { DashboardView } from '@/features/dashboard'
import { HandoffView } from '@/features/handoff'
import { ChatView } from '@/features/chat'
import { ToolsView } from '@/features/tools'
import { EditorialView } from '@/features/editorial/editorial-view'
import { NotFoundView } from './not-found-view'
import { Preloader } from '@/shared/motion/preloader'
import { CustomCursor } from '@/shared/motion/cursor'
import { SmoothScrollProvider } from '@/shared/motion/smooth-scroll'

export function AppRouter() {
  const [hasBooted, setHasBooted] = useState(false)
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname
    }
    return '/'
  })

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (path: string) => {
    if (path !== currentPath) {
      window.history.pushState({}, '', path)
      setCurrentPath(path)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  const renderContent = () => {
    switch (currentPath) {
      case '/handoff':
      case '/handoff/ui':
        return (
          <AppLayout currentPath={currentPath} onNavigate={navigate}>
            <HandoffView />
          </AppLayout>
        )
      case '/chat':
        return (
          <AppLayout currentPath={currentPath} onNavigate={navigate}>
            <ChatView />
          </AppLayout>
        )
      case '/tools':
        return (
          <AppLayout currentPath={currentPath} onNavigate={navigate}>
            <ToolsView />
          </AppLayout>
        )
      case '/dashboard':
        return (
          <AppLayout currentPath={currentPath} onNavigate={navigate}>
            <DashboardView />
          </AppLayout>
        )
      case '/':
      case '/editorial':
        return <EditorialView onNavigateToConsole={navigate} />
      default:
        return (
          <AppLayout currentPath={currentPath} onNavigate={navigate}>
            <NotFoundView requestedPath={currentPath} onNavigate={navigate} />
          </AppLayout>
        )
    }
  }

  return (
    <SmoothScrollProvider>
      {/* Subtle Noise / Film Grain Overlay */}
      <div className="noise-overlay" />

      {/* Editorial Custom Cursor with Context Labels */}
      <CustomCursor />

      {/* Kernel Preloader with Precision Counter */}
      {!hasBooted && <Preloader onComplete={() => setHasBooted(true)} />}

      {/* Main Routed Content */}
      <main className="relative z-10 w-full min-h-screen">
        {renderContent()}
      </main>
    </SmoothScrollProvider>
  )
}
