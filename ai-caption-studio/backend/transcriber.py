"""Faster-Whisper transcription with FFmpeg audio extraction."""

import math
import os
import platform
import shutil
import subprocess
from typing import Optional, List, Dict
from faster_whisper import WhisperModel

VIDEO_EXTS = {"mp4", "avi", "mov", "mkv", "webm"}

# Cached model to avoid reloading on every request
_model_cache: dict = {"size": None, "model": None}


def _get_ext(path: str) -> str:
    return path.rsplit(".", 1)[-1].lower() if "." in path else ""


def _find_ffmpeg() -> str:
    """Return the full path to the ffmpeg executable, or raise a clear error."""
    path = shutil.which("ffmpeg")
    if path:
        return path

    # Common Windows install locations (winget / manual download)
    if platform.system() == "Windows":
        candidates = [
            os.path.expandvars(r"%USERPROFILE%\Desktop\ffmpeg\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe"),
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-7.0-full_build\bin\ffmpeg.exe"),
        ]
        for c in candidates:
            if os.path.isfile(c):
                return c

    raise RuntimeError(
        "ffmpeg not found on PATH.\n\n"
        "Install it and restart your terminal / IDE:\n"
        "  Windows : winget install Gyan.FFmpeg\n"
        "  macOS   : brew install ffmpeg\n"
        "  Linux   : sudo apt install ffmpeg\n\n"
        "After installing, restart the backend server."
    )


def extract_audio(video_path: str) -> str:
    """Extract audio track from a video file to a temporary MP3."""
    ffmpeg = _find_ffmpeg()
    audio_path = os.path.splitext(video_path)[0] + "_extracted.mp3"
    cmd = [ffmpeg, "-y", "-i", video_path, "-q:a", "0", "-map", "a", audio_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed:\n{result.stderr[-1500:]}")
    if not os.path.exists(audio_path):
        raise RuntimeError("FFmpeg ran but produced no output file. Check that the video has an audio track.")
    return audio_path


def transcribe_file(
    filepath: str,
    model_size: str = "base",
    language: Optional[str] = None,
    task: str = "transcribe",
    word_timestamps: bool = False,
) -> List[Dict]:
    """
    Transcribe audio/video file using Faster-Whisper.

    task: "transcribe" (keep source language) or "translate" (translate to English).
    word_timestamps: if True, include per-word timing in each segment.

    Returns a list of segment dicts:
        [{
            "id": int,
            "start": float,
            "end": float,
            "text": str,
            "confidence": float,   # 0-1, estimated from avg_logprob
            "words": [...]          # only when word_timestamps=True
        }, ...]
    """
    # Validate ffmpeg before doing anything else
    _find_ffmpeg()

    ext = _get_ext(filepath)
    extracted_audio = None

    if ext in VIDEO_EXTS:
        extracted_audio = extract_audio(filepath)
        audio_path = extracted_audio
    else:
        audio_path = filepath

    try:
        if _model_cache["size"] != model_size or _model_cache["model"] is None:
            _model_cache["model"] = WhisperModel(model_size, device="auto", compute_type="auto")
            _model_cache["size"] = model_size
        model = _model_cache["model"]

        transcribe_kwargs: dict = {"beam_size": 5, "task": task}
        if language:
            transcribe_kwargs["language"] = language
        if word_timestamps:
            transcribe_kwargs["word_timestamps"] = True

        segments_iter, _ = model.transcribe(audio_path, **transcribe_kwargs)

        output_segments: List[Dict] = []
        for i, seg in enumerate(segments_iter):
            # avg_logprob is in range (-inf, 0]; map to confidence in [0, 1]
            # exp(0)=1.0 (perfect), exp(-1)≈0.37, exp(-3)≈0.05 (very poor)
            raw_logprob = float(getattr(seg, "avg_logprob", -0.5))
            confidence = round(min(1.0, max(0.0, math.exp(max(-3.0, raw_logprob)))), 3)

            seg_data: Dict = {
                "id": i,
                "start": round(float(seg.start), 3),
                "end": round(float(seg.end), 3),
                "text": seg.text.strip(),
                "confidence": confidence,
            }

            if word_timestamps and hasattr(seg, "words") and seg.words:
                seg_data["words"] = [
                    {
                        "word": w.word.strip(),
                        "start": round(float(w.start), 3),
                        "end": round(float(w.end), 3),
                        "probability": round(float(getattr(w, "probability", 1.0)), 3),
                    }
                    for w in seg.words
                    if w.word.strip()
                ]

            output_segments.append(seg_data)
    finally:
        if extracted_audio and os.path.exists(extracted_audio):
            os.remove(extracted_audio)

    return output_segments
