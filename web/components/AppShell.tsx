'use client'

import { useState, useCallback } from 'react'
import { useConversations } from '@/lib/useConversations'
import { Button } from '@/components/ui/button'
import { MenuIcon, XIcon } from 'lucide-react'
import Sidebar from './Sidebar'
import ChatView from './ChatView'
import EmptyState from './EmptyState'
import Canvas from './Canvas'
import type { Artefact } from '@/lib/types'

export default function AppShell() {
  const store = useConversations()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [canvasArtefact, setCanvasArtefact] = useState<Artefact | null>(null)

  const handleOpenCanvas = useCallback((artefact: Artefact) => {
    setCanvasArtefact(artefact)
  }, [])

  const handleCloseCanvas = useCallback(() => {
    setCanvasArtefact(null)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-[280px] flex-shrink-0 transform transition-transform duration-250 ease-out
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar store={store} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 h-12 border-b border-border/40 lg:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <MenuIcon className="w-5 h-5" />
          </Button>
          <span className="text-sm font-medium truncate">
            {store.activeConversation?.title ?? 'Upsun AI Skills'}
          </span>
          {canvasArtefact && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="ml-auto text-muted-foreground"
              onClick={handleCloseCanvas}
              aria-label="Close canvas"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Chat + Canvas split */}
        <div className="flex flex-1 min-h-0">
          {/* Chat */}
          <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${canvasArtefact ? 'lg:max-w-[50%]' : ''}`}>
            {store.activeConversation ? (
              <ChatView
                key={store.activeConversation.id}
                conversation={store.activeConversation}
                store={store}
                onOpenCanvas={handleOpenCanvas}
              />
            ) : (
              <EmptyState store={store} />
            )}
          </div>

          {/* Canvas panel */}
          {canvasArtefact && (
            <div className="hidden lg:flex w-[50%] flex-shrink-0 canvas-slide-in">
              <Canvas artefact={canvasArtefact} onClose={handleCloseCanvas} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
