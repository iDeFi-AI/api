import os
import datetime
import logging
import base64
import re
import json
import threading
import time
from flask import Flask, request, jsonify, send_file, url_for, make_response
import firebase_admin
from firebase_admin import credentials, db, auth, initialize_app, storage
from dotenv import load_dotenv
import pandas as pd
from flask_cors import CORS
from io import BytesIO
import requests

load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["https://api.idefi.api", "https://idefi-ai-api.vercel.app", "https://q.idefi.ai", "https://mup-nine.vercel.app", "http://localhost:3000"]}})

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get the base64-encoded service account key string
firebase_service_account_key_base64 = os.getenv('NEXT_PUBLIC_FIREBASE_SERVICE_ACCOUNT_KEY')
if not firebase_service_account_key_base64:
    raise ValueError("Missing Firebase service account key environment variable")
# Decode the base64-encoded string to bytes
firebase_service_account_key_bytes = base64.b64decode(firebase_service_account_key_base64)
# Convert bytes to JSON string
firebase_service_account_key_str = firebase_service_account_key_bytes.decode('utf-8')
# Initialize Firebase Admin SDK
try:
    firebase_service_account_key_dict = json.loads(firebase_service_account_key_str)
    cred = credentials.Certificate(firebase_service_account_key_dict)
    initialize_app(cred, {
        'databaseURL': 'https://api-idefi-ai-default-rtdb.firebaseio.com/',
        'storageBucket': 'api-idefi-ai.appspot.com'
    })
    logger.debug("Firebase Admin SDK initialized successfully.")
except json.JSONDecodeError as e:
    logger.error(f"JSON Decode Error: {e}")
    raise
except Exception as e:
    logger.error(f"Firebase Initialization Error: {e}")
    raise

# Get a reference to the Firebase Realtime Database and Storage
database = db.reference()
bucket = storage.bucket()

# Define Coinbase origin address
COINBASE_ORIGIN_ADDRESS = '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43'

# Define the directory containing the .json files
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'upload')
UNIQUE_DIR = os.path.join(os.path.dirname(__file__), 'unique')
FLAGGED_JSON_PATH = os.path.join(UNIQUE_DIR, 'flagged.json')
ETHERSCAN_API_KEY = 'QEX6DGCMDRPXRU89FKPUR4BG9AUMCR4FXD'
OPENAI_API_KEY = os.getenv('NEXT_PUBLIC_OPENAI_API_KEY')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Function to load flagged addresses from a JSON file
def load_flagged_addresses():
    flagged_addresses = {}
    if os.path.exists(FLAGGED_JSON_PATH):
        with open(FLAGGED_JSON_PATH, 'r') as f:
            flagged_addresses = json.load(f)
    return flagged_addresses

# Function to recursively check if an address is flagged or part of flagged nested addresses
def is_address_flagged(address, flagged_addresses):
    address_lower = address.lower()
    if address_lower in flagged_addresses:
        return True
    for nested_list in flagged_addresses.values():
        if address_lower in [addr.lower() for addr in nested_list]:
            return True
    return False

# Function to load unique addresses from JSON files
def load_unique_addresses():
    unique_addresses = set()
    for filename in os.listdir(UNIQUE_DIR):
        if filename.endswith('.json'):
            filepath = os.path.join(UNIQUE_DIR, filename)
            with open(filepath, 'r') as f:
                data = json.load(f)
                for address in data:
                    unique_addresses.add(address.lower())
    return unique_addresses

# Function to check wallet address against unique addresses and flagged addresses
def check_wallet_address(wallet_address, unique_addresses, flagged_addresses):
    wallet_address_lower = wallet_address.lower()
    description = 'Not Flagged'

    if is_address_flagged(wallet_address, flagged_addresses):
        description = 'Flagged: Wallet address found to be involved in illegal activities'
    elif wallet_address_lower in unique_addresses:
        description = 'Flagged: Wallet address found in OFAC sanction list'
    return description

