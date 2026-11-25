import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { auth } from './firebase'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Scan from './pages/Scan'

export default function App() {
  const { t } = useTranslation()
  // undefined until Firebase has restored the session
  const [user, setUser] = useState<User | null>()

  useEffect(() => onAuthStateChanged(auth, setUser), [])

  if (user === undefined) {
    return <p className="runway grid min-h-dvh place-items-center text-mist">{t('loading')}</p>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <SignUp />} />
        <Route path="/" element={user ? <Scan user={user} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
