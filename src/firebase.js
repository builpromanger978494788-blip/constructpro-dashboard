import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

export { db };
