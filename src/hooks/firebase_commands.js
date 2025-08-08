// firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, collection, getDocs, setDoc, updateDoc, where, Timestamp, addDoc } from "firebase/firestore";
import { Groq } from 'groq-sdk';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCmzlfNlPRIuUcPBKowYCApMmj7BvMsZnI",
    authDomain: "thulani-gulube.firebaseapp.com",
    projectId: "thulani-gulube",
    storageBucket: "thulani-gulube.firebasestorage.app",
    messagingSenderId: "710027863571",
    appId: "1:710027863571:web:ba47e4d43961edb86f81e6",
    measurementId: "G-074RF68ZET"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app, "profile");


// === Helper to get full collection ===
async function getCollectionData(collectionName) {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
        console.warn(`No documents found in '${collectionName}' collection`);
        return null;
    }

    const allDocs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    return allDocs;
}


// upload to firebase
async function uploadNewResume(data) {
    const resumeSnapshot = await getDocs(collection(db, "resume"));

    let resume = '';

    for (const doc of resumeSnapshot.docs) {
        if (doc.id === "current_resume") {
            resume = doc.data();
        }
    }

    // Save old resume
    await addDoc(collection(db, "resume"), resume);

    // Save new current resume
    const currentResumeRef = doc(db, "resume", "current_resume");
    const newData = {
        data: data,
        create_date: Timestamp.fromDate(new Date()),
    };

    await setDoc(currentResumeRef, newData);
}

async function getResume() {
    const resumeSnapshot = await getDocs(collection(db, "resume"));

    let resume = '';

    for (const doc of resumeSnapshot.docs) {
        if (doc.id === "current_resume") {
            resume = doc.data();
        }
    }

    return resume;
}

export { getCollectionData, uploadNewResume, getResume };
