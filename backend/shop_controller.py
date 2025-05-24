from flask import Blueprint, jsonify

shop_bp = Blueprint('shop', __name__)

@shop_bp.route('/shop', methods=['GET'])
def get_shop():
    # Placeholder implementation
    return jsonify({"message": "Shop endpoint"}), 200
