from flask import Blueprint, jsonify, request

shift_bp = Blueprint('shift', __name__)

# In-memory store for completed shifts
completed_shifts = []

@shift_bp.route('/shift', methods=['GET'])
def get_shift():
    # Placeholder implementation
    return jsonify({"message": "Shift endpoint"}), 200

@shift_bp.route('/shift/complete', methods=['POST'])
def complete_shift():
    """
    Expects JSON with:
    {
        "shiftDuration": int (seconds),
        "orders": [ { "id": int, "timestamp": int, "items": [str] }, ... ],
        "startTime": int (timestamp, ms),
        "endTime": int (timestamp, ms)
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    required_fields = ["shiftDuration", "orders", "startTime", "endTime"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    completed_shifts.append(data)
    return jsonify({"message": "Shift saved", "shiftId": len(completed_shifts)}), 201

@shift_bp.route('/shift/history', methods=['GET'])
def get_shift_history():
    return jsonify({"shifts": completed_shifts}), 200
