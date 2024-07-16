'use client';

import { useState } from 'react';
import { auth, createAccountWithEmailPassword, signInWithEmailPassword, setPersistence, browserLocalPersistence, database, ref, set, signInWithGoogle, signInWithGithub, signInWithWeb3 } from '@/utilities/firebaseClient';
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

      await setPersistence(auth, browserLocalPersistence);

      const token = await generateToken(user.uid);
      await saveUserData(user.uid, token);
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

      await setPersistence(auth, browserLocalPersistence);

      const token = await generateToken(user.uid);
      await saveUserData(user.uid, token);
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
      const response = await fetch('/api/generate_token', { 
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ uid })
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
      await set(ref(database, `users/${uid}`), {
        uid: uid,
        token: token
      });
    } catch (error) {
      console.error('Error saving user data:', error);
      setError('Error saving user data. Please try again.');
    }
  };

  const handleGoogleSignIn = async (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      if(user){
        try {
          const idToken = await user.getIdToken(true);
          console.log('Token: ', idToken);
          window.location.href = '/dataroom';
        } catch(error) {
          console.log('Error retrieving token', error);
        }
      } 
    } catch(error: any) {
      console.error("Error signing in with Google", error.message);
    }
  };

  const handleGithubSignIn = async (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      const result = await signInWithGithub();
      const user = result.user;
      if(user){
        try {
          const idToken = await user.getIdToken(true);
          console.log('Token: ', idToken);
          window.location.href = '/dataroom';
        } catch(error) {
          console.log('Error retrieving token', error);
        }
      } 
    } catch(error: any) {
      console.error("Error signing in with GitHub", error.message);
    }
  };

  const handleWeb3SignIn = async (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      const result = await signInWithWeb3();
      console.log('Web3 SignIn Result: ', result);
      window.location.href = '/dataroom';
    } catch (error) {
      console.error("Error signing in with Web3", error);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <Image src='/mainlogo.png' alt="Company Logo" width={200} height={200} />
      <br />
      <h1 className="text-3xl mb-4 text-black">API iDeFi.AI</h1>
      <br />
      <form className="flex flex-col gap-4 text-black" onSubmit={(e) => e.preventDefault()}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-blue-200"
        />
        <button
          onClick={handleSignUp}
          disabled={loading}
          className="px-4 py-2 bg-black border-2 border-white text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring focus:ring-blue-200"
        >
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="px-4 py-2 bg-black border-2 border-white text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring focus:ring-blue-200"
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      {error && <p className="text-red-500 mt-2">{error}</p>}
      <p className="text-gray-500 mt-4">or</p>
      <div className="flex space-x-4 mt-4">
        <button onClick={handleGoogleSignIn} className="flex items-center px-4 py-2 bg-white text-black border border-gray-300 rounded-md hover:bg-gray-200">
          <Image src='/google_logo.png' alt='Google logo' width={25} height={25} />
        </button>
        <button onClick={handleGithubSignIn} className="flex items-center px-4 py-2 bg-white text-black border border-gray-300 rounded-md hover:bg-gray-200">
          <Image src='/github_logo.png' alt='GitHub logo' width={25} height={25} />
        </button>
        <button onClick={handleWeb3SignIn} className="flex items-center px-4 py-2 bg-white text-black border border-gray-300 rounded-md hover:bg-gray-200">
          <Image src='/metamask_logo.png' alt='MetaMask logo' width={25} height={25} />
        </button>
      </div>
    </main>
  );
}
