import os
from flask import Blueprint, jsonify, request
from pymongo import MongoClient

store_bp = Blueprint('store', __name__)

# MongoDB connection
mongo_uri = os.environ['MONGO_URI']
client = MongoClient(mongo_uri)
db = client.get_default_database()

@store_bp.route('/store', methods=['GET'])
def get_store():
    products = list(db.products.find({}, {'_id': 0}))
    return jsonify(products), 200

@store_bp.route('/store', methods=['POST'])
def add_product():
    data = request.get_json()
    # Basic validation
    if not data or not all(k in data for k in ("name", "price", "seconds_for_order")):
        return jsonify({"error": "Missing fields"}), 400
    try:
        new_product = {
            "name": str(data["name"]),
            "price": float(data["price"]),
            "seconds_for_order": int(data["seconds_for_order"])
        }
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid data types"}), 400
    db.products.insert_one(new_product)
    return jsonify({"message": "Product added"}), 201
