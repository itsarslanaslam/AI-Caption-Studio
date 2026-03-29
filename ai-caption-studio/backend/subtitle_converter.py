"""Convert caption dicts to SRT / WebVTT formats."""


def _to_srt_time(seconds: float) -> str:
    """seconds → HH:MM:SS,mmm"""
    s = max(0.0, seconds)
    h   = int(s // 3600)
    m   = int((s % 3600) // 60)
    sec = int(s % 60)
    ms  = int(round((s % 1) * 1000))
    return f"{h:02d}:{m:02d}:{sec:02d},{ms:03d}"


def _to_vtt_time(seconds: float) -> str:
    """seconds → HH:MM:SS.mmm"""
    s = max(0.0, seconds)
    h   = int(s // 3600)
    m   = int((s % 3600) // 60)
    sec = int(s % 60)
    ms  = int(round((s % 1) * 1000))
    return f"{h:02d}:{m:02d}:{sec:02d}.{ms:03d}"


def captions_to_srt(captions: list[dict]) -> str:
    parts: list[str] = []
    for i, cap in enumerate(captions, start=1):
        start = _to_srt_time(cap.get("start", 0))
        end   = _to_srt_time(cap.get("end",   0))
        text  = cap.get("text", "").strip()
        parts.append(f"{i}\n{start} --> {end}\n{text}\n")
    return "\n".join(parts)


def captions_to_vtt(captions: list[dict]) -> str:
    parts: list[str] = ["WEBVTT", ""]
    for i, cap in enumerate(captions, start=1):
        start = _to_vtt_time(cap.get("start", 0))
        end   = _to_vtt_time(cap.get("end",   0))
        text  = cap.get("text", "").strip()
        parts.append(f"{i}\n{start} --> {end}\n{text}\n")
    return "\n".join(parts)
