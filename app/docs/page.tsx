'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/authContext';
import { auth, database, ref, get } from '@/utilities/firebaseClient';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import Link from 'next/link';

interface NavigationItem {
  id: number;
  label: string;
}

export default function Page() {
  const [navigationItems] = useState<NavigationItem[]>([
    { id: 1, label: '1. Get Started' },
    { id: 2, label: '2. User Auth' },
    { id: 3, label: '3. Endpoints' },
    { id: 4, label: '4. Examples' },
    { id: 5, label: '5. FAQs' },
  ]);

  const [selectedNavItem, setSelectedNavItem] = useState<NavigationItem>(navigationItems[0]);

  const [{ apiKey: userApiKey }] = useAuth();
  const [apiKey, setApiKey] = useState<string>(userApiKey || '');
  const [userToken, setUserToken] = useState<string>('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState<{ [key: string]: string }>({});

  const handleNavigationItemClick = (item: NavigationItem) => {
    setSelectedNavItem(item);
    const snippets = getCodeSnippetsForItem(item);
    setCodeSnippet(snippets);
  };

  const getCodeSnippetsForItem = (item: NavigationItem): { [key: string]: string } => {
    switch (item.id) {
      case 4:
        return {
          curlUpload: `curl -X POST \\\n  -H "Authorization: Bearer ${userToken}" \\\n  -F "file=@/path/to/your/file" \\\n  https://api.idefi.ai/api/upload`,
          jsUpload: `const formData = new FormData();\nformData.append('file', fileInput.files[0]);\n\nfetch('https://api.idefi.ai/api/upload', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ${userToken}'\n  },\n  body: formData\n})\n.then(response => response.json())\n.then(data => console.log(data))\n.catch(error => console.error('Error:', error));`,
          curlCheckAddress: `curl -X POST \\\n  -H "Content-Type: application/json" \\\n  -d '{"addresses": ["ADDRESS_TO_CHECK"]}' \\\n  https://api.idefi.ai/api/checkaddress`,
          jsCheckAddress: `fetch('https://api.idefi.ai/api/checkaddress', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({ addresses: ['ADDRESS_TO_CHECK'] })\n})\n.then(response => response.json())\n.then(data => console.log(data))\n.catch(error => console.error('Error:', error));`
        };
      default:
        return {};
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setCodeCopied(true);
        setTimeout(() => setCodeCopied(false), 3000);
      })
      .catch((error) => console.error('Error copying to clipboard:', error));
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && 'uid' in user) {
        const uid = user.uid;
        setUserToken(await fetchUserToken(uid));
        setApiKey(await fetchApiKey(uid));
      } else {
        setApiKey('');
        setUserToken('');
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserToken = async (uid: string): Promise<string> => {
    try {
      const snapshot = await get(ref(database, `users/${uid}/token`));
      return snapshot.exists() ? snapshot.val() : '';
    } catch (error) {
      console.error('Error fetching user token:', error);
      return '';
    }
  };

  const fetchApiKey = async (uid: string): Promise<string> => {
    try {
      const snapshot = await get(ref(database, `apiKeys/${uid}`));
      const apiKeyValue: unknown = snapshot.exists() ? Object.values(snapshot.val())[0] : '';
      if (typeof apiKeyValue === 'string') {
        return apiKeyValue;
      } else {
        return '';
      }
    } catch (error) {
      console.error('Error fetching API key:', error);
      return '';
    }
  };

  const renderContent = () => {
    switch (selectedNavItem.id) {
      case 1:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">{selectedNavItem.label}</h2>
            <p>
              Welcome to our developer documentation! Here you'll find everything you need to get started
              integrating with our API.
            </p>
            <p>
            You should have received your access token upon account creation. Please review section 2. User Auth for information on how to authenticate
              with our service using your token and API key.
            </p>
          </div>
        );
      case 2:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">{selectedNavItem.label}</h2>
            <p>
              To access our API, you need to authenticate using your token and API key. Below you'll find
              your token and API key details.
            </p>
            <div className="mt-6">
              <label className="block text-lightlaven font-bold mb-2">Your API Key:</label>
              <div className="flex items-center border border-gray-400 rounded-md p-2 mb-2">
                <input
                  type="text"
                  className="flex-grow w-full border-none outline-none bg-transparent"
                  value={apiKey}
                  readOnly
                />
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md ml-2 focus:outline-none"
                  onClick={() => copyToClipboard(apiKey)}
                >
                  Copy
                </button>
              </div>
              <p>If you don't see an API Key. Please visit the Developer Portal to generate and manage your API Keys</p>
              <Link href="/devs" passHref>
                <button className="bg-white hover:bg-green-500 text-black hover:text-white font-bold py-2 px-4 rounded mb-12">Dev Portal</button>
              </Link>
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
            <p>This will authorize you to access the database, without it your API Key will not work</p>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">{selectedNavItem.label}</h2>
            <p>
              The endpoints below tap into our unique dataset for checking EVM based wallet addresses with AI
            </p>
            <h3 className="text-lg font-semibold mt-4">Endpoints:</h3>
            <ul className="list-disc pl-5">
              <li>/api/checkaddress - Check the status of a wallet address</li>
              <li>/api/upload - Upload a file containing addresses</li>
            </ul>
          </div>
        );
      case 4:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">{selectedNavItem.label}</h2>
            <p>
              Here are some examples demonstrating how to use our API endpoints using cURL and JavaScript.
            </p>
            <div className="example-container">
              <h3 className="text-lg font-semibold mt-4">Upload Endpoint:</h3>
              <div className="example bg-black-200 rounded p-4 scrollable-container">
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div className="code-container">
                    <SyntaxHighlighter language="bash" style={docco} className="code-snippet rounded">
                      {codeSnippet.curlUpload}
                    </SyntaxHighlighter>
                    <button
                      className="copy-button"
                      onClick={() => copyToClipboard(codeSnippet.curlUpload)}
                    >
                      {codeCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="code-container">
                    <SyntaxHighlighter language="javascript" style={docco} className="code-snippet rounded">
                      {codeSnippet.jsUpload}
                    </SyntaxHighlighter>
                    <button
                      className="copy-button"
                      onClick={() => copyToClipboard(codeSnippet.jsUpload)}
                    >
                      {codeCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-semibold mt-4">Check Address Endpoint:</h3>
              <div className="example bg-black-200 rounded p-4 scrollable-container">
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div className="code-container">
                    <SyntaxHighlighter language="bash" style={docco} className="code-snippet rounded">
                      {codeSnippet.curlCheckAddress}
                    </SyntaxHighlighter>
                    <button
                      className="copy-button"
                      onClick={() => copyToClipboard(codeSnippet.curlCheckAddress)}
                    >
                      {codeCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="code-container">
                    <SyntaxHighlighter language="javascript" style={docco} className="code-snippet rounded">
                      {codeSnippet.jsCheckAddress}
                    </SyntaxHighlighter>
                    <button
                      className="copy-button"
                      onClick={() => copyToClipboard(codeSnippet.jsCheckAddress)}
                    >
                      {codeCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">{selectedNavItem.label}</h2>
            <p>
              Here you'll find answers to frequently asked questions about our API.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="main-container">
      <div className="nav-container">
        <ul>
          {navigationItems.map((item) => (
            <li
              key={item.id}
              onClick={() => handleNavigationItemClick(item)}
              className={`${selectedNavItem.id === item.id ? 'active' : ''}`}
            >
              {item.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="content-container">
        {renderContent()}
      </div>
      <style jsx>{`
        .main-container {
          display: flex;
          flex-direction: row;
          height: 100vh;
          padding-top: 30px;
        }
        .nav-container {
          width: 20%;
          background-color: #000000;
          padding: 10px;
          position: fixed;
          height: 100vh;
          overflow-y: auto;
        }
        .nav-container ul {
          list-style: none;
          padding: 0;
        }
        .nav-container li {
          margin-bottom: 10px;
          cursor: pointer;
        }
        .nav-container .active {
          font-weight: bold;
          color: #913D88;
        }
        .content-container {
          width: 80%;
          padding-top: 10px;
          margin-left: 30%;
          overflow-y: auto;
        }
        .scrollable-container {
          max-height: 80vh;
          overflow-y: auto;
        }
        .example-container {
          margin-top: 20px;
        }
        .code-container {
          position: relative;
        }
        .copy-button {
          position: absolute;
          top: 10px;
          right: 10px;
          background-color: #007bff;
          color: white;
          border: none;
          padding: 5px 10px;
          cursor: pointer;
          border-radius: 3px;
        }
        .copy-button:hover {
          background-color: #0056b3;
        }
      `}</style>
    </div>
  );
}
