'use client';

import React, { useState } from 'react';

const FinancialAdvisorPage: React.FC = () => {
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [rawBlockchainData, setRawBlockchainData] = useState<any>(null);
  const [onChainToOffChain, setOnChainToOffChain] = useState<any>(null);
  const [offChainToOnChain, setOffChainToOnChain] = useState<any>(null);

  const handleFetchRawData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/get_etherscan_data?address=${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setRawBlockchainData(data);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const handleAnalyzeTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze_transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });
      const data = await response.json();
      setOnChainToOffChain(data.on_chain_to_off_chain);
      setOffChainToOnChain(data.off_chain_to_on_chain);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto min-h-screen flex flex-col items-center py-12 px-4 md:px-8 lg:px-16">
      <div className="section w-full max-w-4xl mb-8">
        <h2 className="text-2xl font-bold mb-4">Enter Wallet Address</h2>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Ethereum wallet address"
          className="w-full p-2 border rounded mb-4"
        />
        <button onClick={handleFetchRawData} disabled={loading} className="mt-4 p-2 bg-blue-500 text-white rounded">
          Fetch Data
        </button>
        <button onClick={handleAnalyzeTransactions} disabled={loading} className="mt-4 p-2 bg-green-500 text-white rounded ml-4">
          Analyze Transactions
        </button>
        {rawBlockchainData && (
          <div className="raw-data-container mt-4">
            <h3 className="text-xl font-bold mb-2">Raw Blockchain Data</h3>
            <pre className="bg-gray-100 p-4 rounded-md text-black text-left overflow-auto">
              {JSON.stringify(rawBlockchainData, null, 2)}
            </pre>
          </div>
        )}
      </div>
      {onChainToOffChain && offChainToOnChain && (
        <div className="section w-full max-w-4xl mb-8">
          <h2 className="text-2xl font-bold mb-4">On-Chain/Off-Chain Transaction Analysis</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">On-Chain to Off-Chain</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-black text-left overflow-auto">
                {JSON.stringify(onChainToOffChain, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Off-Chain to On-Chain</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-black text-left overflow-auto">
                {JSON.stringify(offChainToOnChain, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
      <div className="section w-full max-w-4xl mb-8">
        <h2 className="text-2xl font-bold mb-4">On-Chain/Off-Chain Mapping</h2>
        <div>
          <p className="mb-4">
            Understanding the flow of transactions between on-chain and off-chain addresses is crucial for comprehensive financial insights.
          </p>
          <p className="mb-4">
            <strong>On-Chain to Off-Chain Mapping:</strong> This involves tracking transactions sent from an on-chain address to an off-chain address. By analyzing these transactions, we can identify patterns and detect potential risks.
          </p>
          <p className="mb-4">
            <strong>Off-Chain to On-Chain Mapping:</strong> This involves tracking transactions sent from an off-chain address to an on-chain address. This helps in understanding the movement of assets back into the blockchain ecosystem.
          </p>
          <p className="mb-4">
            <strong>Transaction Analysis:</strong> Our system analyzes each transaction to provide insights into the nature of the transfer, including risk levels, transaction amounts, and more.
          </p>
          <p className="mb-4">
            <strong>AI Insights:</strong> By leveraging AI, we provide deeper insights into transaction patterns, helping to flag suspicious activities and provide recommendations for secure financial management.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialAdvisorPage;
