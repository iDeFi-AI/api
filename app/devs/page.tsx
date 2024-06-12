'use client'

import { useState, useEffect } from 'react';
import { auth, database, ref, get, set } from '@/utilities/firebaseClient'; // Assuming correct import paths
import { useAuth } from '@/components/authContext'; // Import useAuth hook
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4 function

export default function DeveloperPortal() {
  const [loading, setLoading] = useState(false);
  const [{ apiKey: userApiKey }] = useAuth(); // Destructure apiKey from the auth context
  const [apiKey, setApiKey] = useState<string>(userApiKey || '');
  const [error, setError] = useState('');
  const [userApiKeys, setUserApiKeys] = useState<string[]>([]);
  const [userToken, setUserToken] = useState<string>('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Fetch user's API keys when authenticated
        fetchUserApiKeys(user.uid);
        // Fetch user's token when authenticated
        fetchUserToken(user.uid);
      } else {
        setApiKey(''); // Reset apiKey when user is not authenticated
        setUserApiKeys([]); // Reset userApiKeys when user is not authenticated
        setUserToken(''); // Reset userToken when user is not authenticated
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      // Fetch user's API keys when authenticated
      fetchUserApiKeys(user.uid);
      // Fetch user's token when authenticated
      fetchUserToken(user.uid);
    }
  }, [userApiKey]);

  const fetchUserApiKeys = async (uid: string) => {
    try {
      setLoading(true);
      const snapshot = await get(ref(database, `apiKeys/${uid}`));
      if (snapshot.exists()) {
        const apiKeysObject = snapshot.val();
        const apiKeysArray: string[] = Object.values(apiKeysObject);
        setUserApiKeys(apiKeysArray);
      } else {
        setUserApiKeys([]);
      }
      setError('');
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setError('Error fetching API keys. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUserToken = async (uid: string) => {
    try {
      setLoading(true);
      const snapshot = await get(ref(database, `users/${uid}/token`));
      if (snapshot.exists()) {
        const token = snapshot.val();
        setUserToken(token);
      } else {
        setUserToken('');
      }
      setError('');
    } catch (error) {
      console.error('Error fetching user token:', error);
      setError('Error fetching user token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      const uid = user.uid;
  
      const newApiKey = uuidv4();
  
      const snapshot = await get(ref(database, `apiKeys/${uid}`));
      const existingApiKeys = snapshot.val() || {};
  
      const keyIndex = Object.keys(existingApiKeys).length + 1;
      const apiKeyName = `apiKey${keyIndex}`;
  
      const updatedApiKeys = { ...existingApiKeys, [apiKeyName]: newApiKey };
  
      await set(ref(database, `apiKeys/${uid}`), updatedApiKeys);
  
      setApiKey(newApiKey);
      setUserApiKeys(Object.values(updatedApiKeys));
      setError('');
    } catch (error) {
      console.error('Error generating API key:', error);
      setError('Error generating API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key)
      .then(() => alert('API key copied to clipboard'))
      .catch((error) => console.error('Error copying to clipboard:', error));
  };

  const deleteApiKey = async (keyToDelete: string) => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      const uid = user.uid;
  
      const snapshot = await get(ref(database, `apiKeys/${uid}`));
      const existingApiKeys = snapshot.val() || {};
  
      const updatedApiKeys = Object.keys(existingApiKeys)
        .filter((key) => existingApiKeys[key] !== keyToDelete)
        .reduce((acc, key) => {
          acc[key] = existingApiKeys[key];
          return acc;
        }, {} as { [key: string]: string });
  
      await set(ref(database, `apiKeys/${uid}`), updatedApiKeys);
  
      setUserApiKeys(Object.values(updatedApiKeys));
      
      setApiKey('');
      setError('');
    } catch (error) {
      console.error('Error deleting API key:', error);
      setError('Error deleting API key. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-24">
      <h1 className="text-3xl font-bold mb-4">Developer Portal</h1>
      <p className="mb-4">
        Welcome to the Developer Portal! Here, you can manage your API keys, access your token, 
        access documentation, and explore the capabilities of our API.
      </p>
      <div>
        <label className="block text-lightlaven font-bold mb-2">Your API Keys:</label>
        {userApiKeys.map((key, index) => (
          <div key={index} className="flex items-center border border-gray-400 rounded-md p-2 mb-2">
            <input
              type="text"
              className="flex-grow w-full border-none outline-none bg-transparent"
              value={key}
              readOnly
            />
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md ml-2 focus:outline-none"
              onClick={() => copyToClipboard(key)}
            >
              Copy
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-md ml-2 focus:outline-none"
              onClick={() => deleteApiKey(key)}
              disabled={loading}
            >
              Delete
            </button>
          </div>
        ))}
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      <div className="mt-6">
        <label className="block text-lightlaven font-bold mb-2">Your Access Token:</label>
        <div className="flex items-center border border-gray-400 rounded-md p-2 mb-2">
          <input
            type="text"
            className="flex-grow w-full border-none outline-none bg-transparent"
            value={userToken}
            readOnly
          />
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md ml-2 focus:outline-none"
            onClick={() => copyToClipboard(userToken)}
          >
            Copy
          </button>
        </div>
      </div>

      <button
        className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md mt-6 focus:outline-none"
        onClick={generateApiKey}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate New API Key'}
      </button>
    </div>
  );
}
