import os
import firebase_admin
from firebase_admin import db

# Get the path to the service account key file
service_account_key_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

# Function to get API key associated with the given UID
def get_api_key(uid):
    api_key = None
    try:
        # Get a reference to the Firebase Realtime Database (move this line to the index.py file)
        database = db.reference()
        api_key = database.child('apiKeys').child(uid).get()
    except Exception as e:
        print('Error:', e)
    return api_key
