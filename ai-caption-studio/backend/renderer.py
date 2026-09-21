"""FFmpeg-based video rendering utilities."""

import os
import json
import shutil
import subprocess
import platform


def _find_ffmpeg() -> str:
    """Return the resolved ffmpeg path, checking common Windows locations too."""
    p = shutil.which("ffmpeg")
    if p:
        return p
    if platform.system() == "Windows":
        for candidate in [
            os.path.expandvars(r"%USERPROFILE%\Desktop\ffmpeg\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe"),
            r"E:\All Projects\My projects\ai-caption-studio CC\ffmpeg\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe",
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        ]:
            if os.path.isfile(candidate):
                return candidate
    raise RuntimeError(
        "ffmpeg not found. Install it and add it to PATH, then restart the server.\n"
        "  Windows: winget install Gyan.FFmpeg"
    )


def _find_ffprobe() -> str | None:
    """Return the resolved ffprobe path (sits next to ffmpeg), or None if unavailable."""
    p = shutil.which("ffprobe")
    if p:
        return p
    try:
        ffmpeg_dir = os.path.dirname(_find_ffmpeg())
    except RuntimeError:
        return None
    candidate = os.path.join(ffmpeg_dir, "ffprobe.exe" if platform.system() == "Windows" else "ffprobe")
    return candidate if os.path.isfile(candidate) else None


def probe_video_size(video_path: str) -> tuple[int, int] | None:
    """Return (width, height) of a video's first video stream, or None on failure."""
    ffprobe = _find_ffprobe()
    if not ffprobe:
        return None
    result = subprocess.run(
        [
            ffprobe, "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "json",
            video_path,
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return None
    try:
        streams = json.loads(result.stdout).get("streams", [])
        if not streams:
            return None
        return int(streams[0]["width"]), int(streams[0]["height"])
    except (ValueError, KeyError, IndexError):
        return None


_ASPECT_RATIOS = {
    "16:9": 16 / 9,
    "9:16": 9 / 16,
    "1:1":  1.0,
}


def compute_crop(width: int, height: int, aspect_ratio: str | None) -> tuple[str | None, tuple[int, int]]:
    """
    Compute an FFmpeg `crop` filter that center-crops (width, height) to the
    given "W:H" aspect ratio, matching the same crop the browser preview
    shows. Returns (crop_filter_or_None, (output_width, output_height)).
    """
    target_ratio = _ASPECT_RATIOS.get(aspect_ratio)
    if not target_ratio:
        return None, (width, height)

    current_ratio = width / height
    if current_ratio > target_ratio:
        # Source is wider than the target — crop the sides.
        out_h = height
        out_w = round(height * target_ratio)
    else:
        # Source is taller than the target — crop top/bottom.
        out_w = width
        out_h = round(width / target_ratio)

    # Even dimensions are required by most video codecs (e.g. yuv420p).
    out_w -= out_w % 2
    out_h -= out_h % 2

    crop_filter = f"crop={out_w}:{out_h}:(iw-{out_w})/2:(ih-{out_h})/2"
    return crop_filter, (out_w, out_h)


def _ffmpeg_ass_path(path: str) -> str:
    """
    Escape an ASS file path for the FFmpeg `ass=` filter.

    A colon is a sub-option separator for the `ass`/`subtitles` filter, and
    the value goes through two layers of unescaping before FFmpeg reads it
    (the filtergraph parser, then the filter's own option parser) — so each
    colon needs to be escaped TWICE (`\\:` -> `\\\\:`), and the value must
    be passed bare, NOT wrapped in quotes (quoting bypasses that unescaping
    and leaves the raw colon behind, which gets read as the next option —
    e.g. "original_size" — breaking the filter for any Windows drive path).
    """
    return path.replace("\\", "/").replace(":", "\\\\:")


def _run(cmd: list[str]) -> None:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-2000:])


def render_video_with_captions(
    video_path: str,
    ass_path: str,
    output_path: str,
    crop_filter: str | None = None,
) -> None:
    """Burn ASS subtitles into a video file, optionally cropping to an aspect ratio first."""
    ffmpeg  = _find_ffmpeg()
    escaped = _ffmpeg_ass_path(ass_path)
    vf = f"{crop_filter},ass={escaped}" if crop_filter else f"ass={escaped}"
    _run([ffmpeg, "-y", "-i", video_path, "-vf", vf, "-c:a", "copy", output_path])


def create_video_from_audio(
    audio_path: str,
    ass_path: str,
    output_path: str,
    width: int = 1280,
    height: int = 720,
) -> None:
    """Create a video from an audio file with a black background and subtitles."""
    ffmpeg  = _find_ffmpeg()
    escaped = _ffmpeg_ass_path(ass_path)
    _run([
        ffmpeg, "-y",
        "-f", "lavfi", "-i", f"color=c=black:size={width}x{height}:rate=25",
        "-i", audio_path,
        "-vf", f"ass={escaped}",
        "-shortest", "-c:v", "libx264", "-c:a", "aac",
        output_path,
    ])


def extract_audio_only(video_path: str, output_path: str) -> None:
    """Extract just the audio track from a video."""
    ffmpeg = _find_ffmpeg()
    _run([ffmpeg, "-y", "-i", video_path, "-q:a", "0", "-map", "a", output_path])
