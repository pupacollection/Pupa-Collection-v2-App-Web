import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
initializeApp();
const db = getFirestore();
db.collection('profiles').limit(1).get().then(snap => {
  console.log("Success:", snap.size);
}).catch(err => {
  console.error("Error:", err.message);
});
