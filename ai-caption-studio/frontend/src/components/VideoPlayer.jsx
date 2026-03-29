import {
  useRef,
  useReducer,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
} from "react";

/**
 * Build the CSS style for the caption overlay from the style config.
 */
function buildCaptionTextStyle(style) {
  const {
    fontFamily      = "Arial",
    fontSize        = 14,
    textColor       = "#ffffff",
    bgColor         = "#000000",
    bgAlpha         = 160,
    strokeColor     = "#000000",
    strokeWidth     = 0,
    shadow          = 2,
    bold            = false,
    italic          = false,
    captionMaxWidth = 30,
    captionPaddingV = 6,
  } = style;

  const bgRgb    = hexToRgb(bgColor);
  const bgAlphaF = bgAlpha / 255;

  return {
    fontFamily,
    fontSize:        `${fontSize}px`,
    fontWeight:      bold   ? "700" : "400",
    fontStyle:       italic ? "italic" : "normal",
    color:           textColor,
    backgroundColor: bgRgb
      ? `rgba(${bgRgb.r},${bgRgb.g},${bgRgb.b},${bgAlphaF.toFixed(2)})`
      : "transparent",
    WebkitTextStroke:
      strokeWidth > 0 ? `${strokeWidth}px ${strokeColor}` : "none",
    textShadow:
      shadow > 0
        ? `${shadow}px ${shadow}px ${shadow * 2}px rgba(0,0,0,0.9)`
        : "none",
    padding:      `${captionPaddingV}px 14px`,
    borderRadius: "3px",
    lineHeight:   "1.4",
    maxWidth:     `${captionMaxWidth}%`,
    wordBreak:    "break-word",
  };
}

/**
 * Map alignment value to CSS positioning of the overlay container.
 */
function alignmentToContainerStyle(alignment) {
  const vertical   = alignment.split("-")[0] || "bottom";
  const horizontal = alignment.split("-")[1] || "center";

  const posV =
    vertical === "top"    ? { top:    "8%" } :
    vertical === "middle" ? { top:    "50%", transform: "translateY(-50%)" } :
                            { bottom: "calc(44px + 4%)" };

  const textAlign  =
    horizontal === "left"  ? "left"        :
    horizontal === "right" ? "right"       : "center";

  const alignSelf  =
    horizontal === "left"  ? "flex-start"  :
    horizontal === "right" ? "flex-end"    : "center";

  return {
    position:       "absolute",
    left:           "0",
    right:          "0",
    display:        "flex",
    justifyContent: alignSelf,
    padding:        "0 5%",
    textAlign,
    zIndex:         5,
    pointerEvents:  "none",
    ...posV,
  };
}

function hexToRgb(hex) {
  const c = hex?.replace("#", "") ?? "";
  if (c.length !== 6) return null;
  return {
    r: parseInt(c.slice(0, 2), 16),
    g: parseInt(c.slice(2, 4), 16),
    b: parseInt(c.slice(4, 6), 16),
  };
}

// ─── Aspect ratio class map ───────────────────────────────────────────────────
const AR_CLASS = {
  "16:9": "ar-16x9",
  "9:16": "ar-9x16",
  "1:1":  "ar-1x1",
};

// ─────────────────────────────────────────────────────────────────────────────

const VideoPlayer = forwardRef(function VideoPlayer(
  { fileUrl, fileType, captions, style, karaokeMode, aspectRatio, onTimeUpdate, onDurationChange },
  ref
) {
  const mediaRef = useRef(null);

  // Expose seekTo and togglePlay to parent via ref
  useImperativeHandle(ref, () => ({
    seekTo(time) {
      if (mediaRef.current) {
        mediaRef.current.currentTime = time;
      }
    },
    togglePlay() {
      if (!mediaRef.current) return;
      if (mediaRef.current.paused) {
        mediaRef.current.play();
      } else {
        mediaRef.current.pause();
      }
    },
  }));

  const handleLoadedMetadata = useCallback(() => {
    onDurationChange?.(mediaRef.current?.duration ?? 0);
  }, [onDurationChange]);

  const currentTimeRef  = useRef(0);
  const [, forceRender] = useReducer((n) => n + 1, 0);

  const handleTimeUpdateInternal = useCallback(() => {
    const t = mediaRef.current?.currentTime ?? 0;
    currentTimeRef.current = t;
    onTimeUpdate?.(t);
    forceRender();
  }, [onTimeUpdate]);

  const currentCaption = useMemo(() => {
    const t = currentTimeRef.current;
    return captions.find((c) => t >= c.start && t <= c.end) ?? null;
  }, [captions, currentTimeRef.current]); // eslint-disable-line

  const overlayContainerStyle = useMemo(
    () => alignmentToContainerStyle(style?.alignment ?? "bottom-center"),
    [style?.alignment]
  );

  const captionTextStyle = useMemo(
    () => buildCaptionTextStyle(style ?? {}),
    [style]
  );

  const src = fileUrl ?? null;
  if (!src) return null;

  const arClass = aspectRatio ? AR_CLASS[aspectRatio] ?? "" : "";

  // ── Karaoke rendering: highlight current word ──────────────────────────
  const renderCaptionContent = () => {
    if (!currentCaption) return null;

    const t = currentTimeRef.current;

    if (karaokeMode && currentCaption.words?.length > 0) {
      return (
        <div style={overlayContainerStyle}>
          <span className="caption-text" style={captionTextStyle}>
            {currentCaption.words.map((w, i) => {
              const active = t >= w.start && t <= w.end;
              return (
                <span key={i} className={`karaoke-word${active ? " karaoke-active" : ""}`}>
                  {w.word}{" "}
                </span>
              );
            })}
          </span>
        </div>
      );
    }

    return (
      <div style={overlayContainerStyle}>
        <span className="caption-text" style={captionTextStyle}>
          {currentCaption.text}
        </span>
      </div>
    );
  };

  return (
    <div className={`video-wrapper ${arClass}`}>
      {fileType === "video" ? (
        <video
          ref={mediaRef}
          src={src}
          controls
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdateInternal}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <>
          <div className="audio-placeholder">
            <span className="audio-placeholder-icon">🎵</span>
            <span className="audio-placeholder-name">
              {fileUrl?.split("/").pop() ?? "audio file"}
            </span>
          </div>
          <audio
            ref={mediaRef}
            src={src}
            controls
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdateInternal}
            style={{
              position: "absolute",
              bottom:   0,
              left:     0,
              right:    0,
              width:    "100%",
            }}
          />
        </>
      )}

      {/* Caption / Karaoke overlay */}
      {renderCaptionContent()}
    </div>
  );
});

export default VideoPlayer;
