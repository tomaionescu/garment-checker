import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { auth } from '../firebase'
import AuthForm, { Field } from '../components/AuthForm'

export default function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <AuthForm
      title={t('auth.sign_in')}
      subtitle={t('auth.sign_in_sub')}
      submit={t('auth.sign_in')}
      submitting={t('auth.signing_in')}
      onSubmit={async () => { await signInWithEmailAndPassword(auth, email, password) }}
      footer={<>{t('auth.no_account')} <Link to="/signup" className="text-paper underline underline-offset-4">{t('auth.sign_up')}</Link></>}
    >
      <Field label={t('auth.email')} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label={t('auth.password')} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
    </AuthForm>
  )
}
