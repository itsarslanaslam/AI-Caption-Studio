import { useState, useRef, useCallback } from "react";
import { uploadFile, batchTranscribe } from "../utils/api.js";
import { captionsToSRT, downloadTextFile } from "../utils/subtitleFormats.js";
import { UploadIcon, LayersIcon, FolderIcon, CloseIcon, CheckIcon, BackIcon, BoltIcon } from "./icons.jsx";

const ACCEPTED = ".mp4,.mp3,.wav,.avi,.mov,.mkv,.webm,.m4a,.ogg,.flac";
const FORMATS  = ["MP4", "MP3", "WAV", "AVI", "MOV", "MKV", "WEBM", "M4A"];

// ── Single file upload ────────────────────────────────────────────────────────
export default function FileUpload({ onUpload, modelSize, language }) {
  const [dragOver,    setDragOver]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [batchMode,   setBatchMode]   = useState(false);
  const inputRef = useRef(null);

  const processSingle = useCallback(
    async (file) => {
      if (!file) return;
      setUploading(true);
      setUploadPct(0);
      setUploadError(null);
      try {
        await onUpload(file, setUploadPct);
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
    <div className="upload-shell">
      <div
        className={`upload-card ${dragOver ? "drag-over" : ""} ${uploading ? "is-uploading" : ""}`}
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

        <div className="upload-icon-tile">
          {uploading ? <span className="upload-spinner" /> : <UploadIcon width={26} height={26} />}
        </div>

        <h2 className="upload-title">
          {uploading ? "Uploading" : "Drop your file to begin"}
        </h2>

        <p className="upload-subtitle">
          {uploading
            ? "Your file is being uploaded — this will just take a moment."
            : "Drag and drop a video or audio file, or browse from your device."}
        </p>

        {uploading ? (
          <div className="upload-progress-row">
            <div className="upload-progress">
              <div className="upload-progress-bar" style={{ width: `${uploadPct}%` }} />
            </div>
            <span className="upload-progress-pct">{uploadPct}%</span>
          </div>
        ) : (
          <div className="upload-actions">
            <button className="btn btn-accent btn-upload" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
              <FolderIcon width={15} height={15} />
              Browse Files
            </button>
            <span className="upload-or">or drop it anywhere in this area</span>
          </div>
        )}

        {uploadError && (
          <p className="upload-error">{uploadError}</p>
        )}

        <div className="upload-divider" />

        <div className="upload-formats-row">
          <span className="upload-formats-label">Supported formats</span>
          <div className="upload-formats">
            {FORMATS.map((f) => (
              <span key={f} className="format-badge">{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Batch mode switch */}
      <button className="batch-link" onClick={() => setBatchMode(true)}>
        <LayersIcon width={15} height={15} />
        Batch process multiple files
      </button>
    </div>
  );
}

// ── Batch upload panel ────────────────────────────────────────────────────────

function StatusIcon({ status }) {
  if (status === "done")  return <CheckIcon className="batch-status-icon status-done" width={13} height={13} />;
  if (status === "error") return <CloseIcon className="batch-status-icon status-error" width={13} height={13} />;
  if (status === "uploading" || status === "transcribing") {
    return <span className="batch-status-icon"><span className="upload-spinner upload-spinner-sm" /></span>;
  }
  return <span className="batch-status-icon"><span className="status-dot-pending" /></span>;
}

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
        <button className="btn-icon" onClick={onBack} title="Back to single file"><BackIcon width={15} height={15} /></button>
        <span className="batch-title">Batch Processing</span>
        <span className="batch-title-desc">Auto-transcribe multiple files &amp; download SRT</span>
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
        <FolderIcon width={22} height={22} />
        <span className="batch-drop-label">Drop files here or click to select multiple</span>
      </div>

      {files.length > 0 && (
        <div className="batch-file-list">
          {files.map((item, i) => (
            <div
              key={i}
              className={`batch-file-item ${item.status === "error" ? "batch-error" : item.status === "done" ? "batch-done" : ""}`}
            >
              <StatusIcon status={item.status} />
              <span className="batch-file-name" title={item.file.name}>{item.file.name}</span>
              {item.error && <span className="batch-error-msg" title={item.error}>Error</span>}
              {item.status === "done" && <span className="batch-done-label">SRT ready</span>}
              {item.status === "pending" && (
                <button
                  className="btn-icon batch-remove"
                  onClick={() => removeFile(i)}
                >
                  <CloseIcon width={12} height={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="batch-footer">
        {files.some((f) => f.status === "pending") && (
          <button
            className={`btn btn-accent ${running ? "loading" : ""}`}
            onClick={processAll}
            disabled={running}
          >
            {!running && <BoltIcon width={13} height={13} />}
            {running ? "Processing…" : "Process All"}
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
