import { navigate } from '../router'

const TABS = [
  { path: '/', label: 'Wardrobe', glyph: '▦' },
  { path: '/settings', label: 'Settings', glyph: '⚙' },
] as const

export function BottomNav({ current }: { current: string }) {
  return (
    <nav className="bg-ink/95 border-line safe-bottom fixed inset-x-0 bottom-0 z-10 flex border-t pt-1 backdrop-blur">
      {TABS.map((tab) => {
        const active = current === tab.path
        return (
          <button
            key={tab.path}
            type="button"
            onClick={() => navigate(tab.path)}
            className={`min-h-14 flex-1 text-xs ${active ? 'text-accent' : 'text-muted'}`}
          >
            <span className="block text-lg leading-6">{tab.glyph}</span>
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
