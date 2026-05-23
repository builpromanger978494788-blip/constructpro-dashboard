import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCG6t_pQloFChQge_6qzaExPIH64d0sPnY",
  authDomain: "build-pro-manager.firebaseapp.com",
  projectId: "build-pro-manager",
  storageBucket: "build-pro-manager.firebasestorage.app",
  messagingSenderId: "1016557767211",
  appId: "1:1016557767211:web:c803edc7f1eec993f7f86e",
  measurementId: "G-7C74MHGNV7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { db, auth, provider };

