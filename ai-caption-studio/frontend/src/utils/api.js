/**
 * All backend API calls.
 * In development, relative paths work via the Vite proxy.
 * In production, set VITE_API_URL to the backend base URL (e.g. https://user-space.hf.space).
 */

const API_BASE = import.meta.env.VITE_API_URL || "";

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
  return handleResponse(res);
}

// ─── Transcribe ──────────────────────────────────────────────────────────────

export async function transcribeFile(filename, modelSize = "base", language = null, task = "transcribe", wordTimestamps = false) {
  const res = await fetch(`${API_BASE}/transcribe`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ filename, model_size: modelSize, language, task, word_timestamps: wordTimestamps }),
  });
  return handleResponse(res);
}

// ─── Batch Transcribe ────────────────────────────────────────────────────────

export async function batchTranscribe(filenames, modelSize = "base", language = null) {
  const res = await fetch(`${API_BASE}/batch-transcribe`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ filenames, model_size: modelSize, language }),
  });
  return handleResponse(res);
}

// ─── Render ──────────────────────────────────────────────────────────────────

export async function renderVideo(filename, captions, style) {
  const res = await fetch(`${API_BASE}/render`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ filename, captions, style }),
  });
  return handleResponse(res);
}

// ─── Translate captions ───────────────────────────────────────────────────────

export async function translateCaptions(captions, targetLang) {
  const res = await fetch(`${API_BASE}/translate`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ captions, target_lang: targetLang }),
  });
  return handleResponse(res);
}

// ─── Export subtitles (server-side) ─────────────────────────────────────────

export async function exportSubtitles(format, captions) {
  const res = await fetch(`${API_BASE}/export/${format}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ captions }),
  });
  return handleResponse(res);
}

// ─── Health check ────────────────────────────────────────────────────────────

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res);
}
