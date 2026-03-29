import { useState, useRef, useCallback } from "react";
import { uploadFile, batchTranscribe } from "../utils/api.js";
import { captionsToSRT, downloadTextFile } from "../utils/subtitleFormats.js";

const ACCEPTED = ".mp4,.mp3,.wav,.avi,.mov,.mkv,.webm,.m4a,.ogg,.flac";
const FORMATS  = ["MP4", "MP3", "WAV", "AVI", "MOV", "MKV", "WEBM", "M4A"];

// ── Single file upload ────────────────────────────────────────────────────────
export default function FileUpload({ onUpload, modelSize, language }) {
  const [dragOver,    setDragOver]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [batchMode,   setBatchMode]   = useState(false);
  const inputRef = useRef(null);

  const processSingle = useCallback(
    async (file) => {
      if (!file) return;
      setUploading(true);
      setUploadError(null);
      try {
        await onUpload(file);
      } catch (err) {
        setUploadError(err.message);
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processSingle(file);
    },
    [processSingle]
  );

  const handleChange = useCallback(
    (e) => {
      const file = e.target.files[0];
      if (file) processSingle(file);
    },
    [processSingle]
  );

  if (batchMode) {
    return (
      <BatchUpload
        onBack={() => setBatchMode(false)}
        modelSize={modelSize}
        language={language}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, width: "100%", maxWidth: 560 }}>
      <div
        className={`upload-card ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          style={{ display: "none" }}
          onChange={handleChange}
        />

        <div className="upload-icon">
          {uploading ? "⏳" : dragOver ? "📂" : "🎞️"}
        </div>

        <h2 className="upload-title">
          {uploading ? "Uploading…" : "Drop your file here"}
        </h2>

        <p className="upload-subtitle">
          {uploading
            ? "Please wait while your file is being uploaded"
            : "Drag & drop a video or audio file, or click to browse.\nSupports MP4, AVI, MOV, MP3, WAV and more."}
        </p>

        {!uploading && (
          <button className="btn btn-accent" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
            Choose File
          </button>
        )}

        {uploadError && (
          <p style={{ color: "var(--red)", marginTop: 12, fontSize: 12 }}>
            {uploadError}
          </p>
        )}

        <div className="upload-formats">
          {FORMATS.map((f) => (
            <span key={f} className="format-badge">{f}</span>
          ))}
        </div>
      </div>

      {/* Batch mode switch */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setBatchMode(true)}
        style={{ fontSize: 12 }}
      >
        📦 Batch process multiple files
      </button>
    </div>
  );
}

// ── Batch upload panel ────────────────────────────────────────────────────────

const STATUS_ICON = { pending: "⏳", uploading: "⬆", transcribing: "🔊", done: "✓", error: "✕" };

function BatchUpload({ onBack, modelSize, language }) {
  const [files,   setFiles]   = useState([]);
  const [running, setRunning] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (fileList) => {
    const newItems = Array.from(fileList).map((f) => ({ file: f, status: "pending", error: null }));
    setFiles((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const processAll = async () => {
    if (!files.length || running) return;
    setRunning(true);

    // Upload all files
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "pending") { uploaded.push(null); continue; }
      setFiles((prev) => prev.map((f, j) => j === i ? { ...f, status: "uploading" } : f));
      try {
        const res = await uploadFile(files[i].file);
        uploaded.push({ idx: i, res, originalName: files[i].file.name });
        setFiles((prev) => prev.map((f, j) => j === i ? { ...f, status: "transcribing" } : f));
      } catch (err) {
        setFiles((prev) => prev.map((f, j) => j === i ? { ...f, status: "error", error: err.message } : f));
        uploaded.push(null);
      }
    }

    // Batch transcribe uploaded files
    const validUploads = uploaded.filter(Boolean);
    if (validUploads.length > 0) {
      try {
        const filenames = validUploads.map((u) => u.res.filename);
        const result    = await batchTranscribe(filenames, modelSize || "base", language || null);

        result.results.forEach((item, ri) => {
          const info = validUploads[ri];
          if (!info) return;
          const { idx, originalName } = info;
          if (item.error) {
            setFiles((prev) => prev.map((f, j) => j === idx ? { ...f, status: "error", error: item.error } : f));
          } else {
            downloadTextFile(item.srt, `${originalName}.srt`, "text/plain");
            setFiles((prev) => prev.map((f, j) => j === idx ? { ...f, status: "done" } : f));
          }
        });
      } catch (err) {
        validUploads.forEach(({ idx }) => {
          setFiles((prev) => prev.map((f, j) => j === idx ? { ...f, status: "error", error: err.message } : f));
        });
      }
    }

    setRunning(false);
  };

  return (
    <div className="batch-panel">
      <div className="batch-header">
        <button className="btn-icon" onClick={onBack} title="Back to single file">← Back</button>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Batch Processing</span>
        <span style={{ fontSize: 11, color: "var(--text3)", flex: 1 }}>Auto-transcribe multiple files &amp; download SRT</span>
      </div>

      <div
        className="batch-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)}
        />
        <span style={{ fontSize: 24 }}>📂</span>
        <span style={{ fontSize: 13, color: "var(--text2)" }}>Drop files here or click to select multiple</span>
      </div>

      {files.length > 0 && (
        <div className="batch-file-list">
          {files.map((item, i) => (
            <div
              key={i}
              className={`batch-file-item ${item.status === "error" ? "batch-error" : item.status === "done" ? "batch-done" : ""}`}
            >
              <span className="batch-status-icon">{STATUS_ICON[item.status] ?? "?"}</span>
              <span className="batch-file-name" title={item.file.name}>{item.file.name}</span>
              {item.error && <span className="batch-error-msg" title={item.error}>Error</span>}
              {item.status === "done" && <span style={{ fontSize: 11, color: "var(--green)", marginLeft: "auto" }}>↓ SRT</span>}
              {item.status === "pending" && (
                <button
                  className="btn-icon"
                  onClick={() => removeFile(i)}
                  style={{ marginLeft: "auto", color: "var(--text3)" }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
        {files.some((f) => f.status === "pending") && (
          <button
            className={`btn btn-accent ${running ? "loading" : ""}`}
            onClick={processAll}
            disabled={running}
          >
            {running ? "Processing…" : "⚡ Process All"}
          </button>
        )}
        {files.length > 0 && !running && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFiles([])}>
            Clear list
          </button>
        )}
      </div>
    </div>
  );
}
