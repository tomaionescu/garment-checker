import { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { auth, db } from '../firebase'
import AuthForm, { Field } from '../components/AuthForm'

export default function SignUp() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const bind = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  })

  const signUp = async () => {
    if (form.password !== form.confirm) return t('errors.password_mismatch')
    const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password)
    await setDoc(doc(db, 'users', user.uid), {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      createdAt: serverTimestamp(),
    })
  }

  return (
    <AuthForm
      title={t('auth.sign_up')}
      subtitle={t('auth.sign_up_sub')}
      submit={t('auth.sign_up')}
      submitting={t('auth.signing_up')}
      onSubmit={signUp}
      footer={<>{t('auth.have_account')} <Link to="/login" className="text-paper underline underline-offset-4">{t('auth.sign_in')}</Link></>}
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label={t('auth.first_name')} autoComplete="given-name" {...bind('firstName')} />
        <Field label={t('auth.last_name')} autoComplete="family-name" {...bind('lastName')} />
      </div>
      <Field label={t('auth.email')} type="email" autoComplete="email" {...bind('email')} />
      <Field label={t('auth.password')} type="password" autoComplete="new-password" minLength={6} {...bind('password')} />
      <Field label={t('auth.confirm_password')} type="password" autoComplete="new-password" {...bind('confirm')} />
    </AuthForm>
  )
}
