'use client';

import React, { useState } from 'react';

const CryptoWalletCheckPage: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [checkResult, setCheckResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckWallet = async () => {
    setLoading(true);
    setError('');
    setCheckResult(null);
    try {
      const response = await fetch(`/api/dustcheck?address=${walletAddress}`);
      const data = await response.json();
      if (response.ok) {
        setCheckResult(data);
      } else {
        setError(data.error || 'An error occurred while checking the wallet address. Please try again.');
      }
    } catch (error) {
      setError('An error occurred while checking the wallet address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto min-h-screen flex flex-col items-center py-12 px-4 md:px-8 lg:px-16">
      <h1 className="text-3xl font-bold mb-6 text-center">Check If Your Crypto Wallet Has Been Dusted</h1>
      <p className="text-lg mb-4 text-center">Enter your wallet address below to check if it has been involved in dusting or flagged activities.</p>
      
      <div className="input-group flex flex-col md:flex-row items-center mb-6 w-full max-w-xl">
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter your wallet address"
          className="wallet-input p-3 border rounded-md w-full mb-4 md:mb-0 md:mr-4 text-black"
        />
        <button onClick={handleCheckWallet} disabled={loading} className="check-button bg-neorange text-white p-3 rounded-md w-full md:w-auto">
          {loading ? 'Checking...' : 'Check'}
        </button>
      </div>

      {error && <p className="error-message text-red-500 mb-4">{error}</p>}
      
      {checkResult && (
        <div className="result text-black w-full max-w-2xl bg-gray-100 p-6 rounded-md shadow-md">
          <h2 className="text-2xl font-bold mb-4">Check Result</h2>
          <pre className="result-json bg-white p-4 rounded-md mb-6 overflow-auto">
            {JSON.stringify(checkResult, null, 2)}
          </pre>
          <h2 className="text-2xl font-bold mb-4">Recommendations</h2>
          <ul className="list-disc list-inside mb-6">
            {checkResult.recommendations.map((recommendation: string, index: number) => (
              <li key={index}>{recommendation}</li>
            ))}
          </ul>
          {checkResult.dusting_patterns.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Dusting Patterns Detected</h2>
              <ul className="list-disc list-inside">
                {checkResult.dusting_patterns.map((pattern: any, index: number) => (
                  <li key={index} className="mb-4">
                    <strong>Transaction Hash:</strong> {pattern.transactionHash}<br />
                    <strong>From:</strong> {pattern.from}<br />
                    <strong>To:</strong> {pattern.to}<br />
                    <strong>Value:</strong> {pattern.value} ETH<br />
                    <strong>Timestamp:</strong> {pattern.timestamp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="notice w-full max-w-2xl bg-yellow-100 p-4 rounded-md shadow-md mt-6">
        <p className="text-yellow-800">Note: By entering your wallet address, you agree that it may be stored and used to improve iDeFi.AI security and logic for providing better features and services to crypto users.</p>
      </div>

      <style jsx>{`
        .container {
          text-align: center;
        }
        .input-group {
          margin: 20px 0;
        }
        .wallet-input {
          padding: 10px;
          font-size: 16px;
        }
        .check-button {
          padding: 10px 20px;
          font-size: 16px;
        }
        .error-message {
          color: red;
        }
        .result {
          margin-top: 20px;
        }
        .result-json {
          text-align: left;
          background: #f0f0f0;
          padding: 10px;
          border-radius: 5px;
          max-height: 300px;
        }
        .notice {
          margin-top: 20px;
          text-align: left;
        }
      `}</style>
    </div>
  );
};

export default CryptoWalletCheckPage;
