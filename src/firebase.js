// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBedlrlvUwvY6IadI2dg9JbaB2h2Jzo5f8",
  authDomain: "vtu-project-7d299.firebaseapp.com",
  projectId: "vtu-project-7d299",
  storageBucket: "vtu-project-7d299.firebasestorage.app",
  messagingSenderId: "699890081734",
  appId: "1:699890081734:web:696dde661a59236fe9dcc7",
  measurementId: "G-J8ZQHJB57K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

// Export Firebase services
export { auth, googleProvider, db, storage };