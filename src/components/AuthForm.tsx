import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import LanguageSelector from './LanguageSelector'

export const inputClass =
  'w-full border border-mist/40 bg-ink/60 px-4 py-3 text-paper placeholder:text-mist/70 transition-colors hover:border-mist focus:border-paper focus:outline-none'
export const primaryButton =
  'bg-paper px-8 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-ink transition-colors hover:bg-white disabled:bg-paper/20 disabled:text-mist'

export function Field({ label, ...input }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-mist">{label}</span>
      <input required className={inputClass} {...input} />
    </label>
  )
}

/** Turns a thrown Firebase error into a message the user can act on. */
export function useErrorMessage() {
  const { t } = useTranslation()
  return (error: unknown) => {
    const code = (error as { code?: string })?.code ?? ''
    return t(`errors.${code}`, { defaultValue: t('errors.generic') })
  }
}

interface AuthFormProps {
  title: string
  subtitle: string
  submit: string
  submitting: string
  /** Throws on failure; a string is shown as a validation message. */
  onSubmit: () => Promise<void | string>
  footer: ReactNode
  children: ReactNode
}

/** Shared frame for the sign-in and sign-up pages. */
export default function AuthForm({ title, subtitle, submit, submitting, onSubmit, footer, children }: AuthFormProps) {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      setError((await onSubmit()) ?? '')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="runway flex min-h-dvh flex-col px-6">
      <header className="flex items-center justify-between py-5">
        <p className="text-sm font-light uppercase tracking-[0.3em]">{t('app_title')}</p>
        <LanguageSelector />
      </header>
      <main className="m-auto w-full max-w-sm py-10">
        <h1 className="text-4xl font-light uppercase tracking-[0.12em]">{title}</h1>
        <p className="mt-3 text-mist">{subtitle}</p>
        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          {children}
          {error && <p role="alert" className="border border-paper/40 px-4 py-3 text-sm">{error}</p>}
          <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
            {busy ? submitting : submit}
          </button>
        </form>
        <p className="mt-8 text-sm text-mist">{footer}</p>
      </main>
    </div>
  )
}
