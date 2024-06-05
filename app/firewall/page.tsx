'use client';

import React, { useState, useEffect } from 'react';
import ScoreTable from '@/components/ScoreTable';
import { processAddressCheck, AddressCheckResult } from '@/utilities/GenAiFirewall';

// Helper function to clean and validate addresses
const cleanAndValidateAddresses = (addresses: string[]): string[] => {
  const validAddresses: string[] = [];
  addresses.forEach(address => {
    const cleanedAddress = address.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(cleanedAddress)) {
      validAddresses.push(cleanedAddress);
    }
  });
  return validAddresses;
};

const FirewallPage: React.FC = () => {
  const [addresses, setAddresses] = useState<string>('');
  const [results, setResults] = useState<AddressCheckResult[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [flaggedAddresses, setFlaggedAddresses] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFlaggedAddresses = async () => {
      try {
        const response = await fetch('/api/get_flagged_addresses');
        if (!response.ok) {
          throw new Error('Failed to fetch flagged addresses');
        }
        const data = await response.json();
        setFlaggedAddresses(new Set(Object.keys(data)));
      } catch (error) {
        console.error('Error fetching flagged addresses:', error);
      }
    };

    fetchFlaggedAddresses();
  }, []);

  const handleAddressCheck = async () => {
    if (!addresses.trim()) {
      setError('Please enter addresses or upload a file.');
      return;
    }

    const addressArray = addresses.split('\n').map(addr => addr.trim());
    const validAddresses = cleanAndValidateAddresses(addressArray);

    if (validAddresses.length === 0) {
      setError('No valid addresses provided.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/checkaddress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ addresses: validAddresses })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();

      const processedResults = await processAddressCheck(data, flaggedAddresses);
      setResults(processedResults);
      setError('');
    } catch (error) {
      console.error('Error checking addresses:', error);
      setResults([]);
      setError('Error checking addresses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getColorForClassification = (classification: 'pass' | 'fail' | 'pending'): string => {
    switch (classification) {
      case 'pass':
        return 'green';
      case 'fail':
        return 'red';
      case 'pending':
        return 'yellow';
      default:
        return 'white';
      }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const processedResults = await processAddressCheck(data.details, flaggedAddresses);
        setResults(processedResults);
        setAddresses('');
        setError('');
      } catch (error) {
        console.error('Error uploading file:', error);
        setResults([]);
        setError('Error uploading file. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (results.length === 0) {
      await handleAddressCheck();
    }
  };

  return (
    <>
      <div className="firewall-page">
        <h1>Firewall Check</h1>
        <h3>BETA</h3>
        <form onSubmit={handleSubmit}>
          <textarea
            placeholder="Enter EVM addresses (one per line) or upload a file"
            value={addresses}
            onChange={(e) => setAddresses(e.target.value)}
            className="text-black"
          />
          <input
            type="file"
            accept=".csv, .json"
            onChange={handleFileUpload}
          />
          <button type="submit" disabled={results.length > 0 || isLoading}>
            {isLoading ? 'Checking...' : 'Check Addresses'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        {results.length > 0 && (
          <div className="results-container">
            <ScoreTable results={results} getColorForClassification={getColorForClassification} />
          </div>
        )}
      </div>
      <style jsx>{`
        .firewall-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 50px;
          padding: 0 20px;
        }
        form {
          width: 100%;
          max-width: 500px;
          margin-bottom: 20px;
        }
        textarea {
          width: 100%;
          height: 150px;
          padding: 8px;
          margin-bottom: 10px;
          resize: vertical;
          font-size: 16px;
        }
        input[type="file"] {
          width: 100%;
          margin-bottom: 10px;
        }
        button {
          width: 100%;
          padding: 10px 20px;
          margin-top: 10px;
          cursor: pointer;
          background-color: #007bff;
          color: #fff;
          border: none;
          border-radius: 5px;
          font-size: 16px;
        }
        button:hover {
          background-color: #0056b3;
        }
        .error {
          color: red;
          margin-top: 10px;
          font-size: 14px;
        }
        .results-container {
          width: 100%;
          overflow-x: auto;
          margin-top: 20px;
        }

        @media (max-width: 600px) {
          form {
            max-width: 100%;
          }
          textarea {
            height: 120px;
            font-size: 14px;
          }
          button {
            font-size: 14px;
          }
          .error {
            font-size: 12px;
          }
          .results-container {
            overflow-x: auto;
          }
        }
      `}</style>
    </>
  );
};

export default FirewallPage;
