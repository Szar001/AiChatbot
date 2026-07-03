import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class Config:
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "sterling-trust-bank-dev-key")
    DEBUG = os.environ.get("FLASK_DEBUG", "1") == "1"

    DATA_DIR = os.path.join(BASE_DIR, "data")
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads", "policies")
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB, matches frontend copy

    ALLOWED_UPLOAD_EXTENSIONS = {"pdf", "docx", "txt"}

    LIFE_DOC_DB_PATH = os.path.join(DATA_DIR, "life_documents.sqlite3")
    TICKET_STORE_PATH = os.path.join(DATA_DIR, "tickets.json")
    VENDOR_STORE_PATH = os.path.join(DATA_DIR, "vendors.json")
    POLICY_STORE_PATH = os.path.join(DATA_DIR, "policies.json")
    USER_STORE_PATH = os.path.join(DATA_DIR, "users.json")
    AUDIT_LOG_DB_PATH = os.path.join(DATA_DIR, "audit_log.sqlite3")

    TICKET_CLASSIFIER_CONFIDENCE_THRESHOLD = 0.55

    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]


os.makedirs(Config.DATA_DIR, exist_ok=True)
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
