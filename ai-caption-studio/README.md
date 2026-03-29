# AI Caption Studio

A full-stack web application for automatically generating, editing, styling, and exporting captions for video and audio files.

**Pipeline:** Upload → Auto-Transcribe (Whisper) → Edit Captions → Style → Render (FFmpeg) → Download

---

## Features

- **File Upload** — MP4, AVI, MOV, MKV, WEBM video + MP3, WAV, M4A, OGG, FLAC audio
- **AI Transcription** — OpenAI Whisper (local, no API key needed); tiny/base/small/medium/large models
- **Caption Editor** — Editable start/end times and text; add/delete/reorder
- **Live Preview** — Caption overlay updates in real-time as you edit
- **Caption Styling** — Font, size, color, background, outline, shadow, alignment, margins + quick templates
- **Timeline** — WaveSurfer.js waveform with draggable caption blocks
- **Video Rendering** — FFmpeg burns styled ASS subtitles into the output MP4
- **Export** — Download SRT, VTT, or final rendered MP4

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Python      | 3.10+   | |
| Node.js     | 18+     | |
| FFmpeg      | 6+      | Must be on `PATH` |
| CUDA (optional) | any | For GPU-accelerated Whisper |

### Install FFmpeg

**Windows:**
```
winget install Gyan.FFmpeg
# or download from https://ffmpeg.org/download.html and add to PATH
```

**macOS:**
```
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```
sudo apt update && sudo apt install ffmpeg
```

---

## Setup

### 1. Clone / open the project

```
cd ai-caption-studio
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

> **Note:** Whisper requires PyTorch. If you have a GPU, install the CUDA version of torch first:
> ```
> pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
> ```
> For CPU-only:
> ```
> pip install torch torchvision torchaudio
> ```

### 3. Frontend setup

```bash
cd frontend
npm install
```

---

## Running

Open **two terminals**:

**Terminal 1 — Backend**
```bash
cd backend
# Activate venv first (see above)
python app.py
# Runs on http://localhost:5000
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

## Usage

1. **Upload** a video or audio file via drag-and-drop or file picker
2. Select a **Whisper model** (base is a good default) and optionally specify a language
3. Click **⚡ Auto-Transcribe** — wait for Whisper to process the file
4. Captions appear in the **Captions** tab — click any row to edit text or timing
5. Drag caption blocks in the **Timeline** to fine-tune timing
6. Switch to the **Style** tab to customize fonts, colors, shadows, alignment
7. Go to **Export** tab to:
   - Download `.srt` or `.vtt` subtitle files (instant, client-side)
   - Click **🎬 Render Video** to burn captions in with FFmpeg

---

## Project Structure

```
ai-caption-studio/
├── backend/
│   ├── app.py               # Flask API server
│   ├── transcriber.py       # Whisper + FFmpeg audio extraction
│   ├── ass_generator.py     # Caption JSON → ASS subtitle format
│   ├── renderer.py          # FFmpeg rendering commands
│   ├── subtitle_converter.py# SRT/VTT conversion helpers
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js       # Dev server + proxy to :5000
│   ├── package.json
│   └── src/
│       ├── App.jsx          # Root component, state management
│       ├── App.css          # Global dark-theme styles
│       ├── main.jsx
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── FileUpload.jsx   # Drag-and-drop uploader
│       │   ├── VideoPlayer.jsx  # HTML5 video + caption overlay
│       │   ├── CaptionEditor.jsx# Editable caption list
│       │   ├── StylePanel.jsx   # Styling controls
│       │   ├── Timeline.jsx     # WaveSurfer waveform + blocks
│       │   └── ExportPanel.jsx  # Export options
│       └── utils/
│           ├── api.js           # fetch wrappers
│           ├── timeUtils.js     # formatTime / parseTime
│           └── subtitleFormats.js # SRT/VTT generators + download
└── README.md
```

---

## Backend API Reference

| Method | Endpoint        | Description |
|--------|-----------------|-------------|
| POST   | `/upload`       | Upload a video/audio file |
| POST   | `/transcribe`   | Run Whisper on uploaded file |
| POST   | `/render`       | Burn captions into video (FFmpeg) |
| POST   | `/export/srt`   | Generate SRT file |
| POST   | `/export/vtt`   | Generate VTT file |
| GET    | `/files/:name`  | Serve uploaded file |
| GET    | `/outputs/:name`| Serve rendered output |
| GET    | `/health`       | Health check |

---

## Whisper Models

| Model  | English VRAM | Speed | Accuracy |
|--------|-------------|-------|----------|
| tiny   | ~1 GB       | Fastest | Low |
| base   | ~1 GB       | Fast | Good |
| small  | ~2 GB       | Moderate | Better |
| medium | ~5 GB       | Slow | High |
| large  | ~10 GB      | Slowest | Best |

On first use each model is downloaded automatically (~74 MB for base).

---

## ASS Subtitle Format

The renderer generates [ASS v4+](http://www.tcax.org/docs/ass-specs.htm) subtitles with:
- Full `[V4+ Styles]` section (font, color, outline, shadow, alignment, margins)
- `{\pos(x,y)}` tags for per-caption custom positioning
- Alpha-channel background color

---

## Troubleshooting

**FFmpeg not found**
Make sure `ffmpeg` is on your system PATH: `ffmpeg -version`

**Whisper model download fails**
Whisper caches models in `~/.cache/whisper`. Ensure internet connectivity on first run.

**Transcription is slow**
Use the `tiny` model or run on GPU (install CUDA PyTorch).

**CORS errors**
Ensure the backend is running on port 5000 and the Vite proxy is active (port 3000).

**Windows path errors in FFmpeg**
The renderer escapes Windows paths automatically. Avoid putting the project in a directory with special characters.
