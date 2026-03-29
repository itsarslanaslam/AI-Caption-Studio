/**
 * Format seconds to MM:SS.mmm  (or H:MM:SS.mmm for ≥1 hour)
 */
export function formatTime(seconds) {
  if (typeof seconds !== "number" || isNaN(seconds)) return "00:00.000";
  const s   = Math.max(0, seconds);
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms  = Math.floor((s % 1) * 1000);

  const pad2 = (n) => String(n).padStart(2, "0");
  const pad3 = (n) => String(n).padStart(3, "0");

  const timeStr = `${pad2(m)}:${pad2(sec)}.${pad3(ms)}`;
  return h > 0 ? `${h}:${timeStr}` : timeStr;
}

/**
 * Parse a time string back to seconds.
 * Accepts: MM:SS.mmm, HH:MM:SS.mmm, or a plain number string.
 */
export function parseTime(str) {
  if (typeof str === "number") return str;
  const s = String(str).trim();

  // Plain number
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);

  const parts = s.split(":");
  if (parts.length === 2) {
    // MM:SS.mmm
    const [mins, secPart] = parts;
    const [secs, ms = "0"] = secPart.split(".");
    return Number(mins) * 60 + Number(secs) + Number(ms) / Math.pow(10, ms.length);
  }
  if (parts.length === 3) {
    // H:MM:SS.mmm
    const [hrs, mins, secPart] = parts;
    const [secs, ms = "0"] = secPart.split(".");
    return (
      Number(hrs) * 3600 +
      Number(mins) * 60 +
      Number(secs) +
      Number(ms) / Math.pow(10, ms.length)
    );
  }
  return NaN;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
