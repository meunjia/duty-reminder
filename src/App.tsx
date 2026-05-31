import { useState } from 'react'
import { CalendarProvider } from './lib/CalendarContext'
import TabBar from './components/TabBar'
import Home from './pages/Home'
import CalendarPage from './pages/CalendarPage'
import Settings from './pages/Settings'
import { ChatPage } from './features/chat'
import './index.css'

type Tab = 'home' | 'calendar' | 'chat' | 'settings'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <CalendarProvider>
      <div className="flex flex-col min-h-svh bg-[#f2f1ee]">
        <main className="flex-1 pb-16">
          {tab === 'home' && <Home onNavigate={setTab} />}
          {tab === 'calendar' && <CalendarPage />}
          {tab === 'chat' && <ChatPage />}
          {tab === 'settings' && <Settings />}
        </main>
        <TabBar active={tab} onChange={setTab} />
      </div>
    </CalendarProvider>
  )
}
