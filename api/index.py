import os
import datetime
import logging
import base64
import re
import json
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
CORS(app, resources={r"/api/*": {"origins": ["https://api.idefi.api", "https://idefi-ai-api.vercel.app"]}})

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

# Define the directory containing the .json files
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'upload')
UNIQUE_DIR = os.path.join(os.path.dirname(__file__), 'unique')
FLAGGED_JSON_PATH = os.path.join(UNIQUE_DIR, 'flagged.json')
ETHERSCAN_API_KEY = 'QEX6DGCMDRPXRU89FKPUR4BG9AUMCR4FXD'

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

        return jsonify(results)

# Helper function to clean and validate addresses
def clean_and_validate_addresses(addresses):
    cleaned_addresses = []
    for address in addresses:
        if isinstance(address, str):
            address = re.sub(r'[^\w]', '', address)
            if address.startswith('0x') and len(address) == 42:
                cleaned_addresses.append(address)
    return cleaned_addresses

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

if __name__ == '__main__':
    app.run(port=5328)
