import { useState, useCallback } from "react";
import { captionsToSRT, captionsToVTT, captionsToTranscript, downloadTextFile } from "../utils/subtitleFormats.js";
import { exportSubtitles } from "../utils/api.js";

export default function ExportPanel({
  captions,
  uploadedFile,
  isRendering,
  renderOutputUrl,
  onRender,
}) {
  const [exportingFormat, setExportingFormat] = useState(null);

  const handleClientSRTDownload = useCallback(() => {
    const srt = captionsToSRT(captions);
    downloadTextFile(srt, "captions.srt", "text/srt");
  }, [captions]);

  const handleClientVTTDownload = useCallback(() => {
    const vtt = captionsToVTT(captions);
    downloadTextFile(vtt, "captions.vtt", "text/vtt");
  }, [captions]);

  const handleTranscriptDownload = useCallback(() => {
    const txt = captionsToTranscript(captions);
    downloadTextFile(txt, "transcript.txt", "text/plain");
  }, [captions]);

  const handleServerExport = useCallback(
    async (format) => {
      try {
        setExportingFormat(format);
        const result = await exportSubtitles(format, captions);
        const link = document.createElement("a");
        link.href = result.url;
        link.download = `captions.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        alert(`Export failed: ${err.message}`);
      } finally {
        setExportingFormat(null);
      }
    },
    [captions]
  );

  const noFile     = !uploadedFile;
  const noCaptions = captions.length === 0;

  return (
    <div className="export-panel">
      {noCaptions && (
        <div className="empty-state">
          <div className="empty-state-icon">📤</div>
          <div>No captions to export yet.</div>
          <div>Transcribe or add captions first.</div>
        </div>
      )}

      {/* ── Subtitle file exports ── */}
      {!noCaptions && (
        <div className="export-section">
          <div className="export-section-title">Subtitle Files</div>
          <div className="export-body">
            <div className="export-row">
              <div>
                <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>SRT Format</div>
                <div className="export-description">
                  SubRip Text — compatible with most video players and editors.
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClientSRTDownload}
              >
                ↓ SRT
              </button>
            </div>

            <div className="export-row">
              <div>
                <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>WebVTT Format</div>
                <div className="export-description">
                  Web Video Text Tracks — for HTML5 video and web streaming.
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClientVTTDownload}
              >
                ↓ VTT
              </button>
            </div>

            <div className="export-row">
              <div>
                <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>Plain Text Transcript</div>
                <div className="export-description">
                  Caption text only, one line per caption — for reading or copy-paste.
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleTranscriptDownload}
              >
                ↓ TXT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Video render ── */}
      {!noFile && !noCaptions && (
        <div className="export-section">
          <div className="export-section-title">Render Video with Captions</div>
          <div className="export-body">
            <div className="export-description">
              Burns captions directly into the video using FFmpeg and the current
              style settings. This may take a minute for longer files.
            </div>

            <button
              className={`btn btn-accent ${isRendering ? "loading" : ""}`}
              onClick={onRender}
              disabled={isRendering}
              style={{ marginTop: 4 }}
            >
              {isRendering ? "Rendering…" : "🎬 Render Video"}
            </button>

            {renderOutputUrl && (
              <div className="render-output">
                <span className="render-success">✓ Video rendered successfully!</span>
                <a
                  href={renderOutputUrl}
                  download="output_with_captions.mp4"
                  className="btn btn-green btn-sm"
                  style={{ textDecoration: "none", display: "inline-flex" }}
                >
                  ↓ Download MP4
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      {!noCaptions && (
        <div className="export-section">
          <div className="export-section-title">Caption Stats</div>
          <div className="export-body">
            <StatsRow label="Total captions"  value={captions.length} />
            <StatsRow label="Total words"     value={captions.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0)} />
            <StatsRow
              label="Duration covered"
              value={`${captions.reduce((s, c) => s + Math.max(0, c.end - c.start), 0).toFixed(1)}s`}
            />
            <StatsRow
              label="Source file"
              value={uploadedFile?.original_name ?? "—"}
              mono
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatsRow({ label, value, mono }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
      <span style={{ color: "var(--text2)" }}>{label}</span>
      <span style={{ fontFamily: mono ? "monospace" : "inherit", color: "var(--text1)" }}>{value}</span>
    </div>
  );
}