# Function to get etherscan details if address is flagged
def get_etherscan_details(wallet_address, unique_addresses):
    details = ""
    try:
        # Regular transactions
        regular_tx_url = f'https://api.etherscan.io/api?module=account&action=txlist&address={wallet_address}&apikey={ETHERSCAN_API_KEY}'
        regular_tx_response = requests.get(regular_tx_url)
        if regular_tx_response.status_code == 200:
            regular_tx_data = regular_tx_response.json()
            if 'result' in regular_tx_data:
                transactions = regular_tx_data['result']
                for tx in transactions:
                    if tx['to'].lower() in unique_addresses or tx['from'].lower() in unique_addresses:
                        details += f"\nInvolved in Mixer/Tornado transaction with {tx['to']}"
                        details += f"\nTransaction Hash: {tx['hash']}"
                        details += f"\nFrom: {tx['from']}"
                        details += f"\nTo: {tx['to']}"
                        details += f"\nParent Txn Hash: {tx['hash']}"
                        details += f"\nEtherscan URL: https://etherscan.io/tx/{tx['hash']}"
                        break  # Stop searching on first match

        # Internal transactions
        internal_tx_url = f'https://api.etherscan.io/api?module=account&action=txlistinternal&address={wallet_address}&apikey={ETHERSCAN_API_KEY}'
        internal_tx_response = requests.get(internal_tx_url)
        if internal_tx_response.status_code == 200:
            internal_tx_data = internal_tx_response.json()
            if 'result' in internal_tx_data:
                internal_transactions = internal_tx_data['result']
                for int_tx in internal_transactions:
                    if int_tx['to'].lower() in unique_addresses or int_tx['from'].lower() in unique_addresses:
                        details += f"\nInvolved in internal Mixer/Tornado transaction with {int_tx['to']}"
                        details += f"\nTransaction Hash: {int_tx['hash']}"
                        details += f"\nFrom: {int_tx['from']}"
                        details += f"\nTo: {int_tx['to']}"
                        details += f"\nParent Txn Hash: {int_tx['hash']}"
                        details += f"\nEtherscan URL: https://etherscan.io/tx/{int_tx['hash']}"
                        break  # Stop searching on first match
    except Exception as e:
        logger.error(f"Error fetching data from Etherscan API: {e}")

    return details

# Middleware to log the endpoint being called
@app.before_request
def log_request_info():
    logger.debug('Endpoint: %s, Method: %s', request.endpoint, request.method)

# Endpoint for fetching all API tokens associated with the user
@app.route('/api/get_all_tokens', methods=['GET'])
def get_all_tokens():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Token required'}), 401
    decoded_token = verify_api_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid token'}), 401

    uid = decoded_token['uid']
    api_tokens_ref = database.child('apiTokens').child(uid)
    all_tokens = api_tokens_ref.get()
    if all_tokens:
        tokens_list = list(all_tokens.values())
        return jsonify({'tokens': tokens_list}), 200
    else:
        return jsonify({'tokens': []}), 200

