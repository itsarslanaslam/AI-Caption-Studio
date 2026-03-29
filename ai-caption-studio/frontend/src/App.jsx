import { useState, useCallback, useRef, useEffect } from "react";
import Header from "./components/Header.jsx";
import FileUpload from "./components/FileUpload.jsx";
import VideoPlayer from "./components/VideoPlayer.jsx";
import CaptionEditor from "./components/CaptionEditor.jsx";
import StylePanel from "./components/StylePanel.jsx";
import Timeline from "./components/Timeline.jsx";
import ExportPanel from "./components/ExportPanel.jsx";
import { uploadFile, transcribeFile, renderVideo, translateCaptions, batchTranscribe } from "./utils/api.js";
import { captionsToSRT, downloadTextFile } from "./utils/subtitleFormats.js";

// ─── Default style config ────────────────────────────────────────────────────
export const DEFAULT_STYLE = {
  fontFamily:      "Arial",
  fontSize:        14,
  textColor:       "#ffffff",
  bgColor:         "#000000",
  bgAlpha:         160,        // 0 = transparent … 255 = opaque
  strokeColor:     "#000000",
  strokeWidth:     0,
  shadow:          2,
  alignment:       "bottom-center",
  bold:            false,
  italic:          false,
  marginH:         20,
  marginV:         30,
  captionMaxWidth: 30,         // max width as % of video width
  captionPaddingV: 6,          // vertical padding in px
  animation:       "none",     // "none" | "fade" | "slide-up"
};

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [uploadedFile,    setUploadedFile]    = useState(null);
  const [captions,        setCaptions]        = useState([]);
  const [style,           setStyle]           = useState(DEFAULT_STYLE);
  const [currentTime,     setCurrentTime]     = useState(0);
  const [duration,        setDuration]        = useState(0);
  const [activeTab,       setActiveTab]       = useState("editor");
  const [selectedId,      setSelectedId]      = useState(null);
  const [isTranscribing,  setIsTranscribing]  = useState(false);
  const [isRendering,     setIsRendering]     = useState(false);
  const [renderOutputUrl, setRenderOutputUrl] = useState(null);
  const [error,           setError]           = useState(null);
  const [modelSize,       setModelSize]       = useState("base");
  const [language,        setLanguage]        = useState("");
  const [translateLang,   setTranslateLang]   = useState("en");
  const [isTranslating,   setIsTranslating]   = useState(false);
  const [wordTimestamps,  setWordTimestamps]  = useState(false);
  const [karaokeMode,     setKaraokeMode]     = useState(false);
  const [aspectRatio,     setAspectRatio]     = useState(null); // null | "16:9" | "9:16" | "1:1"

  const videoPlayerRef = useRef(null);

  // ── Undo / Redo history (refs so they don't trigger extra renders) ────────
  const captionsHistoryRef = useRef([[]]);
  const historyIndexRef    = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Refs for keyboard shortcuts (avoid stale closure)
  const currentTimeRef = useRef(0);
  const durationRef    = useRef(0);
  const selectedIdRef  = useRef(null);

  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { durationRef.current    = duration;    }, [duration]);
  useEffect(() => { selectedIdRef.current  = selectedId;  }, [selectedId]);

  // ── Caption setter that records history ───────────────────────────────────
  const setCaptionsWithHistory = useCallback((updaterOrValue) => {
    setCaptions((prev) => {
      const next =
        typeof updaterOrValue === "function" ? updaterOrValue(prev) : updaterOrValue;
      const hist = captionsHistoryRef.current.slice(0, historyIndexRef.current + 1);
      hist.push(next);
      if (hist.length > 100) hist.shift();
      captionsHistoryRef.current = hist;
      historyIndexRef.current    = hist.length - 1;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(false);
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      setCaptions(captionsHistoryRef.current[historyIndexRef.current]);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
    }
  }, []);

  const handleRedo = useCallback(() => {
    const hist = captionsHistoryRef.current;
    if (historyIndexRef.current < hist.length - 1) {
      historyIndexRef.current++;
      setCaptions(hist[historyIndexRef.current]);
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < hist.length - 1);
    }
  }, []);

  // ── Upload ──────────────────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (file) => {
    try {
      setError(null);
      const result = await uploadFile(file);
      setUploadedFile(result);
      setCaptions([]);
      captionsHistoryRef.current = [[]];
      historyIndexRef.current    = 0;
      setCanUndo(false);
      setCanRedo(false);
      setRenderOutputUrl(null);
      setCurrentTime(0);
      setDuration(0);
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    }
  }, []);

  // ── Transcribe ──────────────────────────────────────────────────────────
  const handleTranscribe = useCallback(async () => {
    if (!uploadedFile) return;
    try {
      setIsTranscribing(true);
      setError(null);
      const result = await transcribeFile(
        uploadedFile.filename,
        modelSize,
        language || null,
        "transcribe",
        wordTimestamps,
      );
      const withIds = result.segments.map((seg, i) => ({
        ...seg,
        id: `cap-${i}-${Date.now()}`,
      }));
      // Reset history with new captions
      captionsHistoryRef.current = [withIds];
      historyIndexRef.current    = 0;
      setCanUndo(false);
      setCanRedo(false);
      setCaptions(withIds);
      setActiveTab("editor");
    } catch (err) {
      setError(`Transcription failed: ${err.message}`);
    } finally {
      setIsTranscribing(false);
    }
  }, [uploadedFile, modelSize, language, wordTimestamps]);

  // ── Translate captions ──────────────────────────────────────────────────
  const handleTranslate = useCallback(async () => {
    if (!captions.length) return;
    try {
      setIsTranslating(true);
      setError(null);
      const result = await translateCaptions(captions, translateLang);
      setCaptionsWithHistory(result.captions);
    } catch (err) {
      setError(`Translation failed: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  }, [captions, translateLang, setCaptionsWithHistory]);

  // ── Caption CRUD ────────────────────────────────────────────────────────
  const handleUpdateCaption = useCallback((id, updates) => {
    setCaptionsWithHistory((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, [setCaptionsWithHistory]);

  const handleAddCaption = useCallback(
    (afterId = null) => {
      const newCap = {
        id:    `cap-new-${Date.now()}`,
        start: 0,
        end:   2,
        text:  "New caption",
      };
      if (afterId) {
        const idx = captions.findIndex((c) => c.id === afterId);
        if (idx !== -1) {
          newCap.start = captions[idx].end;
          newCap.end   = captions[idx].end + 2;
          setCaptionsWithHistory((prev) => {
            const next = [...prev];
            next.splice(idx + 1, 0, newCap);
            return next;
          });
        } else {
          setCaptionsWithHistory((prev) => [...prev, newCap]);
        }
      } else {
        const timeStart = Math.max(0, currentTime);
        newCap.start = timeStart;
        newCap.end   = timeStart + 2;
        setCaptionsWithHistory((prev) => {
          const insertIdx = prev.findIndex((c) => c.start > timeStart);
          const next = [...prev];
          if (insertIdx === -1) next.push(newCap);
          else next.splice(insertIdx, 0, newCap);
          return next;
        });
      }
      setSelectedId(newCap.id);
    },
    [captions, currentTime, setCaptionsWithHistory]
  );

  const handleDeleteCaption = useCallback(
    (id) => {
      setCaptionsWithHistory((prev) => prev.filter((c) => c.id !== id));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId, setCaptionsWithHistory]
  );

  // ── Merge caption with next ─────────────────────────────────────────────
  const handleMergeCaption = useCallback((id) => {
    setCaptionsWithHistory((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const curr = prev[idx];
      const next = prev[idx + 1];
      const merged = {
        ...curr,
        end:   next.end,
        text:  `${curr.text} ${next.text}`.trim(),
        words: curr.words && next.words ? [...curr.words, ...next.words] : undefined,
      };
      const result = [...prev];
      result.splice(idx, 2, merged);
      return result;
    });
  }, [setCaptionsWithHistory]);

  // ── Split caption at cursor position ───────────────────────────────────
  const handleSplitCaption = useCallback((id, cursorPos) => {
    setCaptionsWithHistory((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const cap = prev[idx];
      const text = cap.text;
      if (cursorPos <= 0 || cursorPos >= text.length) return prev;

      // Split text at cursor, trimming whitespace
      const part1 = text.slice(0, cursorPos).trimEnd();
      const part2 = text.slice(cursorPos).trimStart();
      if (!part1 || !part2) return prev;

      const ratio    = cursorPos / text.length;
      const midTime  = cap.start + ratio * (cap.end - cap.start);

      const cap1 = { ...cap, end: midTime, text: part1 };
      const cap2 = {
        id:    `cap-split-${Date.now()}`,
        start: midTime,
        end:   cap.end,
        text:  part2,
      };
      const result = [...prev];
      result.splice(idx, 1, cap1, cap2);
      return result;
    });
  }, [setCaptionsWithHistory]);

  // ── Shift all timings ───────────────────────────────────────────────────
  const handleShiftTimings = useCallback((deltaSeconds) => {
    setCaptionsWithHistory((prev) =>
      prev.map((c) => ({
        ...c,
        start: Math.max(0, c.start + deltaSeconds),
        end:   Math.max(0, c.end   + deltaSeconds),
      }))
    );
  }, [setCaptionsWithHistory]);

  // ── Find & Replace ──────────────────────────────────────────────────────
  const handleFindReplace = useCallback((find, replace, replaceAll) => {
    if (!find) return 0;
    let count = 0;
    setCaptionsWithHistory((prev) => {
      if (replaceAll) {
        return prev.map((c) => {
          const re   = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
          const text = c.text.replace(re, () => { count++; return replace; });
          return { ...c, text };
        });
      } else {
        let replaced = false;
        return prev.map((c) => {
          if (replaced) return c;
          const i = c.text.indexOf(find);
          if (i !== -1) {
            replaced = true;
            count++;
            return {
              ...c,
              text: c.text.slice(0, i) + replace + c.text.slice(i + find.length),
            };
          }
          return c;
        });
      }
    });
    return count;
  }, [setCaptionsWithHistory]);

  // ── Auto-split long captions ────────────────────────────────────────────
  const handleAutoSplit = useCallback((maxChars) => {
    setCaptionsWithHistory((prev) => {
      const result = [];
      for (const cap of prev) {
        if (cap.text.length <= maxChars) {
          result.push(cap);
          continue;
        }
        const words = cap.text.split(" ");
        let part1   = "";
        let splitAt = 0;
        for (let i = 0; i < words.length; i++) {
          const candidate = part1 ? `${part1} ${words[i]}` : words[i];
          if (candidate.length > maxChars && part1) break;
          part1   = candidate;
          splitAt = i + 1;
        }
        const part2 = words.slice(splitAt).join(" ");
        if (!part2.trim()) {
          result.push(cap);
          continue;
        }
        const ratio   = part1.length / cap.text.length;
        const midTime = cap.start + ratio * (cap.end - cap.start);
        result.push({ ...cap, end: midTime, text: part1 });
        result.push({
          id:    `cap-split-${Date.now()}-${Math.random()}`,
          start: midTime,
          end:   cap.end,
          text:  part2,
        });
      }
      return result;
    });
  }, [setCaptionsWithHistory]);

  // ── Auto-fix punctuation / capitalization ──────────────────────────────
  const handleAutoFix = useCallback(() => {
    setCaptionsWithHistory((prev) =>
      prev.map((c) => {
        let text = c.text.trim();
        if (!text) return c;
        text = text.charAt(0).toUpperCase() + text.slice(1);
        if (!/[.!?,;:…]$/.test(text)) text += ".";
        return { ...c, text };
      })
    );
  }, [setCaptionsWithHistory]);

  // ── Style ───────────────────────────────────────────────────────────────
  const handleStyleChange = useCallback((updates) => {
    setStyle((prev) => ({ ...prev, ...updates }));
  }, []);

  // ── Seek ─────────────────────────────────────────────────────────────────
  const handleSeek = useCallback((time) => {
    setCurrentTime(time);
    videoPlayerRef.current?.seekTo(time);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────
  const handleRender = useCallback(async () => {
    if (!uploadedFile) return;
    try {
      setIsRendering(true);
      setError(null);
      const result = await renderVideo(uploadedFile.filename, captions, style);
      setRenderOutputUrl(result.output_url);
    } catch (err) {
      setError(`Rendering failed: ${err.message}`);
    } finally {
      setIsRendering(false);
    }
  }, [uploadedFile, captions, style]);

  // ── Reset ───────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setUploadedFile(null);
    setCaptions([]);
    captionsHistoryRef.current = [[]];
    historyIndexRef.current    = 0;
    setCanUndo(false);
    setCanRedo(false);
    setRenderOutputUrl(null);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setKaraokeMode(false);
    setAspectRatio(null);
  }, []);

  // ── Batch processing ────────────────────────────────────────────────────
  const handleBatchProcess = useCallback(async (files) => {
    if (!files.length) return;
    try {
      setError(null);
      // Upload all files
      const uploaded = [];
      for (const file of files) {
        const res = await uploadFile(file);
        uploaded.push({ ...res, originalFile: file });
      }
      // Batch transcribe
      const filenames = uploaded.map((u) => u.filename);
      const result = await batchTranscribe(filenames, modelSize, language || null);
      // Download SRT for each completed file
      result.results.forEach((item, i) => {
        if (!item.error) {
          const origName = uploaded[i]?.original_name ?? `file_${i}`;
          downloadTextFile(item.srt, `${origName}.srt`, "text/plain");
        }
      });
      const errCount = result.results.filter((r) => r.error).length;
      if (errCount > 0) {
        setError(`Batch done — ${errCount} file(s) failed. Check console for details.`);
      }
    } catch (err) {
      setError(`Batch processing failed: ${err.message}`);
    }
  }, [modelSize, language]);

  // ── Global keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      const isEditing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        document.activeElement?.isContentEditable;

      // Ctrl/Meta shortcuts work everywhere
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
          return;
        }
        if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
          return;
        }
      }

      // Everything else: skip when typing in a field
      if (isEditing) return;

      if (e.code === "Space") {
        e.preventDefault();
        videoPlayerRef.current?.togglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleSeek(Math.max(0, currentTimeRef.current - 5));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleSeek(Math.min(durationRef.current, currentTimeRef.current + 5));
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedIdRef.current) {
          e.preventDefault();
          handleDeleteCaption(selectedIdRef.current);
        }
      } else if (e.code === "Escape") {
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleUndo, handleRedo, handleSeek, handleDeleteCaption]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <Header />

      {!uploadedFile ? (
        <div className="upload-screen">
          <FileUpload
            onUpload={handleFileUpload}
            onBatchProcess={handleBatchProcess}
            modelSize={modelSize}
            language={language}
          />
        </div>
      ) : (
        <div className="studio-layout">
          {/* ── Top: video + editor ── */}
          <div className="main-area">
            {/* Left: video player */}
            <div className="video-section">
              <VideoPlayer
                ref={videoPlayerRef}
                fileUrl={uploadedFile.preview_url}
                fileType={uploadedFile.file_type}
                captions={captions}
                style={style}
                karaokeMode={karaokeMode}
                aspectRatio={aspectRatio}
                onTimeUpdate={(t) => { currentTimeRef.current = t; setCurrentTime(t); }}
                onDurationChange={(d) => { durationRef.current = d; setDuration(d); }}
              />

              {/* Transcription toolbar */}
              <div className="toolbar">
                <select
                  className="select"
                  value={modelSize}
                  onChange={(e) => setModelSize(e.target.value)}
                  title="Whisper model size"
                >
                  <option value="tiny">tiny (fastest)</option>
                  <option value="base">base (recommended)</option>
                  <option value="small">small</option>
                  <option value="medium">medium</option>
                  <option value="large">large (slowest)</option>
                </select>

                <select
                  className="select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  title="Source language (auto-detect if blank)"
                >
                  <option value="">Auto-detect language</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ru">Russian</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                  <option value="ar">Arabic</option>
                  <option value="hi">Hindi</option>
                  <option value="nl">Dutch</option>
                  <option value="pl">Polish</option>
                  <option value="tr">Turkish</option>
                  <option value="sv">Swedish</option>
                  <option value="id">Indonesian</option>
                  <option value="uk">Ukrainian</option>
                  <option value="ur">Urdu</option>
                </select>

                <label className="checkbox-label" title="Include per-word timing (enables karaoke mode)">
                  <input
                    type="checkbox"
                    checked={wordTimestamps}
                    onChange={(e) => setWordTimestamps(e.target.checked)}
                  />
                  <span>Word timestamps</span>
                </label>

                <button
                  className={`btn btn-accent ${isTranscribing ? "loading" : ""}`}
                  onClick={handleTranscribe}
                  disabled={isTranscribing}
                >
                  {isTranscribing ? "Transcribing…" : "⚡ Auto-Transcribe"}
                </button>

                <button className="btn btn-ghost" onClick={handleReset}>
                  ✕ New File
                </button>
              </div>

              {/* Aspect ratio + karaoke controls */}
              <div className="toolbar" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", gap: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text3)", whiteSpace: "nowrap" }}>Aspect ratio:</span>
                {[null, "16:9", "9:16", "1:1"].map((r) => (
                  <button
                    key={r ?? "free"}
                    className={`btn btn-ghost btn-sm ${aspectRatio === r ? "active-ratio" : ""}`}
                    onClick={() => setAspectRatio(r)}
                    title={r ?? "Free (default)"}
                  >
                    {r ?? "Free"}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                {captions.some((c) => c.words?.length) && (
                  <button
                    className={`btn btn-sm ${karaokeMode ? "btn-accent" : "btn-ghost"}`}
                    onClick={() => setKaraokeMode((v) => !v)}
                    title="Highlight each word as it is spoken"
                  >
                    🎤 Karaoke
                  </button>
                )}
              </div>

              {/* Translate toolbar — shown only when captions exist */}
              {captions.length > 0 && (
                <div className="toolbar" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted, #888)", whiteSpace: "nowrap" }}>
                    Translate captions:
                  </span>
                  <select
                    className="select"
                    value={translateLang}
                    onChange={(e) => setTranslateLang(e.target.value)}
                    title="Target language for caption translation"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh-CN">Chinese (Simplified)</option>
                    <option value="zh-TW">Chinese (Traditional)</option>
                    <option value="ar">Arabic</option>
                    <option value="hi">Hindi</option>
                    <option value="nl">Dutch</option>
                    <option value="pl">Polish</option>
                    <option value="tr">Turkish</option>
                    <option value="sv">Swedish</option>
                    <option value="id">Indonesian</option>
                    <option value="uk">Ukrainian</option>
                    <option value="vi">Vietnamese</option>
                    <option value="th">Thai</option>
                    <option value="ro">Romanian</option>
                    <option value="cs">Czech</option>
                    <option value="hu">Hungarian</option>
                    <option value="el">Greek</option>
                    <option value="fi">Finnish</option>
                    <option value="da">Danish</option>
                    <option value="no">Norwegian</option>
                    <option value="ur">Urdu</option>
                  </select>
                  <button
                    className={`btn btn-accent ${isTranslating ? "loading" : ""}`}
                    onClick={handleTranslate}
                    disabled={isTranslating}
                  >
                    {isTranslating ? "Translating…" : "🌐 Translate"}
                  </button>
                </div>
              )}
            </div>

            {/* Right: tabbed panel */}
            <div className="editor-section">
              <div className="tab-bar">
                {["editor", "style", "export"].map((t) => (
                  <button
                    key={t}
                    className={`tab-btn ${activeTab === t ? "active" : ""}`}
                    onClick={() => setActiveTab(t)}
                  >
                    {t === "editor" ? "Captions" : t === "style" ? "Style" : "Export"}
                  </button>
                ))}
              </div>

              <div className="panel-body">
                {activeTab === "editor" && (
                  <CaptionEditor
                    captions={captions}
                    selectedId={selectedId}
                    currentTime={currentTime}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onSelect={setSelectedId}
                    onUpdate={handleUpdateCaption}
                    onAdd={handleAddCaption}
                    onDelete={handleDeleteCaption}
                    onSeek={handleSeek}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onMerge={handleMergeCaption}
                    onSplit={handleSplitCaption}
                    onShiftTimings={handleShiftTimings}
                    onFindReplace={handleFindReplace}
                    onAutoSplit={handleAutoSplit}
                    onAutoFix={handleAutoFix}
                  />
                )}

                {activeTab === "style" && (
                  <StylePanel
                    style={style}
                    captions={captions}
                    onChange={handleStyleChange}
                  />
                )}

                {activeTab === "export" && (
                  <ExportPanel
                    captions={captions}
                    uploadedFile={uploadedFile}
                    isRendering={isRendering}
                    renderOutputUrl={renderOutputUrl}
                    onRender={handleRender}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── Bottom: timeline ── */}
          <div className="timeline-section">
            <Timeline
              fileUrl={uploadedFile.preview_url}
              captions={captions}
              currentTime={currentTime}
              duration={duration}
              selectedId={selectedId}
              onSeek={handleSeek}
              onUpdateCaption={handleUpdateCaption}
              onSelectCaption={setSelectedId}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
