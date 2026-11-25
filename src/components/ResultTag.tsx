import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Analysis } from '../types'
import Photos from './Photos'

function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-6 gap-y-1 border-t border-seam py-4 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs uppercase tracking-[0.18em] text-thread sm:pt-1">{title}</dt>
      <dd className="space-y-1.5 text-pretty">{children}</dd>
    </div>
  )
}

const note = 'text-sm text-thread'

/** One scan, laid out like the sewn-in label it came from. */
export default function ResultTag({ analysis }: { analysis: Analysis }) {
  const { t, i18n } = useTranslation()
  const { label, environment, labour, factories } = analysis

  const countryName = (code: string) =>
    new Intl.DisplayNames([i18n.language], { type: 'region' }).of(code) ?? code
  const country = label?.madeIn ? countryName(label.madeIn) : null
  const number = (n: number) => n.toLocaleString(i18n.language)

  const photos = analysis.photos ?? []
  const hasPhotos = photos.length > 0

  let body: ReactNode
  if (!label || analysis.version !== 2) {
    body = <p className="py-6 text-thread">{t('result.legacy')}</p>
  } else if (!label.readable) {
    body = <p className="py-6">{t('result.unreadable')}</p>
  } else {
    const care = label.care
    const careLines = [
      care.maxWashTempC === 0 && t('result.care.hand_wash'),
      !!care.maxWashTempC && t('result.care.wash', { temp: care.maxWashTempC }),
      ...(['tumbleDry', 'iron', 'bleach', 'dryClean'] as const).map((key) =>
        care[key] !== null && t(`result.care.${key}_${care[key] ? 'yes' : 'no'}`)),
    ].filter(Boolean)
    const identifiers = [label.rn && `RN ${label.rn}`, label.ca && `CA ${label.ca}`].filter(Boolean)

    body = (
      <>
        <header className="pb-5">
          <h2 className="text-2xl font-light uppercase tracking-[0.14em]">
            {label.garmentType ? t(`garment.${label.garmentType}`) : t('history.untitled')}
          </h2>
          {label.brand && <p className="mt-1 text-thread">{label.brand}</p>}
        </header>

        <dl>
          <Row title={t('result.composition')}>
            {label.fibres.length === 0 && <p className={note}>{t('result.no_composition')}</p>}
            {label.fibres.map((fibre) => (
              <p key={fibre.name} className="text-lg">
                <span className="tabular-nums">{number(fibre.share)} %</span>{' '}
                {fibre.material ? t(`material.${fibre.material}`, { defaultValue: fibre.name }) : fibre.name}
              </p>
            ))}
          </Row>

          <Row title={t('result.origin')}>
            {country ? <p className="text-lg">{country}</p> : <p className={note}>{t('result.origin_unknown')}</p>}
          </Row>

          {identifiers.length > 0 && (
            <Row title={t('result.identifiers')}><p className="tabular-nums">{identifiers.join(' · ')}</p></Row>
          )}
          {label.certifications.length > 0 && (
            <Row title={t('result.certifications')}><p>{label.certifications.join(' · ')}</p></Row>
          )}

          <Row title={t('result.environment.title')}>
            {environment?.status === 'ok' ? (
              <>
                <p className="text-lg">{t('result.environment.points', { value: number(environment.ecs) })}</p>
                <p className={note}>
                  {t('result.environment.basis', { mass: Math.round(environment.massKg * 1000) })}
                  {!environment.countryModelled && ` ${t('result.environment.country_default')}`}
                </p>
                {environment.webUrl && (
                  <a href={environment.webUrl} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-4">
                    {t('result.environment.open')}
                  </a>
                )}
              </>
            ) : (
              <p className={note}>{t(`result.environment.${environment?.reason ?? 'error'}`)}</p>
            )}
          </Row>

          <Row title={t('result.labour.title')}>
            {!labour || !country ? (
              <p className={note}>{t('result.labour.unknown')}</p>
            ) : labour.entries.length === 0 ? (
              <p className="text-clear">{t('result.labour.clear', { country, edition: labour.edition })}</p>
            ) : (
              <>
                <p>{t('result.labour.listed', { country, edition: labour.edition })}</p>
                <ul>
                  {labour.entries.map((entry) => (
                    <li key={entry.good} className="font-medium text-flag">
                      {t(`goods.${entry.good}`, { defaultValue: entry.good })}
                      {': '}
                      {[entry.childLabour && t('result.labour.child'), entry.forcedLabour && t('result.labour.forced')]
                        .filter(Boolean).join(', ')}
                    </li>
                  ))}
                </ul>
                <p className={note}>{t('result.labour.caveat')}</p>
              </>
            )}
          </Row>

          <Row title={t('result.factories.title')}>
            {factories?.status === 'ok' ? (
              <>
                <p>
                  {t(factories.count ? 'result.factories.found' : 'result.factories.none', {
                    brand: factories.contributor, count: factories.count, country,
                  })}
                </p>
                <ul className={note}>
                  {factories.sample.map((factory) => (
                    <li key={factory.osId}>
                      <a href={`https://opensupplyhub.org/facilities/${factory.osId}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                        {factory.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : factories?.reason === 'no_token' && label.madeIn ? (
              // Open Supply Hub charges for API lookups; its public map is free to search by hand.
              <>
                <p className={note}>{t('result.factories.manual', { country })}</p>
                <a
                  href={`https://opensupplyhub.org/facilities?countries=${label.madeIn}&sectors=Apparel`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline underline-offset-4"
                >
                  {t('result.factories.open_map', { country })}
                </a>
              </>
            ) : (
              <p className={note}>{t(`result.factories.${factories?.reason ?? 'error'}`)}</p>
            )}
          </Row>

          <Row title={t('result.care.title')}>
            {careLines.length ? careLines.map((line) => <p key={String(line)}>{line}</p>) : <p className={note}>{t('result.care.none')}</p>}
          </Row>
        </dl>
      </>
    )
  }

  return (
    <article className={`tag-in grid w-full gap-6 text-left md:items-start ${hasPhotos ? 'md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]' : 'max-w-2xl'}`}>
      {hasPhotos && <Photos photos={photos} />}
      <div className="on-paper stitched relative bg-paper px-6 pb-2 pt-10 text-ink shadow-[0_18px_40px_-12px_rgb(0_0_0/0.7)] sm:px-8">
        {body}
      </div>
    </article>
  )
}
