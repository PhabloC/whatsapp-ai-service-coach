import React, { useState } from 'react';
import { Sidebar } from '../sidebar/Sidebar';
import { SidebarResizer } from '../resizer/SidebarResizer';
import { MainLayoutProps } from './types';



export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  sessions,
  activeSessionId,
  onSelectSession,
  userName,
  onLogout,
  onUpdateSessionPrompt,
  onAddConnection,
  connections,
  onDisconnectInstance,
  currentView,
  onViewChange,
  instanceCriteria,
  onUpdateInstanceCriteria,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number>(320);

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden relative">
      {/* Botão para abrir sidebar quando fechada */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-40 p-3 bg-white shadow-xl border border-slate-100 rounded-2xl text-slate-600 hover:text-emerald-500 transition-all active:scale-95 animate-fade-in"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <div 
        className="relative flex-shrink-0" 
        style={{ 
          width: isSidebarOpen ? `${sidebarWidth}px` : '0px', 
          transition: isSidebarOpen ? 'width 0.2s' : 'none',
          overflow: 'hidden'
        }}
      >
        <Sidebar 
          sessions={sessions} 
          activeSessionId={activeSessionId} 
          onSelectSession={onSelectSession} 
          userName={userName} 
          onLogout={onLogout}
          onUpdateSessionPrompt={onUpdateSessionPrompt}
          onAddConnection={onAddConnection}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          connections={connections}
          onDisconnectInstance={onDisconnectInstance}
          currentView={currentView}
          onViewChange={onViewChange}
          instanceCriteria={instanceCriteria}
          onUpdateInstanceCriteria={onUpdateInstanceCriteria}
        />
        {isSidebarOpen && (
          <SidebarResizer
            onResize={setSidebarWidth}
            currentWidth={sidebarWidth}
            minWidth={240}
            maxWidth={600}
          />
        )}
      </div>
      
      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Navbar */}
        <div className="p-4 bg-white border-b flex items-center gap-4 lg:hidden">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h2 className="font-black text-slate-800 tracking-tight">Coach AI</h2>
        </div>
        
        {children}
      </main>
    </div>
  );
};
