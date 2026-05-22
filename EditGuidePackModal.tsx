/// <reference types="vite/client" />
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBKn65FBbNaWOOP7V1ajSjdN_twYPf1sHc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "website-shop-bd.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "website-shop-bd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "website-shop-bd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "313797630326",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:313797630326:web:01df80fe79bd95b1e74257",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-S1ZQ4NYHP3"
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

// Safe analytics check
let analytics = null;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}
export { analytics };
