'use client';

import React, { useState } from 'react';

interface MetricsData {
  activity_score: number;
  risk_scores: any;
  opportunity_scores: any;
  trust_scores: any;
  volatility_scores: any;
}

interface AddressCheckResult {
  address: string;
  description: string;
  classification: 'pass' | 'fail' | 'pending';
  transactionHash?: string;
  from?: string;
  to?: string;
  parentTxnHash?: string;
  etherscanUrl?: string;
  insights?: any;
  timestamp?: string; // Optional timestamp property
  value?: string; // Optional value property
  gasUsed?: string; // Optional gasUsed property
  status?: string; // Optional status property
}

const MetricsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [rawBlockchainData, setRawBlockchainData] = useState<any>(null);
  const [transformedData, setTransformedData] = useState<any>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  const handleFetchRawData = async () => {
    setLoading(true);
    setLoadingMessage('Fetching raw blockchain data...');
    try {
      const response = await fetch('https://api.idefi.ai/api/get_etherscan_data?address=YOUR_ADDRESS_HERE', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      console.log('Raw blockchain data:', data);

      // Process raw data to include classification
      const processedData = await processAddressCheck([data]);
      setRawBlockchainData(processedData);
      const transformed = transformRawData(processedData);
      setTransformedData(transformed);
      setMetrics(await fetchMetrics(transformed));
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
    setLoadingMessage('');
  };

  const processAddressCheck = async (data: any) => {
    const flaggedAddresses = await fetchFlaggedAddresses();
    const addressCheckResults: AddressCheckResult[] = data.map((tx: any) => {
      const address = tx.to || tx.from;
      const description = tx.description || 'Pending review';
      const classification = flaggedAddresses.has(address.toLowerCase()) ? 'fail' : 'pass';
      return {
        address,
        description,
        classification,
        transactionHash: tx.hash,
        from: tx.from,
        to: tx.to,
        parentTxnHash: tx.hash,
        etherscanUrl: `https://etherscan.io/tx/${tx.hash}`,
        insights: tx.insights,
        timestamp: tx.timestamp,
        value: tx.value,
        gasUsed: tx.gasUsed,
        status: tx.status,
      };
    });

    return addressCheckResults;
  };

  const fetchFlaggedAddresses = async () => {
    const response = await fetch('https://api.idefi.ai/api/get_flagged_addresses');
    const data = await response.json();
    return new Set(data.map((addr: any) => addr.address.toLowerCase()));
  };

  const transformRawData = (data: AddressCheckResult[]) => {
    if (!data) {
      console.error('Invalid raw data:', data);
      return null;
    }

    return {
      transactions: data.map((tx) => ({
        transactionHash: tx.transactionHash || '',
        timestamp: tx.timestamp ? new Date(parseInt(tx.timestamp) * 1000).toISOString() : '',
        from: tx.from || '',
        to: tx.to || '',
        value: tx.value ? `${parseFloat(tx.value) / 1e18} ETH` : '',
        gasUsed: tx.gasUsed || '',
        status: tx.status === '0' ? 'Success' : 'Failed',
        description: tx.description || '',
        classification: tx.classification || 'pending',
        insights: tx.insights || {},
      })),
    };
  };

  const fetchMetrics = async (data: any) => {
    try {
      const response = await fetch('https://api.idefi.ai/api/calculate_metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transformed_data: data }),
      });
      const metricsData = await response.json();
      return metricsData;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return null;
    }
  };

  return (
    <div className="container mx-auto min-h-screen flex flex-col items-center py-12 px-4 md:px-8 lg:px-16">
      <div className="section w-full max-w-4xl mb-8">
        <h2 className="text-2xl font-bold mb-4">Fetch and Analyze Blockchain Data</h2>
        <button onClick={handleFetchRawData} disabled={loading} className="mt-4 p-2 bg-blue-500 text-white rounded">
          {loading && loadingMessage === 'Fetching raw blockchain data...' ? 'Loading...' : 'Fetch Data'}
        </button>
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
              <p className="bg-gray-100 p-4 rounded-md text-left overflow-auto">{metrics.activity_score}</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Risk Scores</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-left overflow-auto">{JSON.stringify(metrics.risk_scores, null, 2)}</pre>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Opportunity Scores</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-left overflow-auto">{JSON.stringify(metrics.opportunity_scores, null, 2)}</pre>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Trust Scores</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-left overflow-auto">{JSON.stringify(metrics.trust_scores, null, 2)}</pre>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Volatility Scores</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-left overflow-auto">{JSON.stringify(metrics.volatility_scores, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsPage;
