// page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/authContext';
import { auth, database, ref, get } from '@/utilities/firebaseClient';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import Link from 'next/link';

interface NavigationItem {
  id: number;
  label: string;
  childIds?: number[];
  parentId?: number;
}

export default function Page() {
  const [navigationItems] = useState<NavigationItem[]>([
    { id: 1, label: '1. Get Started' },
    { id: 2, label: '2. Authenticate' },
    { id: 3, label: '3. Endpoints', childIds: [4, 5, 6] },
    { id: 4, label: 'Python', parentId: 3 },
    { id: 5, label: 'cURL', parentId: 3 },
    { id: 6, label: 'JavaScript', parentId: 3 },
    { id: 7, label: '4. Examples' },
    { id: 8, label: '5. FAQs' },
  ]);

  const [selectedNavItem, setSelectedNavItem] = useState<NavigationItem>(
    navigationItems[0]
  );

  const [{ apiKey: userApiKey }] = useAuth();
  const [apiKey, setApiKey] = useState<string>(userApiKey || '');
  const [userToken, setUserToken] = useState<string>('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState<string>('');

  const handleNavigationItemClick = (item: NavigationItem) => {
    setSelectedNavItem(item);
    const snippet = getCodeSnippetForItem(item);
    setCodeSnippet(snippet);
  };

  const getCodeSnippetForItem = (item: NavigationItem): string => {
    switch (item.id) {
      case 4:
        return `import requests\n\nurl = 'http://localhost:5328/api/wms'\napi_key = '${apiKey}'\nwallet_address = 'ADDRESS_TO_CHECK'\n\npayload = {\n    'api_key': api_key,\n    'wallet_address': wallet_address\n}\nheaders = {\n    'Authorization': 'Bearer ${userToken}'\n}\n\nresponse = requests.post(url, json=payload, headers=headers)\n\nif response.status_code == 200:\n    data = response.json()\n    print(f"Status: {data['status']}, Message: {data['message']}")\nelse:\n    print("Error:", response.text)`;
      case 5:
        return `curl -X POST \\\n  -H "Authorization: Bearer ${userToken}" \\\n  -H "Content-Type: application/json" \\\n  -H "Wallet-Address: ADDRESS_TO_CHECK" \\\n  http://localhost:5328/api/wms`;
      case 6:
        return `const url = 'http://localhost:5328/api/wms';\nconst apiKey = '${apiKey}';\nconst walletAddress = 'ADDRESS_TO_CHECK';\n\nconst payload = {\n    api_key: apiKey,\n    wallet_address: walletAddress\n};\n\nfetch(url, {\n    method: 'POST',\n    headers: {\n        'Authorization': 'Bearer ${userToken}',\n        'Content-Type': 'application/json',\n        'Wallet-Address': walletAddress\n    },\n    body: JSON.stringify(payload)\n})\n.then(response => response.json())\n.then(data => console.log(\`Status: \${data.status}, Message: \${data.message}\`))\n.catch(error => console.error('Error:', error));`;
      default:
        return '';
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
              To begin, please refer to the Authentication section for information on how to authenticate
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
                <button className="bg-white hover:bg-green-500 text-black hover:text-white font-bold py-2 px-4 rounded mb-12">Dev Portal</button> {/* Increased margin-bottom */}
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
            <p>This will authorize you to access the dataabase, without it your API Key will not work</p>
          </div>
        );
      case 3:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">{selectedNavItem.label}</h2>
            <p>
              Our API provides various endpoints for you to interact with our service. You can use these
              endpoints to perform actions such as checking a wallet's status, retrieving user information,
              and much more.
            </p>
            <p>
              Below, you'll find examples demonstrating how to use each endpoint with different programming
              languages.
            </p>
          </div>
        );
      case 4:
      case 5:
      case 6:
        case 4:
          case 5:
          case 6:
            return (
              <div>
                <h2 className="text-xl font-bold mb-2">{selectedNavItem.label}</h2>
                <p>
                  Here are some examples demonstrating how to use our API endpoints with different programming languages.
                </p>
                <div className="example-container">
                  <div className="example bg-black-200 rounded p-4">
                    <div className="grid grid-cols-1 gap-4 mt-4">
                      <div className="code-container">
                        <SyntaxHighlighter language={selectedNavItem.id === 4 ? 'python' : selectedNavItem.id === 5 ? 'bash' : 'javascript'} style={docco} className="code-snippet rounded">
                          {getCodeSnippetForItem(selectedNavItem)}
                        </SyntaxHighlighter>
                        <button
                          className="copy-button"
                          onClick={() => copyToClipboard(codeSnippet)}
                        >
                          {codeCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );                                
      case 7:
        return (
          <div>
            <h2 className="text-xl font-bold mb-4">{selectedNavItem.label}</h2>
            <p>
              Here are some examples showcasing how to use our API in real-world scenarios.
            </p>
            <div className="example-container">
              <div className="example bg-gray-200 rounded p-4">
                <h3 className="text-lg text-black font-bold mb-2">Example 1: Black (No Access)</h3>
                <p className="text-black">
                  In this example, we'll demonstrate how to check a wallet's status using Python, cURL, and JavaScript.
                  This example showcases the scenario where the wallet is blacklisted, resulting in no access.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <SyntaxHighlighter language="python" style={docco} className="code-snippet rounded">
                    {getCodeSnippetForItem({ id: 4, label: 'Python' })}
                  </SyntaxHighlighter>
                  <SyntaxHighlighter language="bash" style={docco} className="code-snippet rounded">
                    {getCodeSnippetForItem({ id: 5, label: 'cURL' })}
                  </SyntaxHighlighter>
                  <SyntaxHighlighter language="javascript" style={docco} className="code-snippet rounded">
                    {getCodeSnippetForItem({ id: 6, label: 'JavaScript' })}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
          </div>
        );
      case 8:
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

  // JSX
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
    </div>
  );
}
