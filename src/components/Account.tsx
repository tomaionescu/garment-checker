import { useState, type FormEvent } from 'react'
import { signOut, updatePassword, type User } from 'firebase/auth'
import { useTranslation } from 'react-i18next'
import { auth } from '../firebase'
import { inputClass, useErrorMessage } from './AuthForm'
import { UserIcon } from './icons'

export function Avatar({ url, className }: { url: string | null; className: string }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-mist/50 bg-ink ${className}`}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <UserIcon className="h-1/2 w-1/2 text-mist" />}
    </span>
  )
}

/** Contents of the account dialog: password and sign out. */
export default function Account({ user }: { user: User }) {
  const { t } = useTranslation()
  const errorMessage = useErrorMessage()
  const [editingPassword, setEditingPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  const changePassword = async (e: FormEvent) => {
    e.preventDefault()
    try {
      await updatePassword(user, password)
      setMessage(t('account.password_updated'))
      setPassword('')
      setEditingPassword(false)
    } catch (err) {
      setMessage(errorMessage(err))
    }
  }

  const link = 'text-sm underline underline-offset-4 hover:text-white'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar url={user.photoURL} className="h-16 w-16" />
        <p className="min-w-0 truncate">{user.email}</p>
      </div>

      {editingPassword ? (
        <form onSubmit={changePassword} className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm text-mist">{t('account.new_password')}</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="flex gap-5">
            <button type="submit" className={link}>{t('account.save')}</button>
            <button type="button" className={`${link} text-mist`} onClick={() => { setEditingPassword(false); setPassword('') }}>
              {t('account.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <button className={link} onClick={() => { setEditingPassword(true); setMessage('') }}>
          {t('account.change_password')}
        </button>
      )}

      {message && <p role="status" className="text-sm text-mist">{message}</p>}

      <button
        onClick={() => signOut(auth)}
        className="w-full border border-mist/50 py-3 text-sm uppercase tracking-[0.2em] transition-colors hover:border-paper"
      >
        {t('account.logout')}
      </button>
    </div>
  )
}
