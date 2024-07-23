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
          jsCheckAddress: `fetch('https://api.idefi.ai/api/checkaddress', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json'\n  },\n  body: JSON.stringify({ addresses: ['ADDRESS_TO_CHECK'] })\n})\n.then(response => response.json())\n.then(data => console.log(data))\n.catch(error => console.error('Error:', error));`,
          curlAnalyzeSmartContract: `curl -X POST \\\n  -H "Authorization: Bearer ${userToken}" \\\n  -F "file=@/path/to/your/smart_contract.sol" \\\n  https://api.idefi.ai/api/analyze_smart_contract`,
          jsAnalyzeSmartContract: `const formData = new FormData();\nformData.append('file', fileInput.files[0]);\n\nfetch('https://api.idefi.ai/api/analyze_smart_contract', {\n  method: 'POST',\n  headers: {\n    'Authorization': 'Bearer ${userToken}'\n  },\n  body: formData\n})\n.then(response => response.json())\n.then(data => console.log(data))\n.catch(error => console.error('Error:', error));`,
          etherscanData: `curl -X GET "https://api.yoursite.com/api/get_etherscan_data?address=YOUR_ADDRESS"`,
          analyzeTransactions: `curl -X POST "https://api.yoursite.com/api/analyze_transactions" -H "Content-Type: application/json" -d '{"address": "YOUR_ADDRESS"}'`,
          calculateMetrics: `curl -X POST "https://api.yoursite.com/api/calculate_metrics" -H "Content-Type: application/json" -d '{"transformed_data": { /* your data */ }}'`
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
              <label className="block text-neorange font-bold mb-2">Your API Key:</label>
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
                <button className="bg-neorange hover:bg-neohover text-black hover:text-white font-bold py-2 px-4 rounded mb-12">Dev Portal</button>
              </Link>
            </div>
            <div className="mt-6">
              <label className="block text-neorange font-bold mb-2">Your Access Token:</label>
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
              Below are the detailed descriptions of our API endpoints, including parameters, request/response examples, and potential error codes.
            </p>
            <h3 className="text-lg font-semibold mt-4">Endpoints:</h3>
            <ul className="list-disc pl-5">
              <li>
                <strong>/api/checkaddress</strong>
                <p>Description: Check the status of a wallet address.</p>
                <p>Method: POST</p>
                <p>Parameters:</p>
                <ul className="list-disc pl-5">
                  <li>addresses: An array of Ethereum addresses to check.</li>
                </ul>
                <p>Response:</p>
                <SyntaxHighlighter language="json" style={docco} className="code-snippet rounded">
                {`[
                    {
                      "address": "ADDRESS_TO_CHECK",
                      "description": "Status description",
                      "insights": "Additional insights from AI analysis"
                    }
                  ]`}
                </SyntaxHighlighter>
                <p>Error Codes:</p>
                <ul className="list-disc pl-5">
                  <li>400: Address parameter is required</li>
                  <li>500: Failed to analyze with GenAI</li>
                </ul>
              </li>
              <li>
                <strong>/api/upload</strong>
                <p>Description: Upload a file containing addresses.</p>
                <p>Method: POST</p>
                <p>Parameters:</p>
                <ul className="list-disc pl-5">
                  <li>file: The file to upload (.csv or .json).</li>
                </ul>
                <p>Response:</p>
                <SyntaxHighlighter language="json" style={docco} className="code-snippet rounded">
                    {`{
                      "details": [
                        {
                          "address": "ADDRESS_FROM_FILE",
                          "status": "Pass/Fail",
                          "description": "Status description"
                        }
                      ],
                      "file_url": "URL_TO_UPLOADED_FILE"
                    }`} 
                </SyntaxHighlighter>
                <p>Error Codes:</p>
                <ul className="list-disc pl-5">
                  <li>400: No file part or unsupported file type</li>
                  <li>500: Error during file processing</li>
                </ul>
              </li>
              <li>
                <strong>/api/analyze_smart_contract</strong>
                <p>Description: Analyze a Solidity smart contract.</p>
                <p>Method: POST</p>
                <p>Parameters:</p>
                <ul className="list-disc pl-5">
                  <li>file: The Solidity (.sol) file to analyze.</li>
                </ul>
                <p>Response:</p>
                <SyntaxHighlighter language="json" style={docco} className="code-snippet rounded">
                                    {`{
                    "analysis": "Detailed analysis of the smart contract"
                  }`}
                </SyntaxHighlighter>
                <p>Error Codes:</p>
                <ul className="list-disc pl-5">
                  <li>400: No file part or unsupported file type</li>
                  <li>500: Failed to analyze smart contract</li>
                </ul>
              </li>
              <li>
                <strong>/api/get_etherscan_data</strong>
                <p>Description: Fetch Etherscan data for a given address.</p>
                <p>Method: GET</p>
                <p>Parameters:</p>
                <ul className="list-disc pl-5">
                  <li>address: The Ethereum address to fetch data for.</li>
                </ul>
                <p>Response:</p>
                <SyntaxHighlighter language="json" style={docco} className="code-snippet rounded">
                  {`{
                    "blockNumber": "1234567",
                    "timeStamp": "1234567890",
                    "hash": "0x123456...",
                    "nonce": "0",
                    "blockHash": "0x123456...",
                    "transactionIndex": "0",
                    "from": "0x123456...",
                    "to": "0x123456...",
                    "value": "1234567890",
                    "gas": "21000",
                    "gasPrice": "1234567890",
                    "isError": "0",
                    "txreceipt_status": "1",
                    "input": "0x",
                    "contractAddress": "",
                    "cumulativeGasUsed": "21000",
                    "gasUsed": "21000",
                    "confirmations": "1"
                  }`}
                </SyntaxHighlighter>
                <p>Error Codes:</p>
                <ul className="list-disc pl-5">
                  <li>400: Address parameter is required</li>
                  <li>500: Failed to fetch data from Etherscan</li>
                </ul>
              </li>
              <li>
                <strong>/api/analyze_transactions</strong>
                <p>Description: Fetch on-chain and off-chain transaction analysis.</p>
                <p>Method: POST</p>
                <p>Parameters:</p>
                <ul className="list-disc pl-5">
                  <li>address: The Ethereum address to analyze.</li>
                </ul>
                <p>Response:</p>
                <SyntaxHighlighter language="json" style={docco} className="code-snippet rounded">
                  {`{
                    "on_chain_to_off_chain": { "0x123456...": 1234567890 },
                    "off_chain_to_on_chain": { "0x123456...": 1234567890 }
                  }`}
                </SyntaxHighlighter>
                <p>Error Codes:</p>
                <ul className="list-disc pl-5">
                  <li>500: An error occurred during analysis</li>
                </ul>
              </li>
              <li>
                <strong>/api/calculate_metrics</strong>
                <p>Description: Calculate various metrics for a given dataset.</p>
                <p>Method: POST</p>
                <p>Parameters:</p>
                <ul className="list-disc pl-5">
                  <li>transformed_data: The transformed dataset for which to calculate metrics.</li>
                </ul>
                <p>Response:</p>
                <SyntaxHighlighter language="json" style={docco} className="code-snippet rounded">
                  {`{
                    "activity_score": 75,
                    "risk_scores": { "targeted_attacks": 20, "dusting_attacks": 10, "draining": 15, "phishing": 5 },
                    "opportunity_scores": { "investment": 30, "staking": 20, "tax_efficiency": 40 },
                    "trust_scores": { "trusted_sources": 50, "trusted_recipients": 60, "wallet_trust": 70 },
                    "volatility_scores": { "by_coin": 10, "by_wallet": 20 }
                  }`}
                </SyntaxHighlighter>
                <p>Error Codes:</p>
                <ul className="list-disc pl-5">
                  <li>400: Transformed data is required</li>
                  <li>500: An error occurred during metric calculation</li>
                </ul>
              </li>
              <li>
                <strong>/api/analyze_smart_contract</strong>
                <p>Description: Analyze a Solidity smart contract.</p>
                <p>Method: POST</p>
                <p>Parameters:</p>
                <ul className="list-disc pl-5">
                  <li>file: The Solidity (.sol) file to analyze.</li>
                </ul>
                <p>Response:</p>
                <SyntaxHighlighter language="json" style={docco} className="code-snippet rounded">
                  {`{
                    "analysis": "Detailed analysis of the smart contract"
                  }`}
                </SyntaxHighlighter>
                <p>Error Codes:</p>
                <ul className="list-disc pl-5">
                  <li>400: No file part or unsupported file type</li>
                  <li>500: Failed to analyze smart contract</li>
                </ul>
              </li>
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
              <h3 className="text-lg font-semibold mt-4">Analyze Smart Contract Endpoint:</h3>
              <div className="example bg-black-200 rounded p-4 scrollable-container">
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div className="code-container">
                    <SyntaxHighlighter language="bash" style={docco} className="code-snippet rounded">
                      {codeSnippet.curlAnalyzeSmartContract}
                    </SyntaxHighlighter>
                    <button
                      className="copy-button"
                      onClick={() => copyToClipboard(codeSnippet.curlAnalyzeSmartContract)}
                    >
                      {codeCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="code-container">
                    <SyntaxHighlighter language="javascript" style={docco} className="code-snippet rounded">
                      {codeSnippet.jsAnalyzeSmartContract}
                    </SyntaxHighlighter>
                    <button
                      className="copy-button"
                      onClick={() => copyToClipboard(codeSnippet.jsAnalyzeSmartContract)}
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
            <div className="faq-section">
              <h3 className="text-lg font-semibold mb-2">Feedback and Support</h3>
              <p className="mb-4">
                <strong>Q: How can I provide feedback or report issues?</strong><br />
                A: We value your feedback and are here to help with any issues. Please email us at <a href="mailto:k3m@idefi.ai" className="text-blue-500 underline">k3m@idefi.ai</a> for support.
              </p>
              <h3 className="text-lg font-semibold mb-2">General Questions</h3>
              <p className="mb-4">
                <strong>Q: What is the purpose of this API?</strong><br />
                A: Our API allows users to monitor Ethereum addresses, fetch transaction histories, and receive real-time updates on blockchain activity.
              </p>
              <h3 className="text-lg font-semibold mb-2">Account and API Keys</h3>
              <p className="mb-4">
                <strong>Q: How do I create an account?</strong><br />
                A: You can create an account by signing up on our platform. Once your account is created, you will receive a user token and API keys.
              </p>
              <p className="mb-4">
                <strong>Q: How do I obtain my API keys?</strong><br />
                A: After logging into your account, navigate to the Developer Portal. You can generate and manage your API keys from there.
              </p>
              <p className="mb-4">
                <strong>Q: What should I do if I lose my API keys?</strong><br />
                A: If you lose your API keys, you can generate new ones from the Developer Portal. Ensure to update your applications with the new keys.
              </p>
              <h3 className="text-lg font-semibold mb-2">Using the API</h3>
              <p className="mb-4">
                <strong>Q: How do I authenticate API requests?</strong><br />
                A: Each API request must include your API key in the headers. For example, you can include it as a Bearer token in the Authorization header.
              </p>
              <p className="mb-4">
                <strong>Q: What are the main endpoints of the API?</strong><br />
                A: The main endpoints include:
                <ul className="list-disc list-inside ml-4">
                  <li><strong>/api/monitor_address</strong>: Start monitoring an Ethereum address.</li>
                  <li><strong>/api/get_transactions</strong>: Retrieve transaction history for an address.</li>
                  <li><strong>/api/get_user_tokens</strong>: Fetch all API tokens associated with your account.</li>
                </ul>
              </p>
              <h3 className="text-lg font-semibold mb-2">Real-Time Monitoring</h3>
              <p className="mb-4">
                <strong>Q: How does the real-time monitoring work?</strong><br />
                A: Once you start monitoring an address, the system will check for new transactions at regular intervals and update you with real-time notifications.
              </p>
              <p className="mb-4">
                <strong>Q: Can I monitor multiple addresses at once?</strong><br />
                A: Yes, you can monitor multiple Ethereum addresses simultaneously. Each address will have its own monitoring session.
              </p>
            </div>
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
          background-color: #ffffff;
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
          color: #ff9f66;
          border-radius: 10px;
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
