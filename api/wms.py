import json
import os
from flask import request, jsonify, session

# Path to the local JSON files
SANCTIONS_JSON_PATH = os.path.join(os.path.dirname(__file__), 'sanctioned.json')
TORN_JSON_PATH = os.path.join(os.path.dirname(__file__), 'torn.json')

# Function to check if a wallet address is blacklisted
def is_blacklisted(wallet_address):
    # Load the sanctions list from the local JSON file
    with open(SANCTIONS_JSON_PATH, 'r') as f:
        sanctions_list = json.load(f)
    # Load the torn list from the local JSON file
    with open(TORN_JSON_PATH, 'r') as f:
        torn_list = json.load(f)

    return wallet_address in sanctions_list or wallet_address in torn_list

# Wallet Management System endpoint
def check_wallet():
    # Get the API key from the request headers
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Token required'}), 401
    
    # Get the wallet address from the request headers or session data
    wallet_address = request.headers.get('Wallet-Address') or session.get('wallet_address')
    if not wallet_address:
        return jsonify({'error': 'Wallet address required'}), 400
    
    # Check if the wallet address is blacklisted
    if is_blacklisted(wallet_address):
        return jsonify({'status': 'BLACK', 'message': 'No access'}), 200
    else:
        # Placeholder implementation for wallet scoring based on the color sequence
        # Replace this with your actual scoring logic
        # For demonstration purposes, we assign GREEN status to all wallets
        return jsonify({'status': 'GREEN', 'message': 'Full access'}), 200