# Endpoint for generating API token
@app.route('/api/generate_token', methods=['POST'])
def generate_user_token():
    try:
        data = request.json
        uid = data.get('uid')
        if not uid:
            return jsonify({'error': 'UID required'}), 400

        custom_token = auth.create_custom_token(uid)
        token = custom_token.decode('utf-8')

        return jsonify({'token': token}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Endpoint for getting API key
@app.route('/api/get_api_key', methods=['GET'])
def get_api_key():
    return jsonify({'api_key': 'your_api_key_here'})

# Protected API endpoint (requires authentication)
@app.route('/api/protected_endpoint', methods=['GET'])
def protected_endpoint():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Token required'}), 401
    decoded_token = verify_api_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid token'}), 401
    # Perform actions for the protected endpoint
    return jsonify({'message': 'Access granted'})

# Endpoint for checking wallet address
@app.route('/api/checkaddress', methods=['GET', 'POST'])
def check_wallet_address_endpoint():
    if request.method == 'GET':
        address = request.args.get('address')
        if not address:
            return jsonify({'error': 'Address parameter is required'}), 400

        # Load unique addresses and flagged addresses
        unique_addresses = load_unique_addresses()
        flagged_addresses = load_flagged_addresses()

        description = check_wallet_address(address, unique_addresses, flagged_addresses)
        if 'Flagged' in description:
            description += get_etherscan_details(address, unique_addresses)

        response_data = {
            'address': address,
            'description': description
        }

        return jsonify(response_data)

    elif request.method == 'POST':
        data = request.get_json()
        addresses = data.get('addresses', [])
        if not addresses:
            return jsonify({'error': 'Addresses parameter is required'}), 400

        # Load unique addresses and flagged addresses
        unique_addresses = load_unique_addresses()
        flagged_addresses = load_flagged_addresses()
        results = []

        for address in addresses:
            description = check_wallet_address(address, unique_addresses, flagged_addresses)
            if 'Flagged' in description:
                description += get_etherscan_details(address, unique_addresses)
            results.append({'address': address, 'description': description})

        # Call GenAI to analyze the results and get insights
        prompt_content = {
            "addresses": addresses,
            "results": [result['description'] for result in results]
        }

        try:
            genai_response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {OPENAI_API_KEY}',
                },
                json={
                    'model': 'gpt-3.5-turbo-0125',
                    'messages': [{'role': 'system', 'content': f"Analyze the following Ethereum addresses: {prompt_content}"}]
                }
            )

            if genai_response.status_code != 200:
                return jsonify({'error': 'Failed to analyze with GenAI'}), 500

            insights = genai_response.json()
            for i, result in enumerate(results):
                result['insights'] = insights['choices'][i]['message']['content']

        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            return jsonify({'error': 'Failed to analyze with GenAI'}), 500

        return jsonify(results)

# Endpoint for checking multiple wallet addresses
@app.route('/api/check_multiple_addresses', methods=['POST'])
def check_multiple_addresses():
    try:
        data = request.get_json()
        addresses = data.get('addresses', [])
        if not addresses:
            return jsonify({'error': 'Addresses parameter is required'}), 400

        unique_addresses = load_unique_addresses()
        flagged_addresses = load_flagged_addresses()
        results = []

        for address in addresses:
            description = check_wallet_address(address, unique_addresses, flagged_addresses)
            results.append({
                'address': address,
                'description': description
            })

        return jsonify(results)
    except Exception as e:
        logger.error(f"Exception: {e}")
        return jsonify({'error': f'An error occurred: {e}'}), 500

def check_address_status(address, unique_addresses, flagged_addresses):
    lower_address = address.lower()
    if lower_address in flagged_addresses:
        return 'Fail', 'Flagged for suspicious activities'
    elif lower_address in unique_addresses:
        return 'Fail', 'Address on watch list'
    return 'Pass', 'No issues found'       

# Helper function to clean and validate addresses
def clean_and_validate_addresses(addresses):
    cleaned_addresses = []
    for address in addresses:
        if isinstance(address, str):
            address = re.sub(r'[^\w]', '', address)
            if address.startswith('0x') and len(address) == 42:
                cleaned_addresses.append(address)
    return cleaned_addresses


def analyze_transactions_with_flagged_addresses(transactions, unique_addresses, flagged_addresses):
    flagged_interactions = []
    risky_transactions_count = 0
    total_value = 0
    dates_involved = set()

    for tx in transactions:
        from_address = tx['from'].lower()
        to_address = tx['to'].lower()

        # Use the check_wallet_address function for both from and to addresses
        from_description = check_wallet_address(from_address, unique_addresses, flagged_addresses)
        to_description = check_wallet_address(to_address, unique_addresses, flagged_addresses)

        if 'Flagged' in from_description or 'Flagged' in to_description:
            flagged_interactions.append(tx)
            risky_transactions_count += 1
            total_value += float(tx['value']) / 1e18
            timestamp = datetime.datetime.fromtimestamp(int(tx['timeStamp']))
            dates_involved.add(timestamp.strftime('%Y-%m-%d'))

    summary = {
        'number_of_interactions_with_flagged_addresses': len(flagged_interactions),
        'number_of_risky_transactions': risky_transactions_count,
        'total_value': total_value,
        'all_dates_involved': list(dates_involved)
    }

    return summary

