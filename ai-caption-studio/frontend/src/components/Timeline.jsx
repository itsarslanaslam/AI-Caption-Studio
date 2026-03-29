import { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { formatTime } from "../utils/timeUtils.js";

export default function Timeline({
  fileUrl,
  captions,
  currentTime,
  duration,
  selectedId,
  onSeek,
  onUpdateCaption,
  onSelectCaption,
}) {
  const waveContainerRef = useRef(null);
  const wavesurferRef    = useRef(null);
  const trackRef         = useRef(null);

  const [isDragging, setIsDragging] = useState(null);
  // isDragging = { id, type: "move"|"left"|"right", startX, startCap: {start,end}, trackW }

  // ── WaveSurfer setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!waveContainerRef.current || !fileUrl) return;

    const ws = WaveSurfer.create({
      container:     waveContainerRef.current,
      waveColor:     "#4f46e5",
      progressColor: "#818cf8",
      cursorColor:   "#f59e0b",
      cursorWidth:   2,
      height:        60,
      normalize:     true,
      interact:      true,
      barWidth:      2,
      barGap:        1,
      barRadius:     2,
    });

    wavesurferRef.current = ws;

    ws.load(fileUrl);

    ws.on("interaction", (t) => {
      onSeek(t);
    });

    return () => {
      ws.destroy();
      wavesurferRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  // Sync playhead position (WaveSurfer's own cursor follows via interaction)
  useEffect(() => {
    const ws = wavesurferRef.current;
    if (!ws || !duration) return;
    try {
      ws.setTime(currentTime);
    } catch {
      // ignore if not ready
    }
  }, [currentTime, duration]);

  // ── Caption block drag ────────────────────────────────────────────────────
  const startDrag = useCallback(
    (e, id, type) => {
      e.preventDefault();
      e.stopPropagation();
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const cap  = captions.find((c) => c.id === id);
      if (!cap) return;

      setIsDragging({
        id,
        type,
        startX:   e.clientX,
        startCap: { start: cap.start, end: cap.end },
        trackW:   rect.width,
      });
      onSelectCaption(id);
    },
    [captions, onSelectCaption]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      const { id, type, startX, startCap, trackW } = isDragging;
      if (!duration || !trackW) return;

      const dx        = e.clientX - startX;
      const dtSeconds = (dx / trackW) * duration;

      if (type === "move") {
        let newStart = startCap.start + dtSeconds;
        let newEnd   = startCap.end   + dtSeconds;
        const len    = newEnd - newStart;
        // Clamp
        if (newStart < 0) { newStart = 0; newEnd = len; }
        if (newEnd > duration) { newEnd = duration; newStart = duration - len; }
        onUpdateCaption(id, { start: newStart, end: newEnd });
      } else if (type === "left") {
        const newStart = Math.max(0, Math.min(startCap.end - 0.1, startCap.start + dtSeconds));
        onUpdateCaption(id, { start: newStart });
      } else if (type === "right") {
        const newEnd = Math.min(duration, Math.max(startCap.start + 0.1, startCap.end + dtSeconds));
        onUpdateCaption(id, { end: newEnd });
      }
    };

    const handleUp = () => setIsDragging(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup",   handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup",   handleUp);
    };
  }, [isDragging, duration, onUpdateCaption]);

  // ── Click on track (not on a block) to seek ───────────────────────────────
  const handleTrackClick = useCallback(
    (e) => {
      if (!trackRef.current || !duration) return;
      // If we just finished dragging, don't seek
      if (isDragging) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      onSeek(Math.max(0, Math.min(duration, ratio * duration)));
    },
    [duration, isDragging, onSeek]
  );

  const playheadPct = duration ? (currentTime / duration) * 100 : 0;

  // ── Caption block color pool ──────────────────────────────────────────────
  const COLORS = [
    "#6366f1", "#8b5cf6", "#06b6d4", "#10b981",
    "#f59e0b", "#ef4444", "#ec4899",
  ];

  return (
    <div className="timeline-section">
      <div className="timeline-header">
        <span className="timeline-label">Timeline</span>
        <span className="timeline-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="timeline-body">
        {/* Caption track */}
        <div
          ref={trackRef}
          className="caption-track"
          onClick={handleTrackClick}
          style={{ cursor: isDragging ? "grabbing" : "default" }}
        >
          {duration > 0 &&
            captions.map((cap, i) => {
              const left  = (cap.start / duration) * 100;
              const width = Math.max(0.2, ((cap.end - cap.start) / duration) * 100);
              const color = COLORS[i % COLORS.length];

              return (
                <div
                  key={cap.id}
                  className={`caption-block ${cap.id === selectedId ? "selected" : ""}`}
                  style={{
                    left:            `${left}%`,
                    width:           `${width}%`,
                    background:      `${color}88`,
                    borderColor:     color,
                    cursor:          isDragging?.id === cap.id ? "grabbing" : "grab",
                  }}
                  onMouseDown={(e) => startDrag(e, cap.id, "move")}
                  onClick={(e) => { e.stopPropagation(); onSelectCaption(cap.id); onSeek(cap.start); }}
                >
                  {/* Left resize handle */}
                  <div
                    className="resize-handle left"
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, cap.id, "left"); }}
                  />

                  <span className="caption-block-label">{cap.text}</span>

                  {/* Right resize handle */}
                  <div
                    className="resize-handle right"
                    onMouseDown={(e) => { e.stopPropagation(); startDrag(e, cap.id, "right"); }}
                  />
                </div>
              );
            })}

          {/* Playhead */}
          <div
            className="playhead"
            style={{ left: `${playheadPct}%` }}
          />
        </div>

        {/* WaveSurfer waveform */}
        <div ref={waveContainerRef} className="waveform-container" />
      </div>
    </div>
  );
}
