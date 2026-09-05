/** Score colour follows the engine's own weak-pair threshold. */
function tone(score: number): string {
  if (score >= 60) return 'text-good border-good/40'
  if (score < 30) return 'text-bad border-bad/40'
  return 'text-muted border-line'
}

export function ScoreBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  return (
    <span
      className={`shrink-0 rounded-full border tabular-nums ${tone(score)} ${
        size === 'lg' ? 'px-3 py-1 text-lg font-semibold' : 'px-2 py-0.5 text-xs'
      }`}
    >
      {score}
    </span>
  )
}
