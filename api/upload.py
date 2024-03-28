import os
import json
from flask import request, jsonify
from firebase_admin import db

def upload_dataset(file_path, user_uid):
    try:
        # Check if file exists
        if not os.path.isfile(file_path):
            return jsonify({'error': 'File does not exist.'}), 400

        # Read the contents of the .json dataset file
        with open(file_path, 'r') as file:
            data = json.load(file)

        # Upload the data to the Firebase Realtime Database under the user's UID
        database = db.reference().child('datasets').child(user_uid)
        database.set(data)
        return jsonify({'message': 'Dataset uploaded successfully.'}), 200

    except Exception as e:
        return jsonify({'error': f'Error uploading dataset: {str(e)}'}), 500

