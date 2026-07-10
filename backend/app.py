"""
Application factory for the AI Automated Tech Support Desk backend.

Data flow:
[Client UI] -> [Upload API] -> [Local Storage] -> [Analysis API]
-> [LogParser] -> [ForensicAnalyzer/TicketClassifier] -> [Baseline Model] -> [Return JSON]
"""
from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from routes.auth_api import auth_bp
from routes.chat_api import chat_bp
from routes.grc_api import grc_bp
from routes.pentest_api import pentest_bp
from routes.playbook_api import playbook_bp
from routes.posture_api import posture_bp
from routes.sla_api import sla_bp
from routes.speech_api import speech_bp
from routes.tickets_api import tickets_bp
from routes.workflow_api import workflow_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(tickets_bp)
    app.register_blueprint(grc_bp)
    app.register_blueprint(workflow_bp)
    app.register_blueprint(posture_bp)
    app.register_blueprint(playbook_bp)
    app.register_blueprint(pentest_bp)
    app.register_blueprint(sla_bp)
    app.register_blueprint(speech_bp)

    @app.route("/api/v1/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "ok", "service": "sterling-trust-bank-tech-support-desk"}), 200

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(413)
    def too_large(_error):
        return jsonify({"error": "Uploaded file exceeds the 50MB limit."}), 413

    @app.errorhandler(500)
    def internal_error(_error):
        return jsonify({"error": "Internal server error."}), 500

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=Config.DEBUG)