@app.route('/api/transaction_summary', methods=['GET,' 'POST'])
def transaction_summary():
    address = request.args.get('address')
    if not address:
        return jsonify({'error': 'Address parameter is required'}), 400

    # Load unique and flagged addresses
    unique_addresses = load_unique_addresses()
    flagged_addresses = load_flagged_addresses()

    # Fetch transaction history
    transactions = fetch_transactions(address)
    if not transactions:
        return jsonify({'error': 'No transactions found'}), 404

    # Analyze transactions
    summary = analyze_transactions_with_flagged_addresses(transactions, unique_addresses, flagged_addresses)

    return jsonify(summary)
    
@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and file.filename.endswith(('.csv', '.json')):
        try:
            unique_addresses = load_unique_addresses()
            flagged_addresses = load_flagged_addresses()
            results = []
            data = {}

            if file.filename.endswith('.csv'):
                df = pd.read_csv(file)
                for index, row in df.iterrows():
                    data[row['address']] = None  # Only care about addresses for now

            elif file.filename.endswith('.json'):
                data = json.load(file)

            addresses = [address for address in data.keys()]

            # Clean and validate addresses
            addresses = clean_and_validate_addresses(addresses)

            for address in addresses:
                description = check_wallet_address(address, unique_addresses, flagged_addresses)
                status = 'Pass' if 'Not Flagged' in description else 'Fail'
                if status == 'Fail':
                    description += get_etherscan_details(address, unique_addresses)
                results.append({'address': address, 'status': status, 'description': description})

            # Convert results to CSV format
            csv_content = 'address,status,description\n'
            for result in results:
                csv_content += '{},{},{}\n'.format(result['address'], result['status'], result['description'])

            # Create BytesIO object to store CSV content
            output = BytesIO()
            output.write(csv_content.encode())
            output.seek(0)

            # Generate filename based on date/time and user UID
            current_date = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            filename = f"results_{current_date}.csv"

            # Upload CSV to Firebase Storage
            blob = bucket.blob(filename)
            blob.upload_from_file(output, content_type='text/csv')

            # Return URL to access the uploaded file
            file_url = blob.public_url

            # Prepare response with file download URL
            response = jsonify({
                'details': results,
                'file_url': file_url
            })

            return response

        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Unsupported file type'}), 400

@app.route('/api/download/<filename>', methods=['GET'])
def download_results(filename):
    try:
        # Download file from Firebase Storage
        blob = bucket.blob(filename)
        content = blob.download_as_string()

        # Send file as attachment
        response = make_response(content)
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        response.mimetype = 'text/csv'
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 404

# Endpoint to get flagged addresses
@app.route('/api/get_flagged_addresses', methods=['GET'])
def get_flagged_addresses():
    try:
        with open(FLAGGED_JSON_PATH, 'r') as f:
            flagged_addresses = json.load(f)
        return jsonify(flagged_addresses)
    except Exception as e:
        logger.error(f"Error loading flagged addresses: {e}")
        return jsonify({'error': 'Error loading flagged addresses'}), 500

@app.route('/api/get_upload_history', methods=['GET'])
def get_upload_history():
    uid = request.args.get('uid')
    if not uid:
        return jsonify({'error': 'UID required'}), 400

    history_ref = db.reference(f'users/{uid}/upload_history')
    history = history_ref.get()
    if history:
        return jsonify({'history': list(history.values())}), 200
    else:
        return jsonify({'history': []}), 200


