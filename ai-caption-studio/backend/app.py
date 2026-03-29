import os
import uuid
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from deep_translator import GoogleTranslator

from transcriber import transcribe_file
from renderer import render_video_with_captions, create_video_from_audio
from ass_generator import generate_ass
from subtitle_converter import captions_to_srt, captions_to_vtt

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
OUTPUT_FOLDER = os.path.join(os.path.dirname(__file__), "outputs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config["MAX_CONTENT_LENGTH"] = 500 * 1024 * 1024  # 500 MB

VIDEO_EXTS = {"mp4", "avi", "mov", "mkv", "webm"}
AUDIO_EXTS = {"mp3", "wav", "m4a", "ogg", "flac"}
ALLOWED_EXTS = VIDEO_EXTS | AUDIO_EXTS


def get_ext(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def allowed_file(filename: str) -> bool:
    return get_ext(filename) in ALLOWED_EXTS


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": f"File type not supported. Allowed: {', '.join(sorted(ALLOWED_EXTS))}"}), 400

    file_id = str(uuid.uuid4())
    ext = get_ext(file.filename)
    safe_name = f"{file_id}.{ext}"
    save_path = os.path.join(UPLOAD_FOLDER, safe_name)
    file.save(save_path)

    file_type = "video" if ext in VIDEO_EXTS else "audio"
    return jsonify({
        "file_id": file_id,
        "filename": safe_name,
        "original_name": file.filename,
        "file_type": file_type,
        "preview_url": f"/files/{safe_name}",
    })


# ---------------------------------------------------------------------------
# Serve uploaded / output files
# ---------------------------------------------------------------------------

@app.route("/files/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route("/outputs/<path:filename>")
def serve_output(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)


# ---------------------------------------------------------------------------
# Transcribe
# ---------------------------------------------------------------------------

@app.route("/transcribe", methods=["POST"])
def transcribe():
    data = request.get_json(force=True)
    filename = data.get("filename")
    model_size = data.get("model_size", "base")
    language = data.get("language") or None
    task = data.get("task", "transcribe")
    word_timestamps = bool(data.get("word_timestamps", False))

    if task not in ("transcribe", "translate"):
        task = "transcribe"

    if not filename:
        return jsonify({"error": "filename is required"}), 400

    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found on server"}), 404

    try:
        segments = transcribe_file(
            filepath,
            model_size=model_size,
            language=language,
            task=task,
            word_timestamps=word_timestamps,
        )
        return jsonify({"segments": segments})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ---------------------------------------------------------------------------
# Batch transcribe (multiple files, returns SRT for each)
# ---------------------------------------------------------------------------

@app.route("/batch-transcribe", methods=["POST"])
def batch_transcribe():
    """Transcribe multiple already-uploaded files. Returns segments + SRT per file."""
    data = request.get_json(force=True)
    filenames = data.get("filenames", [])
    model_size = data.get("model_size", "base")
    language = data.get("language") or None

    if not filenames:
        return jsonify({"error": "filenames list is required"}), 400

    results = []
    for filename in filenames:
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        if not os.path.exists(filepath):
            results.append({"filename": filename, "error": "File not found on server"})
            continue
        try:
            segments = transcribe_file(
                filepath,
                model_size=model_size,
                language=language,
                task="transcribe",
            )
            results.append({
                "filename": filename,
                "segments": segments,
                "srt": captions_to_srt(segments),
            })
        except Exception as exc:
            results.append({"filename": filename, "error": str(exc)})

    return jsonify({"results": results})


# ---------------------------------------------------------------------------
# Render video with burned-in captions
# ---------------------------------------------------------------------------

@app.route("/render", methods=["POST"])
def render():
    data = request.get_json(force=True)
    filename = data.get("filename")
    captions = data.get("captions", [])
    style = data.get("style", {})

    if not filename:
        return jsonify({"error": "filename is required"}), 400

    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found on server"}), 404

    out_id = str(uuid.uuid4())
    ass_path = os.path.join(OUTPUT_FOLDER, f"{out_id}.ass")
    output_path = os.path.join(OUTPUT_FOLDER, f"{out_id}.mp4")

    try:
        ass_content = generate_ass(captions, style)
        with open(ass_path, "w", encoding="utf-8") as fh:
            fh.write(ass_content)

        ext = get_ext(filename)
        if ext in AUDIO_EXTS:
            create_video_from_audio(filepath, ass_path, output_path)
        else:
            render_video_with_captions(filepath, ass_path, output_path)

        return jsonify({
            "output_url": f"/outputs/{out_id}.mp4",
            "output_id": out_id,
        })
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ---------------------------------------------------------------------------
# Translate captions
# ---------------------------------------------------------------------------

@app.route("/translate", methods=["POST"])
def translate_captions():
    data = request.get_json(force=True)
    captions = data.get("captions", [])
    target_lang = data.get("target_lang", "en")

    if not captions:
        return jsonify({"error": "No captions provided"}), 400

    try:
        translator = GoogleTranslator(source="auto", target=target_lang)
        translated = []
        for cap in captions:
            text = cap.get("text", "").strip()
            translated_text = translator.translate(text) if text else text
            translated.append({**cap, "text": translated_text or text})
        return jsonify({"captions": translated})
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


# ---------------------------------------------------------------------------
# Export subtitle files
# ---------------------------------------------------------------------------

@app.route("/export/srt", methods=["POST"])
def export_srt():
    data = request.get_json(force=True)
    captions = data.get("captions", [])
    out_id = str(uuid.uuid4())
    path = os.path.join(OUTPUT_FOLDER, f"{out_id}.srt")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(captions_to_srt(captions))
    return jsonify({"url": f"/outputs/{out_id}.srt"})


@app.route("/export/vtt", methods=["POST"])
def export_vtt():
    data = request.get_json(force=True)
    captions = data.get("captions", [])
    out_id = str(uuid.uuid4())
    path = os.path.join(OUTPUT_FOLDER, f"{out_id}.vtt")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(captions_to_vtt(captions))
    return jsonify({"url": f"/outputs/{out_id}.vtt"})


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.route("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000, threaded=True)
