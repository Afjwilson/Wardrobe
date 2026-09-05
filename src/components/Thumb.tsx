import { blobUrl } from '../db/blobs'
import { useAsync } from '../hooks/useAsync'

type Props = {
  blobKey: string | undefined
  alt: string
  className?: string
}

export function Thumb({ blobKey, alt, className = '' }: Props) {
  const { value: url } = useAsync(
    async () => (blobKey ? await blobUrl(blobKey) : undefined),
    [blobKey],
  )

  if (!url) {
    return (
      <div
        className={`bg-surface-2 flex items-center justify-center ${className}`}
        aria-label={alt}
      >
        <span className="text-muted text-xs">no photo</span>
      </div>
    )
  }

  return <img src={url} alt={alt} className={`object-cover ${className}`} />
}