@app.route('/api/monitor_address', methods=['POST'])
def monitor_address():
    data = request.get_json()
    address = data.get('address')
    if not address:
        return jsonify({'error': 'Address parameter is required'}), 400

    try:
        transactions = get_transaction_history(address)
        if transactions:
            return jsonify({'transactions': transactions})
        else:
            return jsonify({'error': 'No transactions found for the provided address'}), 404
    except Exception as e:
        app.logger.error(f"Error monitoring address: {e}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500


def get_transaction_history(address):
    try:
        url = f'https://api.etherscan.io/api?module=account&action=txlist&address={address}&sort=asc&apikey={ETHERSCAN_API_KEY}'
        response = requests.get(url)
        if response.status_code != 200:
            raise Exception(f"Error fetching data from Etherscan API: {response.status_code}")

        data = response.json()
        if data['status'] != '1':
            raise Exception(f"No transactions found: {data['message']}")

        transactions = data['result']
        formatted_transactions = [{
            'hash': tx['hash'],
            'from': tx['from'],
            'to': tx['to'],
            'value': int(tx['value']) / 1e18,  # Convert from Wei to Ether
            'timestamp': int(tx['timeStamp']),
            'type': tx.get('type', 'Unknown')  # Assuming type may be missing
        } for tx in transactions]

        return formatted_transactions
    except Exception as e:
        app.logger.error(f"Error fetching transaction history: {e}")
        return []

def check_dusting_patterns(wallet_address):
    # Placeholder function for checking dusting patterns
    dusting_patterns = []
    
    try:
        # Fetch the wallet's transactions from Etherscan API
        url = f'https://api.etherscan.io/api?module=account&action=txlist&address={wallet_address}&sort=asc&apikey={ETHERSCAN_API_KEY}'
        response = requests.get(url)
        if response.status_code != 200:
            return dusting_patterns

        data = response.json()
        if data['status'] != '1':
            return dusting_patterns

        transactions = data['result']
        
        # Analyze transactions for dusting behavior
        for tx in transactions:
            value_eth = int(tx['value']) / 1e18  # Convert from Wei to Ether
            # Consider dust transactions as those with very small amounts, e.g., less than 0.001 ETH
            if value_eth > 0 and value_eth < 0.001:
                dusting_patterns.append({
                    'transactionHash': tx['hash'],
                    'from': tx['from'],
                    'to': tx['to'],
                    'value': value_eth,
                    'timestamp': datetime.datetime.fromtimestamp(int(tx['timeStamp'])).isoformat()
                })

    except Exception as e:
        logger.error(f"Error fetching transaction history: {e}")

    return dusting_patterns


# Function to provide recommendations based on dusting patterns
def provide_dusting_recommendations(dusting_patterns):
    recommendations = []
    if dusting_patterns:
        recommendations.append("Your wallet has been dusted. It's recommended to not interact with these dust transactions.")
        recommendations.append("Consider using a different wallet address for your transactions.")
        recommendations.append("Monitor your wallet closely for any unauthorized transactions.")
    else:
        recommendations.append("No dusting patterns detected. Your wallet appears to be safe.")
    return recommendations

@app.route('/api/dustcheck', methods=['GET'])
def dust_check_endpoint():
    address = request.args.get('address')
    if not address:
        return jsonify({'error': 'Address parameter is required'}), 400

    # Load unique addresses and flagged addresses
    unique_addresses = load_unique_addresses()
    flagged_addresses = load_flagged_addresses()

    description = check_wallet_address(address, unique_addresses, flagged_addresses)
    if 'Flagged' in description:
        description += get_etherscan_details(address, unique_addresses)

    dusting_patterns = check_dusting_patterns(address)
    recommendations = provide_dusting_recommendations(dusting_patterns)

    response_data = {
        'address': address,
        'description': description,
        'dusting_patterns': dusting_patterns,
        'recommendations': recommendations
    }

    return jsonify(response_data)


# New endpoint for analyzing smart contracts
@app.route('/api/analyze_smart_contract', methods=['POST'])
def analyze_smart_contract():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file and file.filename.endswith('.sol'):
        try:
            # Read the smart contract code
            contract_code = file.read().decode('utf-8')

            # Call the AI service to analyze the smart contract
            ai_service_url = 'https://api.openai.com/v1/chat/completions'
            payload = {
                'model': 'gpt-3.5-turbo-0125',
                'messages': [{'role': 'system', 'content': f"Analyze the following Solidity smart contract: {contract_code}"}]
            }
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {OPENAI_API_KEY}'
            }

            response = requests.post(ai_service_url, json=payload, headers=headers)

            if response.status_code != 200:
                return jsonify({'error': 'Failed to analyze smart contract'}), 500

            analysis_result = response.json()
            return jsonify({'analysis': analysis_result})

        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Unsupported file type. Only .sol files are allowed'}), 400

