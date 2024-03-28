// components/ScoreTxns.tsx
import React from 'react';
import Image from 'next/image';

type TransactionType = 'Sent' | 'Received';

interface Transaction {
  timestamp: string;
  type: TransactionType;
  cryptocurrency: string;
  thirdPartyIdacScore: number;
  usdAmount: number;
  thirdPartyWallet: string;
}

interface ScoreTxnsProps {
  transactions: Transaction[];
  overallScore: number | null; // Pass the overall iDAC score as a prop
}

const getColorForScore = (score: number, overallScore: number | null): string => {
  if (overallScore === null) {
    return 'grey'; // Default color for unknown overall score
  }

  if (score >= 850) {
    return 'green';
  } else if (score >= 740) {
    return 'yellow';
  } else if (score >= 670) {
    return 'orange';
  } else if (score >= 580) {
    return 'red';
  } else if (score >= 450) {
    return 'black'; // Changed from 'mixed' to 'black' based on your provided criteria
  } else {
    return 'grey';
  }
};

const getCategoryForScore = (score: number): string => {
  if (score >= 850) {
    return 'Excellent';
  } else if (score >= 740) {
    return 'Good';
  } else if (score >= 670) {
    return 'Fair';
  } else if (score >= 580) {
    return 'Poor';
  } else if (score >= 450) {
    return 'Bad';
  } else {
    return 'New';
  }
};

const ScoreTable: React.FC<ScoreTxnsProps> = ({ transactions, overallScore }) => {
  const sortedTransactions = [...transactions].sort((a, b) => b.thirdPartyIdacScore - a.thirdPartyIdacScore);

  return (
    <div className="score-transactions">
      <h2>Transaction History</h2>
      <div className="table-container">
        <div className="scroll-view">
          {Array.isArray(transactions) && transactions.length > 0 ? (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Party Score</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Party Wallet</th>
                    <th>Timestamp</th>
                    <th>Crypto</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTransactions.map((txn, index) => (
                    <tr key={index}>
                      <td className="score-transactions">
                        <div className="txn-hex">
                          <Image
                            src={`/${getColorForScore(txn.thirdPartyIdacScore, overallScore)}.svg`}
                            alt="Hexagon"
                            width={15}
                            height={15}
                          />
                        </div>
                        <div className="tab-score">{txn.thirdPartyIdacScore}</div>
                      </td>
                      <td className={getCategoryForScore(txn.thirdPartyIdacScore)}>
                        {getCategoryForScore(txn.thirdPartyIdacScore)}
                      </td>
                      <td>{txn.type}</td>
                      <td className="wallet">
                        <div className="shortened-wallet" title={txn.thirdPartyWallet}>
                          {shortenWalletAddress(txn.thirdPartyWallet)}
                        </div>
                      </td>
                      <td>{txn.timestamp}</td>
                      <td>{txn.cryptocurrency}</td>
                      <td>${txn.usdAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No transactions available for the given address.</p>
          )}
        </div>
      </div>
      <style jsx>{`
        .score-transactions {
          margin-top: 20px;
        }
        .table-container {
          overflow: auto; /* Enable both horizontal and vertical scroll */
        }
        .scroll-view {
          max-height: 400px; /* Set max height for scroll view */
          overflow: auto; /* Enable vertical scroll */
        }
        .table-responsive {
          width: 100%;
          overflow-x: auto; /* Enable horizontal scroll */
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          border: 2px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .txn-hex {
          margin-right: 8px;
        }
        .tab-score {
          max-width: 100px;
          color: white;
        }
        .wallet {
          word-break: break-all;
        }
        .shortened-wallet {
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Media query for smaller screens */
        @media (max-width: 600px) {
          th, td {
            font-size: 8px;
            padding: 3px; /* Adjust padding for smaller screens */
          }
          .tab-score {
            max-width: 25px; /* Adjust the maximum width for score */
          }
        }

        /* Custom styles for category classes */
        .Excellent {
          color: green;
        }
        .Good {
          color: yellow;
        }
        .Fair {
          color: orange;
        }
        .Poor {
          color: red;
        }
        .Bad {
          color: black;
          border: 1px solid white; /* Add the desired border style for the "Bad" category */
        }
        .New {
          color: grey;
        }
      `}</style>
    </div>
  );
};

// Function to shorten a wallet address
const shortenWalletAddress = (address: string): string => {
  const prefixLength = 6; // Show the first 6 characters
  const suffixLength = 4; // Show the last 4 characters

  if (address.length <= prefixLength + suffixLength) {
    return address; // If the address is short, return as is
  }

  const prefix = address.slice(0, prefixLength);
  const suffix = address.slice(-suffixLength);

  return `${prefix}...${suffix}`;
};

export default ScoreTable;
