// components/ScoreTable.tsx

'use client'

import React, { useState } from 'react';
import { AddressCheckResult } from '@/utilities/GenAiFirewall';
import { getColorForClassification } from '@/utilities/colorMapping'; // Ensure the path is correct

interface ScoreTableProps {
  results: AddressCheckResult[];
  getColorForClassification: (classification: 'pass' | 'fail' | 'pending') => string;

}

const ScoreTable: React.FC<ScoreTableProps> = ({ results }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (index: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index);
    } else {
      newExpandedRows.add(index);
    }
    setExpandedRows(newExpandedRows);
  };

  const handleDownloadResults = () => {
    const jsonData = JSON.stringify(results, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'firewall_results.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shortenAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="score-table-container">
      <h2>Firewall Address Results</h2>
      <div className="table-responsive">
        <div className="table-header">
          <div className="table-cell">Address</div>
          <div className="table-cell">Classification</div>
        </div>
        {results.map((result, index) => (
          <div key={index} className="table-row" onClick={() => toggleRow(index)}>
            <div className="table-cell">
              <span className="wallet-address">{shortenAddress(result.address)}</span>
            </div>
            <div className={`table-cell ${getColorForClassification(result.classification)}`}>
              {result.classification}
            </div>
            {expandedRows.has(index) && (
              <div className="expanded-content">
                <p><strong>Description:</strong> {result.description}</p>
                {result.transactionHash && <p><strong>Transaction Hash:</strong> {result.transactionHash}</p>}
                {result.from && <p><strong>From:</strong> {result.from}</p>}
                {result.to && <p><strong>To:</strong> {result.to}</p>}
                {result.parentTxnHash && <p><strong>Parent Txn Hash:</strong> {result.parentTxnHash}</p>}
                {result.etherscanUrl && (
                  <p>
                    <strong>Etherscan URL:</strong>{' '}
                    <a href={result.etherscanUrl} target="_blank" rel="noopener noreferrer" className="etherscan-link">
                      Open Link
                    </a>
                  </p>
                )}
                {result.insights && (
                  <div className="insights">
                    <p><strong>Insights:</strong></p>
                    <pre>{JSON.stringify(result.insights, null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <button className="download-button" onClick={handleDownloadResults}>
        Download Results
      </button>
      <style jsx>{`
        .score-table-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 20px;
          padding: 0 20px;
          width: 100%;
        }
        .table-responsive {
          width: 100%;
        }
        .table-header, .table-row {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          border: 1px solid #ccc;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        .table-header {
          background-color: #f8f9fa;
          color: #000;
          font-weight: bold;
        }
        .table-cell {
          flex: 1;
          text-align: left;
          padding: 0 10px;
        }
        .wallet-address {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 5px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          width: 100%;
        }
        .green {
          color: green;
        }
        .red {
          color: red;
        }
        .yellow {
          color: yellow;
        }
        .expanded-content {
          padding: 10px;
          border-top: 1px solid #ccc;
        }
        .insights {
          margin-top: 10px;
        }
        .download-button {
          margin-top: 20px;
          padding: 10px 20px;
          cursor: pointer;
          background-color: #007bff;
          color: #fff;
          border: none;
          border-radius: 5px;
          font-size: 16px;
        }
        .download-button:hover {
          background-color: #0056b3;
        }
        .etherscan-link {
          color: #913d88;
          text-decoration: none;
        }
        .etherscan-link:hover {
          color: #6f1d6b;
        }
        @media (max-width: 600px) {
          .wallet-address {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default ScoreTable;
