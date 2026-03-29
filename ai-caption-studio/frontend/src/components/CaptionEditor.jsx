import { useRef, useEffect, useCallback, forwardRef, useState, useMemo } from "react";
import { formatTime, parseTime } from "../utils/timeUtils.js";

// ── Confidence badge ─────────────────────────────────────────────────────────
function ConfidenceBadge({ confidence }) {
  if (confidence == null) return null;
  const pct = Math.round(confidence * 100);
  const cls =
    confidence >= 0.75 ? "conf-high" :
    confidence >= 0.45 ? "conf-med"  : "conf-low";
  return (
    <span className={`conf-badge ${cls}`} title={`Confidence: ${pct}%`}>
      {pct}%
    </span>
  );
}

// ── Compute gap/overlap issues ───────────────────────────────────────────────
function computeIssues(captions) {
  const issues = {};
  for (let i = 0; i < captions.length; i++) {
    const curr = captions[i];
    const next = captions[i + 1];
    if (!next) break;
    if (curr.end > next.start + 0.02) {
      issues[curr.id] = "overlap";
      issues[next.id] = "overlap";
    }
  }
  return issues;
}

// ─── CaptionEditor ───────────────────────────────────────────────────────────
export default function CaptionEditor({
  captions,
  selectedId,
  currentTime,
  canUndo,
  canRedo,
  onSelect,
  onUpdate,
  onAdd,
  onDelete,
  onSeek,
  onUndo,
  onRedo,
  onMerge,
  onSplit,
  onShiftTimings,
  onFindReplace,
  onAutoSplit,
  onAutoFix,
}) {
  const listRef   = useRef(null);
  const activeRef = useRef(null);

  // ── Find & Replace state ──────────────────────────────────────────────
  const [showFR,    setShowFR]    = useState(false);
  const [findText,  setFindText]  = useState("");
  const [replText,  setReplText]  = useState("");
  const [frMsg,     setFrMsg]     = useState("");

  // ── Shift-timings state ───────────────────────────────────────────────
  const [showShift, setShowShift] = useState(false);
  const [shiftVal,  setShiftVal]  = useState("0");

  // ── Auto-split state ──────────────────────────────────────────────────
  const [showSplit, setShowSplit] = useState(false);
  const [splitMax,  setSplitMax]  = useState("60");

  // ── Gap/overlap issues ────────────────────────────────────────────────
  const issues = useMemo(() => computeIssues(captions), [captions]);
  const overlapCount = Object.values(issues).filter((v) => v === "overlap").length / 2;

  // Auto-scroll to active caption
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedId]);

  const handleTimeBlur = useCallback(
    (id, field, value) => {
      const parsed = parseTime(value);
      if (!isNaN(parsed)) onUpdate(id, { [field]: parsed });
    },
    [onUpdate]
  );

  const handleFRReplace = (all) => {
    const count = onFindReplace(findText, replText, all);
    setFrMsg(all ? `Replaced ${count} occurrence(s).` : count ? "Replaced 1 occurrence." : "Not found.");
    setTimeout(() => setFrMsg(""), 2500);
  };

  const handleShiftApply = () => {
    const delta = parseFloat(shiftVal);
    if (!isNaN(delta)) {
      onShiftTimings(delta);
      setShowShift(false);
      setShiftVal("0");
    }
  };

  const handleAutoSplitApply = () => {
    const max = parseInt(splitMax, 10);
    if (!isNaN(max) && max > 0) {
      onAutoSplit(max);
      setShowSplit(false);
    }
  };

  // ── Empty state ───────────────────────────────────────────────────────
  if (captions.length === 0) {
    return (
      <div className="caption-editor">
        <div className="caption-editor-toolbar">
          <span className="caption-count">No captions</span>
          <button className="btn btn-ghost btn-sm" onClick={() => onAdd(null)}>
            + Add
          </button>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">💬</div>
          <div>No captions yet.</div>
          <div>Click <strong>⚡ Auto-Transcribe</strong> to generate them automatically,</div>
          <div>or add one manually.</div>
          <br />
          <button className="btn btn-accent btn-sm" onClick={() => onAdd(null)}>
            + Add Caption
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="caption-editor">
      {/* ── Main toolbar ── */}
      <div className="caption-editor-toolbar">
        <span className="caption-count">
          {captions.length} caption{captions.length !== 1 ? "s" : ""}
          {overlapCount > 0 && (
            <span className="overlap-badge" title={`${overlapCount * 2} captions overlap`}>
              ⚠ {overlapCount} overlap{overlapCount !== 1 ? "s" : ""}
            </span>
          )}
        </span>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
          {/* Undo / Redo */}
          <button
            className="btn-icon"
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={onUndo}
            style={{ opacity: canUndo ? 1 : 0.35 }}
          >
            ↩
          </button>
          <button
            className="btn-icon"
            title="Redo (Ctrl+Y)"
            disabled={!canRedo}
            onClick={onRedo}
            style={{ opacity: canRedo ? 1 : 0.35 }}
          >
            ↪
          </button>

          <div style={{ width: 1, height: 14, background: "var(--border)", margin: "0 2px" }} />

          {/* Find & Replace toggle */}
          <button
            className={`btn btn-ghost btn-sm ${showFR ? "active-tool" : ""}`}
            title="Find & Replace"
            onClick={() => { setShowFR((v) => !v); setShowShift(false); setShowSplit(false); }}
          >
            🔍
          </button>

          {/* Shift timings */}
          <button
            className={`btn btn-ghost btn-sm ${showShift ? "active-tool" : ""}`}
            title="Shift all timings"
            onClick={() => { setShowShift((v) => !v); setShowFR(false); setShowSplit(false); }}
          >
            ⏱
          </button>

          {/* Auto-split */}
          <button
            className={`btn btn-ghost btn-sm ${showSplit ? "active-tool" : ""}`}
            title="Auto-split long captions"
            onClick={() => { setShowSplit((v) => !v); setShowFR(false); setShowShift(false); }}
          >
            ✂
          </button>

          {/* Auto-fix */}
          <button
            className="btn btn-ghost btn-sm"
            title="Auto-fix capitalization & punctuation"
            onClick={onAutoFix}
          >
            ✦
          </button>

          <div style={{ width: 1, height: 14, background: "var(--border)", margin: "0 2px" }} />

          <button className="btn btn-ghost btn-sm" onClick={() => onAdd(null)}>
            + Add
          </button>
        </div>
      </div>

      {/* ── Find & Replace bar ── */}
      {showFR && (
        <div className="inline-toolbar">
          <input
            className="inline-input"
            placeholder="Find…"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleFRReplace(false); }}
          />
          <input
            className="inline-input"
            placeholder="Replace…"
            value={replText}
            onChange={(e) => setReplText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleFRReplace(false); }}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => handleFRReplace(false)}>Replace</button>
          <button className="btn btn-ghost btn-sm" onClick={() => handleFRReplace(true)}>All</button>
          {frMsg && <span style={{ fontSize: 11, color: "var(--green)", whiteSpace: "nowrap" }}>{frMsg}</span>}
        </div>
      )}

      {/* ── Shift timings bar ── */}
      {showShift && (
        <div className="inline-toolbar">
          <span style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>Shift all by (s):</span>
          <input
            className="inline-input"
            type="number"
            step="0.1"
            value={shiftVal}
            onChange={(e) => setShiftVal(e.target.value)}
            style={{ width: 70 }}
            onKeyDown={(e) => { if (e.key === "Enter") handleShiftApply(); }}
          />
          <button className="btn btn-ghost btn-sm" onClick={handleShiftApply}>Apply</button>
          <span style={{ fontSize: 11, color: "var(--text3)", flex: 1 }}>
            Positive = forward, negative = backward
          </span>
        </div>
      )}

      {/* ── Auto-split bar ── */}
      {showSplit && (
        <div className="inline-toolbar">
          <span style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "nowrap" }}>Max chars per caption:</span>
          <input
            className="inline-input"
            type="number"
            min="10"
            max="500"
            value={splitMax}
            onChange={(e) => setSplitMax(e.target.value)}
            style={{ width: 60 }}
            onKeyDown={(e) => { if (e.key === "Enter") handleAutoSplitApply(); }}
          />
          <button className="btn btn-ghost btn-sm" onClick={handleAutoSplitApply}>Split</button>
        </div>
      )}

      {/* ── Caption list ── */}
      <div className="caption-list" ref={listRef}>
        {captions.map((cap, idx) => {
          const isActive  = cap.id === selectedId;
          const isCurrent = currentTime >= cap.start && currentTime <= cap.end;
          const hasIssue  = issues[cap.id];

          return (
            <CaptionItem
              key={cap.id}
              cap={cap}
              idx={idx}
              isActive={isActive}
              isCurrent={isCurrent}
              hasIssue={hasIssue}
              isLast={idx === captions.length - 1}
              ref={isActive ? activeRef : null}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onAdd={onAdd}
              onDelete={onDelete}
              onSeek={onSeek}
              onTimeBlur={handleTimeBlur}
              onMerge={onMerge}
              onSplit={onSplit}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Individual caption item ──────────────────────────────────────────────────

const CaptionItem = forwardRef(function CaptionItem(
  {
    cap, idx, isActive, isCurrent, hasIssue, isLast,
    onSelect, onUpdate, onAdd, onDelete, onSeek, onTimeBlur,
    onMerge, onSplit,
  },
  ref
) {
  const [startVal,   setStartVal]   = useState(formatTime(cap.start));
  const [endVal,     setEndVal]     = useState(formatTime(cap.end));
  const textareaRef                 = useRef(null);

  // Keep local display in sync when parent updates (e.g. timeline drag)
  useEffect(() => { setStartVal(formatTime(cap.start)); }, [cap.start]);
  useEffect(() => { setEndVal(formatTime(cap.end));     }, [cap.end]);

  const handleSplitHere = (e) => {
    e.stopPropagation();
    const pos = textareaRef.current?.selectionStart ?? Math.floor(cap.text.length / 2);
    onSplit(cap.id, pos);
  };

  const issueStyle =
    hasIssue === "overlap"
      ? { borderColor: "var(--red)" }
      : {};

  return (
    <div
      ref={ref}
      className={`caption-item ${isActive ? "active" : ""} ${isCurrent ? "current" : ""}`}
      style={issueStyle}
      onClick={() => {
        onSelect(cap.id);
        onSeek(cap.start);
      }}
    >
      <div className="caption-item-header">
        <span className="caption-idx">#{idx + 1}</span>

        <input
          className="time-input"
          value={startVal}
          onChange={(e) => setStartVal(e.target.value)}
          onBlur={(e) => onTimeBlur(cap.id, "start", e.target.value)}
          onClick={(e) => e.stopPropagation()}
          title="Start time"
        />

        <span className="time-separator">→</span>

        <input
          className="time-input"
          value={endVal}
          onChange={(e) => setEndVal(e.target.value)}
          onBlur={(e) => onTimeBlur(cap.id, "end", e.target.value)}
          onClick={(e) => e.stopPropagation()}
          title="End time"
        />

        <ConfidenceBadge confidence={cap.confidence} />

        {hasIssue === "overlap" && (
          <span className="issue-badge" title="Overlaps with adjacent caption">⚠</span>
        )}

        <div className="caption-item-actions">
          {!isLast && (
            <button
              className="btn-icon"
              title="Merge with next caption"
              onClick={(e) => { e.stopPropagation(); onMerge(cap.id); }}
            >
              ⊕
            </button>
          )}
          <button
            className="btn-icon"
            title="Add caption after"
            onClick={(e) => { e.stopPropagation(); onAdd(cap.id); }}
          >
            +
          </button>
          <button
            className="btn-icon"
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete(cap.id); }}
            style={{ color: "var(--red)" }}
          >
            ✕
          </button>
        </div>
      </div>

      {isActive ? (
        <div style={{ position: "relative" }}>
          <textarea
            ref={textareaRef}
            className="caption-text-input"
            value={cap.text}
            onChange={(e) => onUpdate(cap.id, { text: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            rows={2}
            autoFocus
          />
          <button
            className="split-here-btn"
            title="Split caption at cursor position"
            onClick={handleSplitHere}
          >
            ✂ Split here
          </button>
          {cap.words?.length > 0 && (
            <div className="word-timestamps">
              {cap.words.map((w, i) => (
                <span key={i} className="word-chip" title={`${w.start.toFixed(2)}s – ${w.end.toFixed(2)}s`}>
                  {w.word}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="caption-item-preview">
          {cap.text || <em style={{ color: "var(--text3)" }}>empty</em>}
        </div>
      )}
    </div>
  );
});
