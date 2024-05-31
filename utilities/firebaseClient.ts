import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set, child, get, remove, onValue, push } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {

  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "api-idefi-ai.firebaseapp.com",
  databaseURL: "https://api-idefi-ai-default-rtdb.firebaseio.com",
  projectId: "api-idefi-ai",
  storageBucket: "api-idefi-ai.appspot.com",
  messagingSenderId: "421932092542",
  appId: "1:421932092542:web:07d312ae533b8a425b1c2f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const jsondataRef = ref(database, 'jsondata');


// Set persistence
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    // Persistence set successfully
  })
  .catch((error) => {
    console.error('Error setting persistence:', error);
  });

// Firebase authentication functions
const createAccountWithEmailPassword = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

const signInWithEmailPassword = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

// Realtime Database references
const apiTokensRef = ref(database, 'apiTokens');
const apiKeysRef = ref(database, 'apiKeys');

const storeApiToken = (partnerId: string, apiToken: string) =>
  set(child(apiTokensRef, partnerId), apiToken);

const storeJsonData = (jsonData: any) => {
    return push(jsondataRef, jsonData);
  };

const storeApiKey = (uid: string, apiKey: string) =>
  set(child(apiKeysRef, uid), apiKey);

const getApiToken = async (partnerId: string) => {
  const snapshot = await get(child(apiTokensRef, partnerId));
  return snapshot.val();
};

const getApiKey = async (uid: string) => {
  const snapshot = await get(child(apiKeysRef, uid));
  return snapshot.val();
};

const deleteApiToken = (partnerId: string) =>
  set(child(apiTokensRef, partnerId), null); // Set to null to delete

export {
  app,
  auth,
  createAccountWithEmailPassword,
  signInWithEmailPassword,
  storeApiToken,
  storeApiKey,
  storeJsonData,
  getApiToken,
  getApiKey,
  deleteApiToken,
  browserLocalPersistence,
  setPersistence,
  database,
  remove,
  ref,
  set,
  onValue,
  get,
  push
};