# Utility functions
def fetch_transactions(address):
    url = f'https://api.etherscan.io/api?module=account&action=txlist&address={address}&startblock=0&endblock=99999999&sort=asc&apikey={ETHERSCAN_API_KEY}'
    response = requests.get(url)
    data = response.json()
    return data['result'] if data['status'] == '1' else []

def fetch_internal_transactions(address):
    url = f'https://api.etherscan.io/api?module=account&action=txlistinternal&address={address}&startblock=0&endblock=99999999&sort=asc&apikey={ETHERSCAN_API_KEY}'
    response = requests.get(url)
    data = response.json()
    return data['result'] if data['status'] == '1' else []

def fetch_token_transfers(address):
    url = f'https://api.etherscan.io/api?module=account&action=tokentx&address={address}&startblock=0&endblock=99999999&sort=asc&apikey={ETHERSCAN_API_KEY}'
    response = requests.get(url)
    data = response.json()
    return data['result'] if data['status'] == '1' else []

def calculate_metrics(address, transactions, token_transfers):
    metrics = {}
    eth_sent = sum(float(tx['value']) for tx in transactions if tx['from'].lower() == address.lower())
    eth_received = sum(float(tx['value']) for tx in transactions if tx['to'].lower() == address.lower())
    avg_gas_price = sum(float(tx['gasPrice']) for tx in transactions) / len(transactions)
    
    metrics['Total ETH Sent'] = eth_sent / 1e18
    metrics['Total ETH Received'] = eth_received / 1e18
    metrics['Average Gas Price (Gwei)'] = avg_gas_price / 1e9
    
    token_counts = {}
    for tx in token_transfers:
        token_symbol = tx['tokenSymbol']
        if token_symbol not in token_counts:
            token_counts[token_symbol] = 0
        token_counts[token_symbol] += 1
    
    metrics['Token Transfers'] = token_counts
    return metrics

def calculate_capital_gains(address, transactions):
    purchase_history = []
    capital_gains = 0.0
    for tx in transactions:
        if tx['to'].lower() == address.lower():
            purchase_history.append({
                'date': datetime.datetime.fromtimestamp(int(tx['timeStamp'])),
                'amount': float(tx['value']) / 1e18,
                'price': 2000.0  # Example purchase price, replace with real-time price
            })
        elif tx['from'].lower() == address.lower():
            sale_amount = float(tx['value']) / 1e18
            sale_price = 3000.0  # Example sale price, replace with real-time price
            for purchase in purchase_history:
                if sale_amount == 0:
                    break
                if purchase['amount'] <= sale_amount:
                    gain = (sale_price - purchase['price']) * purchase['amount']
                    capital_gains += gain
                    sale_amount -= purchase['amount']
                    purchase_history.remove(purchase)
                else:
                    gain = (sale_price - purchase['price']) * sale_amount
                    capital_gains += gain
                    purchase['amount'] -= sale_amount
                    sale_amount = 0
    return capital_gains

