// utilities/GenAiFirewall.ts

import { openaiApiKey } from '@/constants/env';

export interface AddressCheckResult {
  address: string;
  description: string;
  classification: 'pass' | 'fail' | 'pending';
  transactionHash?: string;
  from?: string;
  to?: string;
  parentTxnHash?: string;
  etherscanUrl?: string;
  insights?: any; // Add an insights property to store additional analysis data
}

interface PromptContent {
  addresses: string[];
  results: string[];
}

export const generateOpenAIPrompt = async (content: PromptContent): Promise<string> => {
  const { addresses, results } = content;

  const promptContent = `
    Firewall Analytics:
    Analyze the following Ethereum addresses and provide insights regarding their activities.

    Addresses:
    ${addresses.map(addr => `- ${addr}`).join('\n')}
  
    Results:
    ${results.map((result, index) => `Result ${index + 1}: ${result}`).join('\n')}

    Please provide detailed analysis and classify each address as 'pass', 'fail', or 'pending' based on the results.
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo-0125',
        messages: [{ role: 'system', content: promptContent }],
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const responseData = await response.json();
    const generatedPrompt = responseData?.choices?.[0]?.message?.content || '';

    return generatedPrompt;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
};

export const processAddressCheck = async (
  data: AddressCheckResult[],
  flaggedAddresses: Set<string>
): Promise<AddressCheckResult[]> => {
  try {
    const updatedResults: AddressCheckResult[] = data.map(result => {
      let classification: 'pass' | 'fail' | 'pending' = 'pending';

      // Check if the address is flagged
      if (flaggedAddresses.has(result.address.toLowerCase())) {
        classification = 'fail'; // Flagged addresses are classified as 'fail'
      } else {
        // Check the description for 'Not Flagged'
        if (result.description.toLowerCase().includes('not flagged')) {
          classification = 'pass'; // 'Not Flagged' addresses are classified as 'pass'
        } else {
          classification = 'fail'; // Any other description is classified as 'fail'
        }
      }

      return { ...result, classification };
    });

    return updatedResults;
  } catch (error) {
    console.error('Error processing address check:', error);
    throw error;
  }
};
