// src/services/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "firebase/auth";

// 📌 Configuración pública de Firebase (segura para frontend)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, // Asegurate que esté en tu .env
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

// 🔥 Inicialización
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// =======================
// 🔐 Auth: Email y Password
// =======================

// Registro
export const registerUser = async (email, password) => {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  return res.user;
};

// Login
export const loginUser = (email, password) => {
  return signInWithEmailAndPassword(auth, password);
};

// =======================
// 🔵 Login con Google
// =======================

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => {
  return signInWithPopup(auth, googleProvider)
    .then((result) => result.user)
    .catch((error) => {
      console.error("Google login error:", error);
      throw error;
    });
};

// =======================
// 🚪 Logout
// =======================

export const logoutUser = () => signOut(auth);
