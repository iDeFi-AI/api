from flask import request, jsonify
from firebase_admin import auth

# Endpoint for generating API token
def generate_token():
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
