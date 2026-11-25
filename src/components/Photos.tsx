import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NextIcon, PrevIcon } from './icons'

/** The photos of one scan, one at a time. */
export default function Photos({ photos }: { photos: string[] }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const shown = Math.min(index, photos.length - 1)
  const step = (by: number) => setIndex((shown + by + photos.length) % photos.length)
  const arrow = 'absolute top-1/2 -translate-y-1/2 rounded-full bg-ink/70 p-2 text-paper transition-colors hover:bg-ink'

  return (
    <div className="relative aspect-[3/4] overflow-hidden bg-ink-soft">
      <img
        src={photos[shown]}
        alt={t('result.photo', { n: shown + 1, total: photos.length })}
        className="h-full w-full object-cover"
      />
      {photos.length > 1 && (
        <>
          <button onClick={() => step(-1)} aria-label={t('result.previous')} className={`${arrow} left-2`}><PrevIcon /></button>
          <button onClick={() => step(1)} aria-label={t('result.next')} className={`${arrow} right-2`}><NextIcon /></button>
          <p className="absolute bottom-2 right-3 rounded-full bg-ink/70 px-2 text-xs tabular-nums text-paper">
            {shown + 1} / {photos.length}
          </p>
        </>
      )}
    </div>
  )
}
