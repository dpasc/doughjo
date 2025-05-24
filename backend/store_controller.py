from flask import Blueprint, jsonify, request

store_bp = Blueprint('store', __name__)

# In-memory store for demo purposes
products = [
    {"name": "Product A", "price": 10.99, "seconds_for_order": 30},
    {"name": "Product B", "price": 15.49, "seconds_for_order": 45},
    {"name": "Product C", "price": 7.99, "seconds_for_order": 20}
]

@store_bp.route('/store', methods=['GET'])
def get_store():
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
    products.append(new_product)
    return jsonify({"message": "Product added"}), 201
