'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const MonitorPage: React.FC = () => {
  const [address, setAddress] = useState<string>('');
  const [addresses, setAddresses] = useState<string[]>([]);
  const [monitoredData, setMonitoredData] = useState<{ [address: string]: any[] }>({});
  const [monitoring, setMonitoring] = useState<{ [address: string]: boolean }>({});
  const [error, setError] = useState<string>('');
  const chartRefs = useRef<{ [address: string]: any }>({});

  const addAddress = () => {
    if (address && !addresses.includes(address)) {
      setAddresses(prevAddresses => [...prevAddresses, address]);
      setMonitoredData(prevData => ({
        ...prevData,
        [address]: [],
      }));
      setMonitoring(prevMonitoring => ({
        ...prevMonitoring,
        [address]: true,
      }));
      setAddress(''); // Reset input field
    }
  };

  const removeAddress = (addressToRemove: string) => {
    const filteredAddresses = addresses.filter(addr => addr !== addressToRemove);
    setAddresses(filteredAddresses);
    setMonitoredData(prevData => {
      const newData = { ...prevData };
      delete newData[addressToRemove];
      return newData;
    });
    setMonitoring(prevMonitoring => {
      const newMonitoring = { ...prevMonitoring };
      delete newMonitoring[addressToRemove];
      return newMonitoring;
    });
  };

  const startMonitoring = async (address: string) => {
    try {
      const response = await fetch('/api/monitor_address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error('Failed to start monitoring');
      }

      const data = await response.json();
      if (data.transactions) {
        setMonitoredData(prevData => ({
          ...prevData,
          [address]: data.transactions,
        }));
      }

      setError('');
    } catch (error: any) {
      setError(error.message || 'Unknown error occurred');
    }
  };

  useEffect(() => {
    addresses.forEach(address => {
      if (monitoring[address]) {
        const interval = setInterval(() => {
          startMonitoring(address);
        }, 60000);

        return () => clearInterval(interval);
      }
    });
  }, [monitoring, addresses]);

  const formatDataForChart = (address: string) => {
    const filteredTransactions = monitoredData[address] || [];
    const labels = filteredTransactions.map(tx => new Date(tx.timestamp * 1000).toLocaleString());
    const data = filteredTransactions.map(tx => tx.value);

    return {
      labels,
      datasets: [
        {
          label: 'Transaction Value (ETH)',
          data,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
        },
      ],
    };
  };

  const handleDownload = (address: string) => {
    const chart = chartRefs.current[address];
    if (chart) {
      const url = chart.toBase64Image();
      const link = document.createElement('a');
      link.href = url;
      link.download = `${address}_transactions.png`;
      link.click();
    }
  };

  const chartOptions = {
    plugins: {
      tooltip: {
        callbacks: {
          label: (tooltipItem: any) => {
            const tx = monitoredData[addresses[tooltipItem.datasetIndex]][tooltipItem.dataIndex];
            return `Value: ${tx.value} ETH\nType: ${tx.type}\nTimestamp: ${new Date(tx.timestamp * 1000).toLocaleString()}`;
          },
        },
      },
    },
  };

  return (
    <div className="monitor-page mt-8">
      <h1>Ethereum Heart Monitor</h1>
      <h3>BETA</h3>
      <div className="input-section text-black">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Ethereum address"
        />
        <div className="buttons">
          <button className="start" onClick={addAddress}>Add Address</button>
        </div>
      </div>
      <div className="monitoring-section">
        {addresses.map(address => (
          <div key={address} className="monitoring-container">
            <h3>Monitoring Address: {address}</h3>
            <div className="monitoring-graph">
              <Line
                data={formatDataForChart(address)}
                options={chartOptions}
                ref={(el) => { chartRefs.current[address] = el; }}
              />
            </div>
            <div className="buttons">
              <button className="stop" onClick={() => removeAddress(address)}>Stop Monitoring</button>
              <button className="download" onClick={() => handleDownload(address)}>Download Graph</button>
              {monitoring[address] && <div className="blinking-dot"></div>}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default MonitorPage;
