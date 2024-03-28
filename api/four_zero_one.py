import requests
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import LabelEncoder
from tqdm import tqdm
import openai
import json
import os
from web3 import Web3

class QueenAI:
    def __init__(self, openai_apikey, eth_apikey, web3_provider):
        self.openai_apikey = openai_apikey
        openai.api_key = self.openai_apikey  # Set OpenAI API key
        self.eth_apikey = eth_apikey
        self.web3_provider = web3_provider
        self.transaction_data = None
        self.model = RandomForestClassifier()
        self.features = None
        self.target = None
        self.test_features = None
        self.test_labels = None
        self.ethereum_data = {}
        self.address_names_mapping = {}  # Add a mapping for address names if applicable
        self.sanctioned_addresses = []

    def fetch_eth_transactions(self, eth_address):
        eth_url = f"https://api.etherscan.io/api?module=account&action=txlist&address={eth_address}&startblock=0&endblock=99999999&sort=asc&apikey={self.eth_apikey}"
        eth_response = requests.get(eth_url)
        eth_data = eth_response.json()
        return eth_data['result']

    def fetch_associated_addresses(self, eth_address, depth=1, current_depth=1, direction='both'):
        associated_addresses = set()

        if current_depth > depth:
            return associated_addresses

        transactions = self.fetch_eth_transactions(eth_address)

        for tx in transactions:
            sender = tx['from']
            receiver = tx['to']

            if direction in ['both', 'sent']:
                associated_addresses.add(sender)
            if direction in ['both', 'received']:
                associated_addresses.add(receiver)

            if current_depth < depth:
                if direction in ['both', 'sent']:
                    associated_addresses.update(self.fetch_associated_addresses(sender, depth, current_depth + 1, direction='sent'))
                if direction in ['both', 'received']:
                    associated_addresses.update(self.fetch_associated_addresses(receiver, depth, current_depth + 1, direction='received'))

        return associated_addresses

    def fetch_transaction_data(self, eth_addresses):
        eth_transactions = []
        for address in tqdm(eth_addresses, desc='Fetching Transaction Data'):
            transactions = self.fetch_eth_transactions(address)
            if transactions:
                for tx in transactions:
                    eth_transactions.append({
                        'address': address,
                        'tx_value': int(tx['value']) / 10**18,
                        'timestamp': int(tx['timeStamp']),
                        'type': 'eth'
                    })
            else:
                print(f"No transactions found for address: {address}")

        transactions_df = pd.DataFrame(eth_transactions)
        self.transaction_data = pd.concat([self.transaction_data, transactions_df], ignore_index=True)

    def fetch_ethereum_data_from_etherscan(self, wallet_address):
        eth_balance_columns = ['status', 'message', 'result']
        eth_transaction_columns = ['blockNumber', 'timeStamp', 'hash', 'nonce', 'from', 'to', 'value', 'gas', 'gasPrice']
        extracted_data = {}

        # Fetch and parse Ethereum balance
        eth_url = f"https://api.etherscan.io/api?module=account&action=balance&address={wallet_address}&apikey={self.eth_apikey}"
        eth_response = requests.get(eth_url)
        eth_data = eth_response.json()
        eth_extracted = {key: eth_data[key] for key in eth_balance_columns if key in eth_data}
        extracted_data['eth_balance'] = eth_extracted

        # Now let's fetch and parse Ethereum transactions data
        eth_tx_url = f"https://api.etherscan.io/api?module=account&action=txlist&address={wallet_address}&startblock=0&endblock=99999999&sort=asc&apikey={self.eth_apikey}"
        eth_tx_response = requests.get(eth_tx_url)
        eth_tx_data = eth_tx_response.json()

        # Extract only the required features for each transaction
        eth_tx_extracted = [{key: tx[key] for key in eth_transaction_columns if key in tx} for tx in eth_tx_data['result']]
        extracted_data['eth_transactions'] = eth_tx_extracted

        return extracted_data

    def fetch_ethereum_data_from_web3(self, wallet_address):
        w3 = Web3(Web3.HTTPProvider(self.web3_provider))

        extracted_data = {}

        # Fetch Ethereum balance
        eth_balance = w3.eth.get_balance(wallet_address)
        extracted_data['eth_balance'] = eth_balance

        # Fetch Ethereum transactions
        eth_transactions = []
        transactions = w3.eth.get_transaction_count(wallet_address)
        for i in range(transactions):
            tx = w3.eth.get_transaction(wallet_address, i)
            eth_transactions.append({
                'blockNumber': tx['blockNumber'],
                'timeStamp': tx['timestamp'],
                'hash': tx['hash'].hex(),
                'nonce': tx['nonce'],
                'from': tx['from'],
                'to': tx['to'],
                'value': tx['value'],
                'gas': tx['gas'],
                'gasPrice': tx['gasPrice']
            })
        extracted_data['eth_transactions'] = eth_transactions

        return extracted_data

    def fetch_ethereum_data_from_json(self, json_file):
        with open(json_file, 'r') as f:
            data = json.load(f)
        return data

    def save_ethereum_data_to_json(self, data, json_file):
        with open(json_file, 'w') as json_file:
            json.dump(data, json_file)

    def prepare_data(self):
        if os.path.exists('ethereum_data.json'):
            self.ethereum_data = self.fetch_ethereum_data_from_json('ethereum_data.json')
        else:
            print("Fetching Ethereum data...")
            for address in tqdm(self.transaction_data['address'].unique(), desc='Fetching Ethereum Data'):
                if self.web3_provider:
                    self.ethereum_data[address] = self.fetch_ethereum_data_from_web3(address)
                else:
                    self.ethereum_data[address] = self.fetch_ethereum_data_from_etherscan(address)
            self.save_ethereum_data_to_json(self.ethereum_data, 'ethereum_data.json')

        self.features = self.transaction_data[['address', 'tx_value', 'timestamp']]
        self.target = self.transaction_data['type']

        le = LabelEncoder()
        self.target = le.fit_transform(self.target)

        self.features['address'] = le.fit_transform(self.features['address'])

        self.features_train, self.features_test, self.target_train, self.target_test = train_test_split(
            self.features, self.target, test_size=0.3, random_state=42)

    def train_model(self):
        print("Training model...")
        self.model.fit(self.features_train, self.target_train)
        print("Model trained successfully.")

    def calculate_iDAC_score(self):
        predictions = self.model.predict(self.features_test)
        accuracy = accuracy_score(self.target_test, predictions)
        return accuracy * 100

    def load_sanctioned_addresses(self, json_file):
        with open(json_file, 'r') as f:
            self.sanctioned_addresses = json.load(f)

    def load_torn_addresses(self, json_file):
        with open(json_file, 'r') as f:
            torn_addresses = json.load(f)
        self.sanctioned_addresses.extend(torn_addresses)

    def detect_wallet(self, wallet_address):
        if wallet_address in self.sanctioned_addresses:
            return "This address is associated with a sanctioned entity."
        else:
            return "This address is not associated with a sanctioned entity."

    def main(self):
        self.fetch_transaction_data(self.sanctioned_addresses)
        self.prepare_data()
        self.train_model()
        idac_score = self.calculate_iDAC_score()
        print(f"IDAC Score: {idac_score}")

        while True:
            user_input = input("Enter an Ethereum wallet address to check (or 'quit' to exit): ")
            if user_input.lower() == 'quit':
                break
            else:
                if self.web3_provider:
                    wallet_data = self.fetch_ethereum_data_from_web3(user_input)
                else:
                    wallet_data = self.fetch_ethereum_data_from_etherscan(user_input)
                print(wallet_data)
                wallet_detection_result = self.detect_wallet(user_input)
                print(wallet_detection_result)

if __name__ == "__main__":
    openai_apikey = "YOUR_OPENAI_API_KEY"
    eth_apikey = "YOUR_ETHERSCAN_API_KEY"
    web3_provider = "http://localhost:8545"  # Your Web3 provider URL
    queen_ai = QueenAI(openai_apikey, eth_apikey, web3_provider)
    queen_ai.load_sanctioned_addresses("sanctioned_addresses.json")  # Load sanctioned addresses from JSON file
    queen_ai.load_torn_addresses("torn.json")  # Load torn addresses from JSON file
    queen_ai.main()
