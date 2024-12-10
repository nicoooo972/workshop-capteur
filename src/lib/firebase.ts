import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDRfqBnf_vz0clPPxrEcUjNUnqtY2YABkE",
  authDomain: "workshop-3395b.firebaseapp.com",
  databaseURL: "https://workshop-3395b-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "workshop-3395b",
  storageBucket: "workshop-3395b.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
