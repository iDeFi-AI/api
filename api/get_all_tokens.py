from flask import jsonify, request
from firebase_admin import auth, db

# Function to verify API token
def verify_api_token(token):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except auth.InvalidIdTokenError as e:
        return None

# Endpoint for fetching all API tokens associated with the user
def get_all_tokens():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Token required'}), 401
    decoded_token = verify_api_token(token)
    if not decoded_token:
        return jsonify({'error': 'Invalid token'}), 401
    
    uid = decoded_token['uid']
    api_tokens_ref = db.reference('apiTokens').child(uid)
    all_tokens = api_tokens_ref.get()
    if all_tokens:
        tokens_list = list(all_tokens.values())
        return jsonify({'tokens': tokens_list}), 200
    else:
        return jsonify({'tokens': []}), 200
