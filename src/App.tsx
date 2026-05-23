import { useState } from 'react'
import TabBar from './components/TabBar'
import Home from './pages/Home'
import CalendarPage from './pages/CalendarPage'
import Settings from './pages/Settings'
import './index.css'

type Tab = 'home' | 'calendar' | 'settings'

export default function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <div className="flex flex-col min-h-svh bg-[#f2f1ee]">
      <main className="flex-1 pb-16">
        {tab === 'home' && <Home onNavigate={setTab} />}
        {tab === 'calendar' && <CalendarPage />}
        {tab === 'settings' && <Settings />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}
