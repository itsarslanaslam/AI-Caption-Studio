from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(30, 30, 30)
        self.cell(0, 12, "AI Caption Studio", new_x="LMARGIN", new_y="NEXT", align="L")
        self.set_font("Helvetica", "", 11)
        self.set_text_color(80, 80, 80)
        self.cell(0, 7, "Full-Stack Video Captioning Application", new_x="LMARGIN", new_y="NEXT", align="L")
        self.ln(2)
        self.set_draw_color(200, 200, 200)
        self.set_line_width(0.5)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(6)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(20, 80, 160)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.set_x(self.l_margin + 4)
        self.multi_cell(0, 6, "- " + text, new_x="LMARGIN", new_y="NEXT")

    def two_col_bullets(self, items):
        col_w = (self.w - self.l_margin - self.r_margin) / 2
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        for i, item in enumerate(items):
            if i % 2 == 0:
                x = self.l_margin + 4
            else:
                x = self.l_margin + col_w + 4
            self.set_xy(x, self.get_y())
            self.cell(
                col_w - 4, 6, "- " + item,
                new_x="LMARGIN" if i % 2 == 1 else "RIGHT",
                new_y="NEXT" if i % 2 == 1 else "LAST"
            )
        if len(items) % 2 != 0:
            self.ln(6)
        self.ln(2)

    def kv_row(self, key, value):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(60, 60, 60)
        self.cell(38, 6, key, new_x="RIGHT", new_y="LAST")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, value, new_x="LMARGIN", new_y="NEXT")


pdf = PDF()
pdf.set_margins(20, 20, 20)
pdf.add_page()

# Overview
pdf.section_title("Overview")
pdf.body_text(
    "AI Caption Studio is a complete, production-ready web application that automates video and "
    "audio captioning. It handles the full workflow: upload a media file, auto-transcribe it using "
    "local AI (OpenAI Whisper), edit and style captions in a rich editor, then export or burn them "
    "directly into the video. No external AI API key required."
)

# Tech Stack
pdf.section_title("Tech Stack")
pdf.kv_row("Frontend:", "React 18, Vite, WaveSurfer.js")
pdf.kv_row("Backend:", "Python / Flask REST API")
pdf.kv_row("AI / ASR:", "OpenAI Whisper (runs locally, no API key required)")
pdf.kv_row("Media:", "FFmpeg for video rendering and audio extraction")
pdf.kv_row("Translation:", "Deep-Translator (Google Translate backend)")
pdf.kv_row("Subtitles:", "SRT, VTT, ASS (Advanced SubStation Alpha)")
pdf.ln(2)

# Key Features
pdf.section_title("Key Features")
features = [
    "Drag-and-drop upload (MP4, AVI, MOV, MKV, WEBM, MP3, WAV, FLAC, OGG, M4A)",
    "AI transcription with 5 Whisper model sizes and word-level timestamps",
    "Confidence scores per caption segment",
    "Full caption editor: split, merge, reorder, find & replace, auto-fix",
    "Bulk timing shifts and 100-step undo/redo history",
    "Live video preview with real-time caption overlay",
    "Karaoke mode - highlights each word as it is spoken",
    "Rich styling: font, size, color, outline, shadow, alignment, animations",
    "Interactive waveform timeline with draggable caption blocks",
    "Export as SRT or VTT (instant, client-side)",
    "Rendered MP4 output with burned-in ASS subtitles via FFmpeg",
    "Caption translation to 25+ languages",
    "Batch processing with auto-download of SRT files",
    "Aspect ratio presets: 16:9, 9:16 (Reels/Shorts), 1:1",
    "500 MB max upload size",
    "GPU acceleration support via CUDA (optional)",
]
pdf.two_col_bullets(features)

# Architecture
pdf.section_title("Architecture")
pdf.body_text(
    "Clean client-server architecture: the React/Vite frontend (port 3000) communicates with a "
    "Flask REST API backend (port 5000). Vite's dev proxy eliminates CORS friction during "
    "development. Whisper models are loaded once and cached in memory for fast repeated "
    "transcriptions. FFmpeg is auto-detected across Windows, macOS, and Linux."
)

# API Endpoints
pdf.section_title("Backend API Endpoints")
endpoints = [
    ("POST /upload", "Upload a video or audio file (UUID-named, 500 MB limit)"),
    ("POST /transcribe", "Run Whisper transcription on an uploaded file"),
    ("POST /batch-transcribe", "Transcribe multiple files in one request"),
    ("POST /render", "Burn captions into video using FFmpeg + ASS subtitles"),
    ("POST /translate", "Translate captions to a target language"),
    ("POST /export/srt", "Generate and return an SRT subtitle file"),
    ("POST /export/vtt", "Generate and return a VTT subtitle file"),
    ("GET  /files/:name", "Serve an uploaded media file"),
    ("GET  /outputs/:name", "Serve a rendered output file"),
    ("GET  /health", "Health check"),
]
ep_col = 58
for ep, desc in endpoints:
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(20, 100, 60)
    pdf.cell(ep_col, 6, ep, new_x="RIGHT", new_y="LAST")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(40, 40, 40)
    pdf.multi_cell(0, 6, desc, new_x="LMARGIN", new_y="NEXT")
pdf.ln(2)

# Supported Formats
pdf.section_title("Supported File Formats")
pdf.kv_row("Input video:", "MP4, AVI, MOV, MKV, WEBM")
pdf.kv_row("Input audio:", "MP3, WAV, M4A, OGG, FLAC")
pdf.kv_row("Output:", "MP4 (rendered), SRT, VTT")
pdf.ln(2)

# Keyboard Shortcuts
pdf.section_title("Keyboard Shortcuts")
shortcuts = [
    ("Ctrl/Cmd + Z", "Undo"),
    ("Ctrl/Cmd + Y  /  Ctrl+Shift+Z", "Redo"),
    ("Space", "Play / Pause"),
    ("Left / Right Arrow", "Seek +/- 5 seconds"),
    ("Delete / Backspace", "Delete selected caption"),
    ("Escape", "Deselect caption"),
]
for key, action in shortcuts:
    pdf.set_font("Courier", "", 9)
    pdf.set_text_color(20, 100, 60)
    pdf.cell(70, 6, key, new_x="RIGHT", new_y="LAST")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(40, 40, 40)
    pdf.cell(0, 6, action, new_x="LMARGIN", new_y="NEXT")

out = "c:/Users/Kingslayer/Desktop/CC/ai-caption-studio/AI_Caption_Studio_Upwork.pdf"
pdf.output(out)
print(f"Saved: {out}")