def process_data(address, transactions, internal_transactions, token_transfers):
    metrics = calculate_metrics(address, transactions, token_transfers)
    capital_gains = calculate_capital_gains(address, transactions)
    
    store_data(address, transactions, metrics, capital_gains)

def store_data(address, transactions, metrics, capital_gains):
    # Implement storage logic, e.g., save to a database or update a cache
    pass

@app.route('/api/get_data_and_metrics', methods=['GET'])
def get_data_and_metrics():
    try:
        address = request.args.get('address')
        if not address:
            return jsonify({'error': 'Address parameter is required'}), 400

        transactions = fetch_transactions(address)
        internal_transactions = fetch_internal_transactions(address)
        token_transfers = fetch_token_transfers(address)
        
        if not transactions:
            return jsonify({'error': 'No transactions found'}), 404
        
        metrics = calculate_metrics(address, transactions, token_transfers)
        capital_gains = calculate_capital_gains(address, transactions)
        
        metrics['Capital Gains'] = capital_gains

        transformed_data = {
            'address': address,
            'transactions': transactions,
            'internal_transactions': internal_transactions,
            'token_transfers': token_transfers
        }

        return jsonify({
            'raw_data': transactions,
            'transformed_data': transformed_data,
            'metrics': metrics
        })

    except requests.exceptions.RequestException as e:
        logger.error(f"RequestException: {e}")
        return jsonify({'error': f'Failed to fetch data from Etherscan: {e}'}), 500
    except Exception as e:
        logger.error(f"Exception: {e}")
        return jsonify({'error': f'An error occurred: {e}'}), 500

# Endpoint for analyzing transactions
@app.route('/api/analyze_transactions', methods=['POST'])
def analyze_transactions_endpoint():
    try:
        data = request.get_json()
        address = data.get('address')
        if not address:
            return jsonify({'error': 'Address parameter is required'}), 400

        transactions = fetch_transactions(address)
        if not transactions:
            return jsonify({'error': 'No transactions found'}), 404

        unique_addresses = load_unique_addresses()
        flagged_addresses = load_flagged_addresses()

        summary = analyze_transactions_with_flagged_addresses(transactions, unique_addresses, flagged_addresses)

        return jsonify(summary)
    except Exception as e:
        logger.error(f"Exception: {e}")
        return jsonify({'error': f'An error occurred: {e}'}), 500

def analyze_transactions(address, transactions):
    on_chain_to_off_chain = {}
    off_chain_to_on_chain = {}

    for tx in transactions:
        if tx['from'] == address.lower():
            if tx['to'] not in on_chain_to_off_chain:
                on_chain_to_off_chain[tx['to']] = 0
            on_chain_to_off_chain[tx['to']] += int(tx['value'])
        elif tx['to'] == address.lower():
            if tx['from'] not in off_chain_to_on_chain:
                off_chain_to_on_chain[tx['from']] = 0
            off_chain_to_on_chain[tx['from']] += int(tx['value'])

    return on_chain_to_off_chain, off_chain_to_on_chain

def analyze_with_ai(transactions):
    try:
        prompt_content = f"Analyze the following transactions: {json.dumps(transactions, indent=2)}"
        response = requests.post(
            'https://api.openai.com/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {OPENAI_API_KEY}',
            },
            json={
                'model': 'gpt-3.5-turbo-0125',
                'messages': [{'role': 'system', 'content': prompt_content}]
            }
        )
        if response.status_code != 200:
            raise Exception(f"OpenAI API request failed with status {response.status_code}")

        response_data = response.json()
        return response_data['choices'][0]['message']['content']

    except Exception as e:
        logger.error(f"Error analyzing with AI: {e}")
        return "Failed to analyze transactions with AI"

def calculate_activity_score(data):
    transaction_count = len(data['transactions'])
    transaction_value_sum = sum(float(tx['value']) for tx in data['transactions'])
    activity_score = min(100, transaction_count + transaction_value_sum / 10)
    return activity_score

