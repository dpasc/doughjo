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
    products = []
    for product in db.products.find({}):
        product['_id'] = str(product['_id'])
        products.append(product)
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

from bson.objectid import ObjectId

@store_bp.route('/store/<product_id>', methods=['PUT', 'PATCH'])
def update_product(product_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    update_fields = {}
    if "name" in data:
        update_fields["name"] = str(data["name"])
    if "price" in data:
        try:
            update_fields["price"] = float(data["price"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid price"}), 400
    if "seconds_for_order" in data:
        try:
            update_fields["seconds_for_order"] = int(data["seconds_for_order"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid seconds_for_order"}), 400
    if not update_fields:
        return jsonify({"error": "No valid fields to update"}), 400
    try:
        result = db.products.update_one({"_id": ObjectId(product_id)}, {"$set": update_fields})
    except Exception:
        return jsonify({"error": "Invalid product ID"}), 400
    if result.matched_count == 0:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"message": "Product updated"}), 200

@store_bp.route('/store/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        result = db.products.delete_one({"_id": ObjectId(product_id)})
    except Exception:
        return jsonify({"error": "Invalid product ID"}), 400
    if result.deleted_count == 0:
        return jsonify({"error": "Product not found"}), 404
    return jsonify({"message": "Product deleted"}), 200
