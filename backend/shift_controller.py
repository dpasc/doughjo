from flask import Blueprint, jsonify

shift_bp = Blueprint('shift', __name__)

@shift_bp.route('/shift', methods=['GET'])
def get_shift():
    # Placeholder implementation
    return jsonify({"message": "Shift endpoint"}), 200
