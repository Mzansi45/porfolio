import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css';
import Home from './pages/Terminal';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ResumeView from './pages/resumeView';

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

import {useCollectionData} from 'react-firebase-hooks/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCmzlfNlPRIuUcPBKowYCApMmj7BvMsZnI",
  authDomain: "thulani-gulube.firebaseapp.com",
  projectId: "thulani-gulube",
  storageBucket: "thulani-gulube.firebasestorage.app",
  messagingSenderId: "710027863571",
  appId: "1:710027863571:web:ba47e4d43961edb86f81e6",
  measurementId: "G-074RF68ZET"
};

const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);


function App() {

  return (

    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/resume" element={<ResumeView />} />
      </Routes>
    </Router>
  )
}

export default App
