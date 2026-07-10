import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class Config:
    SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "sterling-trust-bank-dev-key")
    DEBUG = os.environ.get("FLASK_DEBUG", "0") == "1"

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
    TELEMETRY_STORE_PATH = os.path.join(DATA_DIR, "telemetry.json")
    SLA_CONFIG_STORE_PATH = os.path.join(DATA_DIR, "sla_config.json")
    EXPLOIT_PLAYBOOK_DB_PATH = os.path.join(DATA_DIR, "exploit_playbook.sqlite3")
    PENTEST_SCHEDULE_STORE_PATH = os.path.join(DATA_DIR, "pentest_schedule.json")

    TICKET_CLASSIFIER_CONFIDENCE_THRESHOLD = 0.55

    SMTP_HOST = os.environ.get("SMTP_HOST")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USER = os.environ.get("SMTP_USER")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
    SMTP_FROM = os.environ.get("SMTP_FROM", "grc-desk@sterlingtrust.com")

    _default_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    _env_origins = os.environ.get("CORS_ORIGINS")
    CORS_ORIGINS = (
        [origin.strip() for origin in _env_origins.split(",") if origin.strip()]
        if _env_origins
        else _default_origins
    )


os.makedirs(Config.DATA_DIR, exist_ok=True)
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
