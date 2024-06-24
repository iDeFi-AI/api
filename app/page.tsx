'use client'

import { useState } from 'react';
import { auth, createAccountWithEmailPassword, signInWithEmailPassword, setPersistence, browserLocalPersistence, database, ref, set } from '@/utilities/firebaseClient';
import Image from 'next/image';

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    try {
      setLoading(true);
      setError('');
      const userCredential = await createAccountWithEmailPassword(email, password);
      const user = userCredential.user;

      // Set persistence for the user
      await setPersistence(auth, browserLocalPersistence);

      // Generate token for the user
      const token = await generateToken(user.uid);

      // Save user data to the database
      await saveUserData(user.uid, token);

      // Automatically sign in after sign-up
      await handleSignIn();
    } catch (error) {
      console.error('Error creating account:', error);
      setError('Error creating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const userCredential = await signInWithEmailPassword(email, password);
      const user = userCredential.user;

      // Set persistence for the user
      await setPersistence(auth, browserLocalPersistence);

      // Generate token for the user
      const token = await generateToken(user.uid);
      
      // Save user data to the database
      await saveUserData(user.uid, token);
      
      // Redirect to API suite token page upon successful sign-in
      window.location.href = '/devs';
    } catch (error) {
      console.error('Error signing in:', error);
      setError('Error signing in. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async (uid: string) => {
    try {
      // Call Firebase function to generate token
      // Assuming the function returns the token
      const response = await fetch('/api/generate_token', { 
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        
        body: JSON.stringify({ uid }) // Include the UID in the request body
      });
      if (!response.ok) {
        throw new Error('Failed to generate token');
      }
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Error generating token:', error);
      setError('Error generating token. Please try again.');
      return null;
    }
  };

  const saveUserData = async (uid: string, token: string) => {
    try {
      // Save user data to the database
      await set(ref(database, `users/${uid}`), {
        uid: uid,
        token: token
      });
    } catch (error) {
      console.error('Error saving user data:', error);
      setError('Error saving user data. Please try again.');
    }
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen">
    <Image src='/mainlogo.png' alt="Company Logo" width={200} height={200} />
    <br></br>
      <h1 className="text-3xl mb-4">API iDeFi.AI</h1>
      <br></br>
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200 text-black"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200 text-black"
        />
        <button
          onClick={handleSignUp}
          disabled={loading}
          className="px-4 py-2 bg-black border-2 border-white text-white rounded-md hover:bg-lightlaven focus:outline-none focus:ring focus:ring-blue-200"
        >
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="px-4 py-2 bg-black border-2 border-white text-white rounded-md hover:bg-lightlaven focus:outline-none focus:ring focus:ring-blue-200"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </main>
  );
}
