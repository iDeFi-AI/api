'use client';

import React, { useState } from 'react';

const SmartContractAnalyzer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleAnalyzeFile = async () => {
    if (!selectedFile) {
      setError('Please select a file to analyze');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/analyze_smart_contract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze the smart contract');
      }

      const result = await response.json();
      setAnalysisResult(result.analysis);
      setError('');
    } catch (err) {
      setError('Failed to analyze the smart contract');
      setAnalysisResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeAddress = async () => {
    if (!contractAddress) {
      setError('Please enter a smart contract address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/analyze_contract_address?address=${contractAddress}`);
      const data = await response.json();
      if (response.ok) {
        setAnalysisResult(data.analysis);
        setError('');
      } else {
        setError(data.error || 'An error occurred while analyzing the smart contract address. Please try again.');
        setAnalysisResult(null);
      }
    } catch (error) {
      setError('An error occurred while analyzing the smart contract address. Please try again.');
      setAnalysisResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto min-h-screen flex flex-col items-center py-12 px-4 md:px-8 lg:px-16">
      <h1 className="text-3xl font-bold mb-6 text-center">Smart Contract Analyzer</h1>
      <p className="text-lg mb-4 text-center">Upload your smart contract file or enter a smart contract address to get an in-depth analysis.</p>

      <div className="flex flex-col md:flex-row items-center w-full max-w-xl mb-6">
        <input type="file" accept=".sol" onChange={handleFileChange} className="mb-4 md:mb-0 md:mr-4" />
        <button onClick={handleAnalyzeFile} className="bg-blue-500 text-white p-3 rounded-md w-full md:w-auto">
          Analyze File
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-center w-full max-w-xl mb-6">
        <input
          type="text"
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          placeholder="Enter smart contract address"
          className="p-3 border rounded-md w-full mb-4 md:mb-0 md:mr-4"
        />
        <button onClick={handleAnalyzeAddress} className="bg-blue-500 text-white p-3 rounded-md w-full md:w-auto">
          Analyze Address
        </button>
      </div>

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {loading && <p className="text-blue-500 mt-4">Loading...</p>}

      {analysisResult && (
        <div className="result w-full max-w-2xl bg-gray-100 p-6 rounded-md shadow-md mt-6">
          <h2 className="text-2xl font-bold mb-4">Analysis Result:</h2>
          <pre className="bg-white p-4 rounded-md overflow-auto">{JSON.stringify(analysisResult, null, 2)}</pre>
        </div>
      )}

      <div className="notice w-full max-w-2xl bg-yellow-100 p-4 rounded-md shadow-md mt-6">
        <p className="text-yellow-800">
          Note: By uploading your smart contract file or entering a smart contract address, you agree that it may be stored and used to improve iDeFi.AI security and logic for providing better features and services to users.
        </p>
      </div>

      <style jsx>{`
        .container {
          text-align: center;
        }
        .result {
          margin-top: 20px;
        }
        .notice {
          margin-top: 20px;
          text-align: left;
        }
        .result-json {
          text-align: left;
          background: #f0f0f0;
          padding: 10px;
          border-radius: 5px;
        }
      `}</style>
    </div>
  );
};

export default SmartContractAnalyzer;
