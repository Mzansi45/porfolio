// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, collection, getDocs, setDoc, Timestamp, addDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";


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

// Initialize Auth
const auth = getAuth(app);


async function signIn(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

async function signOutUser() {
    return signOut(auth);
}


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

async function uploadResumePDF(file) {
    // Convert PDF to base64 and store directly in Firestore
    const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]); // strip data:...;base64,
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    const currentResumeRef = doc(db, "resume", "current_resume");
    await setDoc(currentResumeRef, { pdf_base64: base64, pdf_name: file.name, pdf_updated: new Date().toISOString() }, { merge: true });
}

async function getResumePdfUrl() {
    const resumeSnapshot = await getDocs(collection(db, "resume"));
    for (const d of resumeSnapshot.docs) {
        if (d.id === "current_resume") {
            const base64 = d.data()?.pdf_base64;
            if (base64) return base64;
        }
    }
    return null;
}

export { getCollectionData, uploadNewResume, getResume, uploadResumePDF, getResumePdfUrl, auth, signIn, signOutUser };
