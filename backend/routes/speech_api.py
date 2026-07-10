"""
Speech-to-Text API: accepts an uploaded audio file (in addition to the
browser's live microphone capture) and transcribes it, so users who record
audio elsewhere can still submit a request by voice.
"""
import os
import tempfile

from flask import Blueprint, jsonify, request

from engine.auth import login_required

speech_bp = Blueprint("speech_api", __name__, url_prefix="/api/v1")


@speech_bp.route("/speech/transcribe", methods=["POST"])
@login_required
def transcribe():
    if "file" not in request.files:
        return jsonify({"error": "No file part named 'file' in the request."}), 400

    uploaded_file = request.files["file"]
    if uploaded_file.filename == "":
        return jsonify({"error": "No file selected for upload."}), 400

    try:
        import speech_recognition as sr
    except ImportError:
        return jsonify({
            "error": "Server-side speech transcription is not installed. "
                     "Please type your message instead."
        }), 501

    suffix = os.path.splitext(uploaded_file.filename)[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        uploaded_file.save(tmp.name)
        tmp_path = tmp.name

    recognizer = sr.Recognizer()
    try:
        with sr.AudioFile(tmp_path) as source:
            audio = recognizer.record(source)
        text = recognizer.recognize_google(audio)
    except sr.UnknownValueError:
        return jsonify({"error": "Could not understand the audio."}), 422
    except Exception as exc:
        return jsonify({"error": f"Transcription failed: {exc}"}), 500
    finally:
        os.unlink(tmp_path)

    return jsonify({"text": text}), 200
