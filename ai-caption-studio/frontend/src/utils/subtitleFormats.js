/**
 * Client-side subtitle format converters.
 * These run entirely in the browser — no server round-trip needed.
 */

function toSRTTime(seconds) {
  const s  = Math.max(0, seconds);
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const se = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(se).padStart(2, "0"),
  ].join(":") + "," + String(ms).padStart(3, "0");
}

function toVTTTime(seconds) {
  const s  = Math.max(0, seconds);
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const se = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(se).padStart(2, "0"),
  ].join(":") + "." + String(ms).padStart(3, "0");
}

// ─────────────────────────────────────────────────────────────────────────────

export function captionsToSRT(captions) {
  return captions
    .map(
      (cap, i) =>
        `${i + 1}\n${toSRTTime(cap.start)} --> ${toSRTTime(cap.end)}\n${cap.text.trim()}\n`
    )
    .join("\n");
}

export function captionsToVTT(captions) {
  const body = captions
    .map(
      (cap, i) =>
        `${i + 1}\n${toVTTTime(cap.start)} --> ${toVTTTime(cap.end)}\n${cap.text.trim()}\n`
    )
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

/**
 * Export captions as plain-text transcript (one caption per line).
 */
export function captionsToTranscript(captions) {
  return captions
    .map((cap) => cap.text.trim())
    .filter(Boolean)
    .join("\n");
}

/**
 * Trigger a browser download of a text file.
 */
export function downloadTextFile(content, filename, mimeType = "text/plain") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
