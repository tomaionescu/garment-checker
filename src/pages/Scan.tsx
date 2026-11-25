import { useEffect, useMemo, useState, type DragEvent } from 'react'
import type { User } from 'firebase/auth'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore'
import { useTranslation } from 'react-i18next'
import { db } from '../firebase'
import { preparePhoto } from '../photos'
import type { Analysis } from '../types'
import Account, { Avatar } from '../components/Account'
import { primaryButton, useErrorMessage } from '../components/AuthForm'
import Dialog from '../components/Dialog'
import LanguageSelector from '../components/LanguageSelector'
import ResultTag from '../components/ResultTag'
import { CloseIcon, HistoryIcon, TrashIcon, UploadIcon } from '../components/icons'

const MAX_PHOTOS = 4

function HistoryItem({ item, onOpen, onDelete }: { item: Analysis; onOpen: () => void; onDelete: () => void }) {
  const { t, i18n } = useTranslation()
  const thumbnail = item.photos?.[0]
  const label = item.version === 2 ? item.label : undefined
  const title = !label
    ? t('history.legacy')
    : [label.garmentType ? t(`garment.${label.garmentType}`) : t('history.untitled'), label.brand].filter(Boolean).join(' · ')

  return (
    <li className="flex items-center gap-1 border-b border-mist/15">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left transition-colors hover:text-white">
        <span className="h-14 w-11 shrink-0 overflow-hidden bg-ink">
          {thumbnail && <img src={thumbnail} alt="" className="h-full w-full object-cover" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate">{title}</span>
          <span className="block text-sm text-mist">{item.createdAt?.toDate().toLocaleDateString(i18n.language)}</span>
        </span>
      </button>
      <button onClick={onDelete} aria-label={t('history.delete')} className="p-3 text-mist transition-colors hover:text-paper">
        <TrashIcon />
      </button>
    </li>
  )
}

export default function Scan({ user }: { user: User }) {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const [files, setFiles] = useState<File[]>([])
  const [phase, setPhase] = useState<'idle' | 'reading'>('idle')
  const [error, setError] = useState('')
  const [shown, setShown] = useState<Analysis | null>(null)
  const [history, setHistory] = useState<Analysis[]>([])
  const [panel, setPanel] = useState<'history' | 'account' | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files])
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])

  useEffect(() => {
    const analyses = query(collection(db, 'users', user.uid, 'analyses'), orderBy('createdAt', 'desc'))
    return onSnapshot(analyses, (snapshot) => {
      setHistory(snapshot.docs.map((d) => ({ ...(d.data() as Analysis), id: d.id })))
    })
  }, [user.uid])

  const addFiles = (list: FileList | null) => {
    const images = Array.from(list ?? []).filter((file) => file.type.startsWith('image/'))
    setError('')
    setFiles((current) => [...current, ...images].slice(0, MAX_PHOTOS))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const analyze = async () => {
    setError('')
    setPhase('reading')
    try {
      const photos = await Promise.all(files.map(preparePhoto))
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ images: photos.map((photo) => photo.upload) }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw { code: `api/${body.error}` }

      const scan: Analysis = { ...body, photos: photos.map((photo) => photo.thumbnail) }
      const saved = await addDoc(collection(db, 'users', user.uid, 'analyses'), { ...scan, createdAt: serverTimestamp() })
      setShown({ ...scan, id: saved.id })
      setFiles([])
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPhase('idle')
    }
  }

  const deleteScan = async (item: Analysis) => {
    if (!item.id || !window.confirm(t('history.delete_confirm'))) return
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'analyses', item.id))
      if (shown?.id === item.id) setShown(null)
    } catch {
      setError(t('errors.delete'))
      setPanel(null)
    }
  }

  const busy = phase !== 'idle'
  const closePanel = () => setPanel(null)
  const panelHeader = (title: string) => (
    <header className="flex items-center justify-between">
      <h2 className="text-sm uppercase tracking-[0.25em]">{title}</h2>
      <button onClick={closePanel} aria-label={t('account.close')} className="-mr-2 p-2 text-mist transition-colors hover:text-paper">
        <CloseIcon />
      </button>
    </header>
  )

  return (
    <div className="runway min-h-dvh px-5 pb-20 sm:px-8">
      <header className="mx-auto flex max-w-5xl items-center justify-between py-4">
        <button onClick={() => setPanel('history')} className="-ml-2 flex items-center gap-2 p-2 text-sm uppercase tracking-[0.2em] text-mist transition-colors hover:text-paper">
          <HistoryIcon />
          {t('history.title')}
        </button>
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <button onClick={() => setPanel('account')} aria-label={t('account.open')} className="rounded-full transition-opacity hover:opacity-80">
            <Avatar url={user.photoURL} className="h-10 w-10" />
          </button>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col items-center gap-10 pt-[6vh] text-center">
        <div>
          <h1 className="text-balance text-4xl font-extralight uppercase tracking-[0.2em] sm:text-6xl">{t('app_title')}</h1>
          <p className="mx-auto mt-5 max-w-md text-pretty text-lg text-mist">{t('tagline')}</p>
        </div>

        {shown ? (
          <>
            <ResultTag key={shown.id} analysis={shown} />
            <button onClick={() => setShown(null)} className={primaryButton}>{t('upload.new')}</button>
          </>
        ) : (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex min-h-72 w-full max-w-3xl flex-col items-center justify-center gap-5 border border-dashed p-8 transition-colors ${dragOver ? 'border-paper bg-ink/70' : 'border-mist/50 bg-ink/40'}`}
            >
              <input
                id="photos"
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={busy}
                onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
              />
              {files.length === 0 ? (
                <>
                  <UploadIcon className="h-9 w-9 text-mist" />
                  <div>
                    <p className="text-xl font-light">{t('upload.drop')}</p>
                    <p className="mt-1 text-mist">{t('upload.hint', { max: MAX_PHOTOS })}</p>
                  </div>
                  <label htmlFor="photos" className="border border-paper/70 px-7 py-3 text-sm uppercase tracking-[0.2em] transition-colors hover:bg-paper hover:text-ink">
                    {t('upload.choose')}
                  </label>
                </>
              ) : (
                <>
                  <ul className="flex flex-wrap justify-center gap-3">
                    {previews.map((src, i) => (
                      <li key={src} className="relative h-40 w-30 overflow-hidden bg-ink">
                        <img src={src} alt="" className="h-full w-full object-cover" />
                        <button
                          onClick={() => setFiles(files.filter((_, n) => n !== i))}
                          disabled={busy}
                          aria-label={t('upload.remove', { n: i + 1 })}
                          className="absolute right-1 top-1 rounded-full bg-ink/80 p-1.5 text-paper transition-colors hover:bg-ink"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-6 text-sm uppercase tracking-[0.2em] text-mist">
                    {files.length < MAX_PHOTOS && (
                      <label htmlFor="photos" className="underline underline-offset-8 transition-colors hover:text-paper">{t('upload.add')}</label>
                    )}
                    <button onClick={() => setFiles([])} disabled={busy} className="uppercase tracking-[0.2em] underline underline-offset-8 transition-colors hover:text-paper">
                      {t('upload.clear')}
                    </button>
                  </div>
                </>
              )}
            </div>

            {busy ? (
              <div role="status" className="w-full max-w-sm">
                <p className="text-mist">{t('progress.reading')}</p>
                <div className="mt-4 h-px overflow-hidden bg-mist/30">
                  <div className="sweep h-full w-2/5 bg-paper" />
                </div>
              </div>
            ) : (
              <button onClick={analyze} disabled={files.length === 0} className={primaryButton}>
                {t('upload.analyze')}
              </button>
            )}
          </>
        )}

        {error && <p role="alert" className="max-w-md border border-paper/40 px-4 py-3 text-sm">{error}</p>}
      </main>

      <Dialog
        open={panel === 'history'}
        onClose={closePanel}
        label={t('history.title')}
        className="m-0 h-dvh max-h-none w-88 max-w-[88vw] overflow-y-auto border-r border-mist/20 p-6"
      >
        {panelHeader(t('history.title'))}
        {history.length === 0 ? (
          <p className="mt-8 text-mist">{t('history.empty')}</p>
        ) : (
          <ul className="mt-4">
            {history.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                onOpen={() => { setShown(item); setError(''); closePanel() }}
                onDelete={() => deleteScan(item)}
              />
            ))}
          </ul>
        )}
      </Dialog>

      <Dialog
        open={panel === 'account'}
        onClose={closePanel}
        label={t('account.title')}
        className="m-auto w-full max-w-sm border border-mist/20 p-6"
      >
        {panelHeader(t('account.title'))}
        <div className="mt-6">
          <Account user={user} />
        </div>
      </Dialog>
    </div>
  )
}
