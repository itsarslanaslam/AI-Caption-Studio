"""FFmpeg-based video rendering utilities."""

import os
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
            r"C:\ffmpeg\bin\ffmpeg.exe",
            r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        ]:
            if os.path.isfile(candidate):
                return candidate
    raise RuntimeError(
        "ffmpeg not found. Install it and add it to PATH, then restart the server.\n"
        "  Windows: winget install Gyan.FFmpeg"
    )


def _ffmpeg_ass_path(path: str) -> str:
    """
    Escape an ASS file path for the FFmpeg `ass=` filter.
    On Windows backslashes and colons need special treatment.
    """
    # Normalize to forward slashes
    p = path.replace("\\", "/")
    if platform.system() == "Windows":
        # Escape the drive-letter colon: C:/ → C\:/
        if len(p) >= 2 and p[1] == ":":
            p = p[0] + "\\:" + p[2:]
    # Escape any remaining colons and spaces
    p = p.replace(":", "\\:")
    return p


def _run(cmd: list[str]) -> None:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-2000:])


def render_video_with_captions(
    video_path: str,
    ass_path: str,
    output_path: str,
) -> None:
    """Burn ASS subtitles into a video file."""
    ffmpeg  = _find_ffmpeg()
    escaped = _ffmpeg_ass_path(ass_path)
    _run([ffmpeg, "-y", "-i", video_path, "-vf", f"ass='{escaped}'", "-c:a", "copy", output_path])


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
        "-vf", f"ass='{escaped}'",
        "-shortest", "-c:v", "libx264", "-c:a", "aac",
        output_path,
    ])


def extract_audio_only(video_path: str, output_path: str) -> None:
    """Extract just the audio track from a video."""
    ffmpeg = _find_ffmpeg()
    _run([ffmpeg, "-y", "-i", video_path, "-q:a", "0", "-map", "a", output_path])
