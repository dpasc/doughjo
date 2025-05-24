from flask import Blueprint, jsonify

store_bp = Blueprint('store', __name__)

@store_bp.route('/store', methods=['GET'])
def get_store():
    products = [
        {"name": "Product A", "price": 10.99, "seconds_for_order": 30},
        {"name": "Product B", "price": 15.49, "seconds_for_order": 45},
        {"name": "Product C", "price": 7.99, "seconds_for_order": 20}
    ]
    return jsonify(products), 200
