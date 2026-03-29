"""Convert caption JSON + style config into ASS (Advanced SubStation Alpha) format."""

from __future__ import annotations


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _seconds_to_ass(seconds: float) -> str:
    """0-based seconds → H:MM:SS.cs  (centiseconds, not milliseconds)."""
    seconds = max(0.0, seconds)
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    cs = int((s - int(s)) * 100)
    return f"{h}:{m:02d}:{int(s):02d}.{cs:02d}"


def _hex_to_ass(hex_color: str, alpha: int = 0) -> str:
    """
    Convert CSS hex color (#RRGGBB) → ASS &HAABBGGRR.
    alpha 0 = fully opaque, 255 = fully transparent.
    """
    c = hex_color.lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    if len(c) != 6:
        c = "FFFFFF"
    r = int(c[0:2], 16)
    g = int(c[2:4], 16)
    b = int(c[4:6], 16)
    return f"&H{alpha:02X}{b:02X}{g:02X}{r:02X}"


# Numpad layout: 1=BL 2=BC 3=BR  4=ML 5=MC 6=MR  7=TL 8=TC 9=TR
_ALIGNMENT_MAP: dict[str, int] = {
    "bottom-left":   1,
    "bottom-center": 2,
    "bottom-right":  3,
    "middle-left":   4,
    "middle-center": 5,
    "middle-right":  6,
    "top-left":      7,
    "top-center":    8,
    "top-right":     9,
}


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_ass(captions: list[dict], style: dict) -> str:
    """
    Build a complete ASS file string.

    style keys (all optional with defaults):
        fontFamily, fontSize, textColor, bgColor, bgAlpha,
        strokeColor, strokeWidth, shadow,
        alignment, marginH, marginV, bold, italic,
        animation  ("none" | "fade" | "slide-up")
    """
    font_family       = style.get("fontFamily",      "Arial")
    font_size         = int(style.get("fontSize",       32))
    text_color        = style.get("textColor",      "#FFFFFF")
    bg_color          = style.get("bgColor",        "#000000")
    bg_alpha          = int(style.get("bgAlpha",       160))   # 0–255
    stroke_color      = style.get("strokeColor",    "#000000")
    stroke_width      = float(style.get("strokeWidth",  2))
    shadow            = float(style.get("shadow",        1))
    alignment         = style.get("alignment",   "bottom-center")
    margin_h          = int(style.get("marginH",       20))
    margin_v          = int(style.get("marginV",       30))
    bold              = 1 if style.get("bold",   False) else 0
    italic            = 1 if style.get("italic", False) else 0
    caption_max_width = int(style.get("captionMaxWidth", 80))   # % of video width
    animation         = style.get("animation", "none")          # "none" | "fade" | "slide-up"

    # Compute side margins from captionMaxWidth so text area is constrained
    # PlayResX = 1920; each side margin = half of the unused width
    computed_margin_lr = max(margin_h, int(1920 * (100 - caption_max_width) / 100 / 2))

    primary_color = _hex_to_ass(text_color,   0)
    outline_color = _hex_to_ass(stroke_color, 0)
    # bg_alpha in ASS is 0=opaque … 255=transparent; invert user value
    back_alpha    = 255 - bg_alpha
    back_color    = _hex_to_ass(bg_color, back_alpha)

    align_val = _ALIGNMENT_MAP.get(alignment, 2)

    header = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        "PlayResX: 1920\n"
        "PlayResY: 1080\n"
        "ScaledBorderAndShadow: yes\n"
        "YCbCr Matrix: TV.709\n"
        "\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Default,{font_family},{font_size},"
        f"{primary_color},&H000000FF,{outline_color},{back_color},"
        f"{bold},{italic},0,0,"
        f"100,100,0,0,"
        f"1,{stroke_width:.1f},{shadow:.1f},"
        f"{align_val},{computed_margin_lr},{computed_margin_lr},{margin_v},1\n"
        "\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )

    # Pre-compute animation tag (same for all captions)
    anim_tag = ""
    if animation == "fade":
        anim_tag = r"{\fad(200,200)}"
    elif animation == "slide-up":
        v_part = alignment.split("-")[0] if "-" in alignment else "bottom"
        h_part = alignment.split("-")[1] if "-" in alignment else "center"
        if v_part == "bottom":
            y_end = 1080 - margin_v
        elif v_part == "top":
            y_end = margin_v
        else:
            y_end = 540
        if h_part == "center":
            x_pos = 960
        elif h_part == "left":
            x_pos = computed_margin_lr
        else:
            x_pos = 1920 - computed_margin_lr
        y_start = y_end + 50
        anim_tag = f"{{\\an{align_val}\\move({x_pos},{y_start},{x_pos},{y_end},0,350)}}"

    lines: list[str] = [header]
    for cap in captions:
        start = _seconds_to_ass(cap.get("start", 0))
        end   = _seconds_to_ass(cap.get("end",   0))
        text  = cap.get("text", "").replace("\n", "\\N")

        # Custom position tag
        pos_tag = ""
        if cap.get("customPos") and cap.get("x") is not None and cap.get("y") is not None:
            # Scale from % (0-100) to ASS 1920x1080 coords
            x = int(float(cap["x"]) / 100 * 1920)
            y = int(float(cap["y"]) / 100 * 1080)
            pos_tag = f"{{\\pos({x},{y})}}"

        lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{anim_tag}{pos_tag}{text}")

    return "\n".join(lines) + "\n"
