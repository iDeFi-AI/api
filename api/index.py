import os
import logging
from flask import Flask, request, jsonify  # Import Flask and related modules only once
import firebase_admin
from firebase_admin import credentials, db, auth

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Get the path to the service account key file
service_account_key_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

# Initialize Firebase Admin SDK
cred = credentials.Certificate(service_account_key_path)
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://api-idefi-ai-default-rtdb.firebaseio.com/'
})

# Get a reference to the Firebase Realtime Database
database = db.reference()

# Function to generate API token
def generate_api_token(uid):
    custom_token = auth.create_custom_token(uid)
    return custom_token

# Function to verify API token
def verify_api_token(token):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.InvalidIdTokenError as e:
        return None

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

if __name__ == '__main__':
    app.run(port=5328)
