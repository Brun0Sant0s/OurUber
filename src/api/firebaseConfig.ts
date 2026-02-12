import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { initializeAuth } from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBLk2DG5ZacUgZAk1sgAfjCuA4Yw6oTc6I",
  authDomain: "ouruber-cb29f.firebaseapp.com",
  projectId: "ouruber-cb29f",
  storageBucket: "ouruber-cb29f.firebasestorage.app",
  messagingSenderId: "742430652116",
  appId: "1:742430652116:web:f8e8dd0ad1ee0bbc9aed41"
};

export const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);

let auth2;
export const getFirebaseAuth = () => {
  if (!auth) {
    auth2 = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  }
  return auth;
}