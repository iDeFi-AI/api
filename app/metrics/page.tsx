'use client';

import React, { useState } from 'react';

interface MetricsData {
  activity_score: number;
  risk_scores: any;
  opportunity_scores: any;
  trust_scores: any;
  volatility_scores: any;
}

const MetricsPage: React.FC = () => {
  const [address, setAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [rawBlockchainData, setRawBlockchainData] = useState<any>(null);
  const [transformedData, setTransformedData] = useState<any>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [noTransactionsMessage, setNoTransactionsMessage] = useState<string>('');

  const handleFetchRawData = async () => {
    if (!address) {
      setLoadingMessage('Address is required');
      return;
    }

    setLoading(true);
    setLoadingMessage('Fetching raw blockchain data...');
    try {
      const response = await fetch(`/api/get_data_and_metrics?address=${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw blockchain data:', data);

      if (data.error) {
        setNoTransactionsMessage(data.error);
        setRawBlockchainData(null);
        setTransformedData(null);
        setMetrics(null);
        setLoadingMessage('');
        setLoading(false);
        return;
      }

      setRawBlockchainData(data.raw_data);
      setTransformedData(data.transformed_data);
      setMetrics(data.metrics);
      setLoadingMessage('');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error:', error.message);
        setLoadingMessage(`Error: ${error.message}`);
      } else {
        console.error('Unknown error:', error);
        setLoadingMessage('Unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto min-h-screen flex flex-col items-center py-12 px-4 md:px-8 lg:px-16">
      <div className="section w-full max-w-4xl mb-8">
        <h2 className="text-2xl font-bold mb-4">Fetch and Analyze Blockchain Data</h2>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Ethereum address"
          className="w-full p-2 border rounded mb-4 text-black"
        />
        <button onClick={handleFetchRawData} disabled={loading} className="mt-4 p-2 bg-blue-500 text-white rounded">
          {loading ? loadingMessage : 'Fetch Data'}
        </button>
        {noTransactionsMessage && (
          <div className="mt-4 p-4 bg-yellow-100 text-yellow-700 rounded">
            {noTransactionsMessage}
          </div>
        )}
        {rawBlockchainData && transformedData && (
          <div className="comparison-container mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Raw Blockchain Data</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-black text-left overflow-auto max-h-96">
                {JSON.stringify(rawBlockchainData, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Transformed iDeFi.AI Data</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-black text-left overflow-auto max-h-96">
                {JSON.stringify(transformedData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {metrics && (
        <div className="section w-full max-w-4xl mb-8">
          <h2 className="text-2xl font-bold mb-4">Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xl font-bold mb-2">Activity Score</h3>
              <p className="text-black bg-gray-100 p-4 rounded-md text-left overflow-auto">{metrics.activity_score}</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Risk Scores</h3>
              <pre className="text-black bg-gray-100 p-4 rounded-md text-left overflow-auto">{JSON.stringify(metrics.risk_scores, null, 2)}</pre>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Opportunity Scores</h3>
              <pre className="text-black bg-gray-100 p-4 rounded-md text-left overflow-auto">{JSON.stringify(metrics.opportunity_scores, null, 2)}</pre>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Trust Scores</h3>
              <pre className="text-black bg-gray-100 p-4 rounded-md text-left overflow-auto">{JSON.stringify(metrics.trust_scores, null, 2)}</pre>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Volatility Scores</h3>
              <pre className="text-black bg-gray-100 p-4 rounded-md text-left overflow-auto">{JSON.stringify(metrics.volatility_scores, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsPage;
