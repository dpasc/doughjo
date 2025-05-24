import os
from flask import Flask, jsonify, request
from pymongo import MongoClient

from settings_controller import settings_bp
from shift_controller import shift_bp
from shop_controller import shop_bp

app = Flask(__name__)

app.register_blueprint(settings_bp)
app.register_blueprint(shift_bp)
app.register_blueprint(shop_bp)

# Connect to MongoDB
mongo_uri = os.environ['MONGO_URI']
client = MongoClient(mongo_uri)
db = client.get_default_database()  # "doughjo"

# Simple GET endpoint: list all documents in "items"
@app.route('/items', methods=['GET'])
def get_items():
    items = list(db.items.find({}, {'_id': 0}))
    return jsonify(items), 200

# Simple POST endpoint: insert one document into "items"
@app.route('/items', methods=['POST'])
def create_item():
    data = request.json
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400
    result = db.items.insert_one(data)
    return jsonify({"inserted_id": str(result.inserted_id)}), 201

if __name__ == '__main__':
    # Flask’s built-in server listens on 0.0.0.0 via docker CMD
    app.run()
