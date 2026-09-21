import {
  useRef,
  useState,
  useEffect,
  useReducer,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useCallback,
} from "react";
import { MusicNoteIcon } from "./icons.jsx";

// Default canvas used when the real video resolution isn't known yet —
// matches the backend's fallback for audio-only renders.
const DEFAULT_NATURAL_SIZE = { width: 1280, height: 720 };

/**
 * Build the CSS style for the caption overlay from the style config.
 *
 * Sizes are expressed in `cqh`/`cqw` (container query units, relative to
 * the .video-wrapper's rendered size) rather than fixed px, scaled against
 * the video's native resolution. That way `fontSize: 36` always means
 * "36 real output pixels tall" both here and in the burned-in render
 * (backend sets the ASS PlayRes to the same native resolution) — so the
 * preview looks the same size as the final video, at any preview window
 * size or aspect ratio, including fullscreen.
 */
function buildCaptionTextStyle(style, naturalSize) {
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

  const { width: nw, height: nh } = naturalSize;
  const toCqh = (px) => `${(px / nh) * 100}cqh`;
  const toCqw = (px) => `${(px / nw) * 100}cqw`;

  return {
    fontFamily,
    fontSize:        toCqh(fontSize),
    fontWeight:      bold   ? "700" : "400",
    fontStyle:       italic ? "italic" : "normal",
    color:           textColor,
    backgroundColor: bgRgb
      ? `rgba(${bgRgb.r},${bgRgb.g},${bgRgb.b},${bgAlphaF.toFixed(2)})`
      : "transparent",
    WebkitTextStroke:
      strokeWidth > 0 ? `${toCqh(strokeWidth)} ${strokeColor}` : "none",
    textShadow:
      shadow > 0
        ? `${toCqh(shadow)} ${toCqh(shadow)} ${toCqh(shadow * 2)} rgba(0,0,0,0.9)`
        : "none",
    padding:      `${toCqh(captionPaddingV)} ${toCqw(14)}`,
    borderRadius: "3px",
    lineHeight:   "1.4",
    // Percentage alone collapses to just a few px on narrow (9:16) previews,
    // wrapping the text one character per line — enforce a readable floor.
    maxWidth:     `clamp(160px, ${captionMaxWidth}%, 100%)`,
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
  const mediaRef   = useRef(null);
  const wrapperRef = useRef(null);

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
      // If the native play/pause button (inside the video's own controls)
      // has focus, the browser's default action for Space fires on keyUP
      // as a click on whatever is focused — re-toggling playback right
      // after we just set it. Blurring here stops that phantom re-toggle.
      mediaRef.current.blur();
    },
    pause() {
      mediaRef.current?.pause();
    },
  }));

  const [naturalSize, setNaturalSize] = useState(DEFAULT_NATURAL_SIZE);

  const handleLoadedMetadata = useCallback(() => {
    const media = mediaRef.current;
    onDurationChange?.(media?.duration ?? 0);
    if (fileType === "video" && media?.videoWidth && media?.videoHeight) {
      setNaturalSize({ width: media.videoWidth, height: media.videoHeight });
    }
  }, [onDurationChange, fileType]);

  // The browser's native video fullscreen button only fullscreens the
  // <video> element itself, leaving the caption overlay (a sibling div)
  // behind. `controlsList="nofullscreen"` hides that native button in
  // Chromium browsers; our own button below fullscreens the wrapper
  // (video + captions together) instead, using a real click gesture so
  // requestFullscreen is reliably allowed.
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      wrapperRef.current?.requestFullscreen?.();
    }
  }, []);

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
    () => buildCaptionTextStyle(style ?? {}, naturalSize),
    [style, naturalSize]
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
    // The outer host is what goes fullscreen. Browsers force a fullscreen
    // element to fill the entire screen (author max-width/aspect-ratio on
    // IT gets overridden) — so the aspect-ratio crop lives on the INNER
    // frame instead, which still sizes itself correctly relative to the
    // now-screen-filling outer host, keeping the picked aspect ratio
    // (and the caption overlay, which lives inside the frame too) intact.
    <div ref={wrapperRef} className="video-wrapper">
      <div className={`video-frame ${arClass}`}>
        {fileType === "video" ? (
          <video
            ref={mediaRef}
            src={src}
            controls
            controlsList="nofullscreen"
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdateInternal}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <>
            <div className="audio-placeholder">
              <span className="audio-placeholder-icon"><MusicNoteIcon width={26} height={26} /></span>
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

      {fileType === "video" && (
        <button
          type="button"
          className="video-fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? "⤡" : "⛶"}
        </button>
      )}
    </div>
  );
});

export default VideoPlayer;
