import type { ReactNode } from 'react'
import { back } from '../router'

export function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm capitalize transition-colors ${
        active
          ? 'border-accent bg-accent text-ink font-medium'
          : 'border-line bg-surface text-muted'
      }`}
    >
      {children}
    </button>
  )
}

export function Button({
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  children,
}: {
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit'
  children: ReactNode
}) {
  const styles = {
    primary: 'bg-accent text-ink font-semibold',
    ghost: 'bg-surface-2 text-text border border-line',
    danger: 'bg-transparent text-bad border border-bad/50',
  }[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 rounded-xl px-4 py-3 disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  )
}

export function ScalePicker({
  value,
  onChange,
  labels,
}: {
  value: number
  onChange: (value: 1 | 2 | 3 | 4 | 5) => void
  labels?: Record<number, string>
}) {
  return (
    <div className="flex gap-2">
      {([1, 2, 3, 4, 5] as const).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`min-h-12 flex-1 rounded-xl border text-sm ${
            value === n
              ? 'border-accent bg-accent text-ink font-semibold'
              : 'border-line bg-surface text-muted'
          }`}
        >
          <span className="block">{n}</span>
          {labels?.[n] && <span className="block text-[10px]">{labels[n]}</span>}
        </button>
      ))}
    </div>
  )
}

/**
 * A caption above a control group. Deliberately not a <label>: most groups here
 * are buttons, and wrapping those in a label folds the whole group's text into
 * every button's accessible name.
 */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2" role="group" aria-label={label}>
      <p className="text-muted text-xs tracking-wide uppercase">{label}</p>
      {children}
    </div>
  )
}

export function TopBar({
  title,
  action,
  showBack = false,
  onBack,
}: {
  title: string
  action?: ReactNode
  showBack?: boolean
  onBack?: () => void
}) {
  return (
    <header className="bg-ink/95 border-line safe-top sticky top-0 z-10 flex items-center gap-3 border-b px-4 pb-3 backdrop-blur">
      {showBack && (
        <button
          type="button"
          onClick={onBack ?? back}
          className="text-muted -ml-2 min-h-10 px-2 text-lg"
          aria-label="Back"
        >
          ‹
        </button>
      )}
      <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
      {action}
    </header>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted px-6 py-16 text-center text-sm">{children}</p>
}
