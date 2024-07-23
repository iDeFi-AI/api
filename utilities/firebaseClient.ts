import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signInAnonymously, GoogleAuthProvider, GithubAuthProvider, signInWithCustomToken } from 'firebase/auth';
import { getDatabase, ref, set, child, get, remove, push, onValue } from 'firebase/database';
import Web3 from 'web3';
import { isAddress } from 'web3-validator';

// Extend the Window interface to include the ethereum property
declare global {
  interface Window {
    ethereum: any;
  }
}

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

// Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Sign-in functions
const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
const signInWithGithub = () => signInWithPopup(auth, githubProvider);
const signInAnonymouslyWithFirebase = () => signInAnonymously(auth);

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

// Web3 Authentication
const signInWithWeb3 = async () => {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      if (!isAddress(account)) {
        throw new Error('Invalid Ethereum address');
      }
      const message = 'Log in to iDeFi.AI';
      const web3 = new Web3(window.ethereum);
      const signature = await web3.eth.personal.sign(web3.utils.utf8ToHex(message), account, '');

      // Sign in anonymously with Firebase if not already signed in
      if (!auth.currentUser) {
        await signInAnonymouslyWithFirebase();
      }

      // Fetch custom token from your backend
      const response = await fetch('/api/generate_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: account })
      });

      if (!response.ok) {
        throw new Error('Failed to generate token');
      }

      const data = await response.json();
      const customToken = data.token;

      // Sign in with the custom token
      await signInWithCustomToken(auth, customToken);

      return { user: { account }, signature };
    } catch (error) {
      console.error('Error signing in with Web3', error);
      throw error;
    }
  } else {
    throw new Error('MetaMask is not installed');
  }
};

// Realtime Database references
const apiTokensRef = ref(database, 'apiTokens');
const apiKeysRef = ref(database, 'apiKeys');

const storeApiToken = (partnerId: string, apiToken: string) =>
  set(child(apiTokensRef, partnerId), apiToken);

const storeJsonData = (jsonData: any) => push(jsondataRef, jsonData);

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
  signInWithGoogle,
  signInWithGithub,
  signInWithWeb3,
  signInAnonymouslyWithFirebase as signInAnonymously,
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
  get,
  onValue,
  push
};
