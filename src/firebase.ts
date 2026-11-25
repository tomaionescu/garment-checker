import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Web config identifies the project; it is not a secret. Access is enforced by
// firestore.rules and by the token check in api/analyze.ts.
const app = initializeApp({
  apiKey: 'AIzaSyAJcAHXYwoQ5iiTbS1FrDRFRKF8i9f7skw',
  authDomain: 'garment-checker.firebaseapp.com',
  projectId: 'garment-checker',
  messagingSenderId: '586423590378',
  appId: '1:586423590378:web:d4d4a9f27c01f7cb616693',
})

export const auth = getAuth(app)
export const db = getFirestore(app)