def calculate_risk_scores(data):
    return {
        "targeted_attacks": calculate_targeted_attack_risk(data),
        "dusting_attacks": calculate_dusting_attack_risk(data),
        "draining": calculate_draining_risk(data),
        "phishing": calculate_phishing_risk(data)
    }

def calculate_targeted_attack_risk(data):
    high_value_tx = sum(1 for tx in data['transactions'] if float(tx['value']) > 1)
    return min(100, high_value_tx * 5)

def calculate_dusting_attack_risk(data):
    dust_tx = sum(1 for tx in data['transactions'] if float(tx['value']) < 0.0001)
    return min(100, dust_tx * 10)

def calculate_draining_risk(data):
    total_outflow = sum(float(tx['value']) for tx in data['transactions'] if tx['from'] == data['address'])
    return min(100, total_outflow / 100)

def calculate_phishing_risk(data):
    failed_tx = sum(1 for tx in data['transactions'] if tx['status'] == 'Failed')
    return min(100, failed_tx * 10)

def calculate_opportunity_scores(data):
    return {
        "investment": calculate_investment_opportunity(data),
        "staking": calculate_staking_opportunity(data),
        "tax_efficiency": calculate_tax_efficiency(data)
    }

def calculate_investment_opportunity(data):
    incoming_tx_value = sum(float(tx['value']) for tx in data['transactions'] if tx['to'] == data['address'])
    return min(100, incoming_tx_value / 1000)

def calculate_staking_opportunity(data):
    unique_stake_tx = len(set(tx['to'] for tx in data['transactions']))
    return min(100, unique_stake_tx * 2)

def calculate_tax_efficiency(data):
    regular_tx = sum(1 for tx in data['transactions'] if tx['description'] == 'Regular transaction')
    return min(100, regular_tx * 2)

def calculate_trust_scores(data):
    return {
        "trusted_sources": calculate_trusted_sources(data),
        "trusted_recipients": calculate_trusted_recipients(data),
        "wallet_trust": calculate_wallet_trust(data)
    }

def calculate_trusted_sources(data):
    unique_sources = len(set(tx['from'] for tx in data['transactions'] if tx['to'] == data['address']))
    return min(100, unique_sources * 2)

def calculate_trusted_recipients(data):
    unique_recipients = len(set(tx['to'] for tx in data['transactions'] if tx['from'] == data['address']))
    return min(100, unique_recipients * 2)

def calculate_wallet_trust(data):
    trust_factor = len(data['transactions']) / 10
    return min(100, trust_factor * 2)

def calculate_volatility_scores(data):
    return {
        "by_coin": calculate_volatility_by_coin(data),
        "by_wallet": calculate_volatility_by_wallet(data)
    }

def calculate_volatility_by_coin(data):
    values = [float(tx['value']) for tx in data['transactions']]
    return (max(values) - min(values)) / max(values) * 100 if values else 0

def calculate_volatility_by_wallet(data):
    tx_count = len(data['transactions'])
    tx_value_sum = sum(float(tx['value']) for tx in data['transactions'])
    return min(100, (tx_count / tx_value_sum) * 100 if tx_value_sum else 0)

@app.route('/api/calculate_metrics', methods=['POST'])
def calculate_metrics_endpoint():
    data = request.json
    transformed_data = data.get("transformed_data")

    if not transformed_data:
        return jsonify({"error": "Transformed data is required"}), 400

    try:
        activity_score = calculate_activity_score(transformed_data)
        risk_scores = calculate_risk_scores(transformed_data)
        opportunity_scores = calculate_opportunity_scores(transformed_data)
        trust_scores = calculate_trust_scores(transformed_data)
        volatility_scores = calculate_volatility_scores(transformed_data)

        return jsonify({
            "activity_score": activity_score,
            "risk_scores": risk_scores,
            "opportunity_scores": opportunity_scores,
            "trust_scores": trust_scores,
            "volatility_scores": volatility_scores
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(port=5328)
