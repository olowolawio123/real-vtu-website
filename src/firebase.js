// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBedlrlvUwvY6IadI2dg9JbaB2h2Jzo5f8",
  authDomain: "vtu-project-7d299.firebaseapp.com",
  projectId: "vtu-project-7d299",
  storageBucket: "vtu-project-7d299.firebasestorage.app",
  messagingSenderId: "699890081734",
  appId: "1:699890081734:web:696dde661a59236fe9dcc7",
  measurementId: "G-J8ZQHJB57K"
};


// ✅ 2. Initialize the app here (this was missing in your case)
const app = initializeApp(firebaseConfig);

// ✅ 3. Initialize services
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

// ✅ 4. Export them
export { auth, googleProvider, db };