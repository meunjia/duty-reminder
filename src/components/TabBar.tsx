type Tab = 'home' | 'calendar' | 'settings'

interface TabBarProps {
  active: Tab
  onChange: (tab: Tab) => void
}

export default function TabBar({ active, onChange }: TabBarProps) {
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'home', label: '홈', icon: '🏠' },
    { id: 'calendar', label: '캘린더', icon: '📅' },
    { id: 'settings', label: '설정', icon: '⚙️' },
  ]

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-200 flex z-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs transition-colors ${
            active === tab.id ? 'text-[#378ADD]' : 'text-gray-400'
          }`}
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          <span className={`font-medium ${active === tab.id ? 'text-[#378ADD]' : 'text-gray-400'}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </nav>
  )
}
