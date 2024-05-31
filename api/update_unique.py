import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

UNIQUE_DIR = '/tmp/unique'
ETHERSCAN_API_KEY = os.getenv('ETHERSCAN_API_KEY')

def load_unique_addresses():
    unique_addresses = set()
    # Load addresses from JSON files in the unique directory
    for filename in os.listdir(UNIQUE_DIR):
        if filename.endswith('.json'):
            filepath = os.path.join(UNIQUE_DIR, filename)
            with open(filepath, 'r') as f:
                data = json.load(f)
                for address in data:
                    unique_addresses.add(address.lower())
    return unique_addresses

def fetch_latest_transactions(address):
    transactions = []
    try:
        # Regular transactions
        regular_tx_url = f'https://api.etherscan.io/api?module=account&action=txlist&address={address}&apikey={ETHERSCAN_API_KEY}'
        regular_tx_response = requests.get(regular_tx_url)
        if regular_tx_response.status_code == 200:
            regular_tx_data = regular_tx_response.json()
            if 'result' in regular_tx_data:
                transactions.extend(regular_tx_data['result'])

        # Internal transactions
        internal_tx_url = f'https://api.etherscan.io/api?module=account&action=txlistinternal&address={address}&apikey={ETHERSCAN_API_KEY}'
        internal_tx_response = requests.get(internal_tx_url)
        if internal_tx_response.status_code == 200:
            internal_tx_data = internal_tx_response.json()
            if 'result' in internal_tx_data:
                transactions.extend(internal_tx_data['result'])
    except Exception as e:
        print(f"Error fetching data from Etherscan API for address {address}: {e}")
    return transactions

def update_unique_addresses():
    if not os.path.exists(UNIQUE_DIR):
        os.makedirs(UNIQUE_DIR)

    unique_addresses = load_unique_addresses()
    new_unique_addresses = set()

    for address in unique_addresses:
        transactions = fetch_latest_transactions(address)
        for tx in transactions:
            new_unique_addresses.add(tx['from'].lower())
            new_unique_addresses.add(tx['to'].lower())

    # Save the new unique addresses to a JSON file
    updated_addresses_path = os.path.join(UNIQUE_DIR, f'unique_addresses_{datetime.now().strftime("%Y%m%d")}.json')
    with open(updated_addresses_path, 'w') as f:
        json.dump(list(new_unique_addresses), f, indent=4)

    print(f"Updated unique addresses saved to {updated_addresses_path}")

def handler(event, context):
    update_unique_addresses()
    return {
        'statusCode': 200,
        'body': json.dumps('Unique addresses updated successfully!')
    }

# Entry point for Vercel
if __name__ == '__main__':
    handler({}, {})
