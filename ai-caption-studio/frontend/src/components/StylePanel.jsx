import { useMemo, useState, useCallback, useEffect } from "react";

const FONTS = [
  "Arial",
  "Arial Black",
  "Georgia",
  "Impact",
  "Roboto",
  "Tahoma",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
  "Courier New",
];

const ALIGNMENTS = [
  { value: "top-left",      icon: "↖", label: "Top Left" },
  { value: "top-center",    icon: "↑", label: "Top Center" },
  { value: "top-right",     icon: "↗", label: "Top Right" },
  { value: "middle-left",   icon: "←", label: "Middle Left" },
  { value: "middle-center", icon: "·", label: "Middle Center" },
  { value: "middle-right",  icon: "→", label: "Middle Right" },
  { value: "bottom-left",   icon: "↙", label: "Bottom Left" },
  { value: "bottom-center", icon: "↓", label: "Bottom Center" },
  { value: "bottom-right",  icon: "↘", label: "Bottom Right" },
];

const PRESETS_KEY = "caption-style-presets";

function hexToRgba(hex, alpha) {
  const c = hex?.replace("#", "") ?? "";
  if (c.length !== 6) return "transparent";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${(alpha / 255).toFixed(2)})`;
}

function loadPresets() {
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function StylePanel({ style, onChange }) {
  const {
    fontFamily      = "Arial",
    fontSize        = 14,
    textColor       = "#ffffff",
    bgColor         = "#000000",
    bgAlpha         = 160,
    strokeColor     = "#000000",
    strokeWidth     = 0,
    shadow          = 2,
    alignment       = "bottom-center",
    bold            = false,
    italic          = false,
    marginH         = 20,
    marginV         = 30,
    captionMaxWidth = 30,
    captionPaddingV = 6,
    animation       = "none",
  } = style;

  // ── Presets ────────────────────────────────────────────────────────────
  const [presets,     setPresets]     = useState(loadPresets);
  const [presetName,  setPresetName]  = useState("");

  const savePreset = useCallback(() => {
    const name = presetName.trim();
    if (!name) return;
    const newPreset = { name, style: { ...style } };
    setPresets((prev) => {
      const filtered = prev.filter((p) => p.name !== name);
      const updated  = [...filtered, newPreset];
      localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
      return updated;
    });
    setPresetName("");
  }, [presetName, style]);

  const deletePreset = useCallback((name) => {
    setPresets((prev) => {
      const updated = prev.filter((p) => p.name !== name);
      localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Build live preview style
  const previewStyle = useMemo(() => ({
    fontFamily,
    fontSize:        `${Math.min(fontSize, 28)}px`,
    fontWeight:      bold   ? "700" : "400",
    fontStyle:       italic ? "italic" : "normal",
    color:           textColor,
    backgroundColor: hexToRgba(bgColor, bgAlpha),
    WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth}px ${strokeColor}` : "none",
    textShadow:      shadow > 0 ? `${shadow}px ${shadow}px ${shadow * 2}px rgba(0,0,0,0.9)` : "none",
    padding:         "4px 12px",
    borderRadius:    "3px",
    display:         "inline-block",
  }), [fontFamily, fontSize, bold, italic, textColor, bgColor, bgAlpha, strokeColor, strokeWidth, shadow]);

  return (
    <div className="style-panel">
      {/* Preview */}
      <div className="caption-preview">
        <span style={previewStyle}>Caption Preview Text</span>
      </div>

      {/* Font */}
      <div className="style-section">
        <div className="style-section-title">Font</div>
        <div className="style-grid">
          <div className="style-field full">
            <label className="style-label">Family</label>
            <select
              className="style-select"
              value={fontFamily}
              onChange={(e) => onChange({ fontFamily: e.target.value })}
            >
              {FONTS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>

          <div className="style-field">
            <label className="style-label">Size (px)</label>
            <div className="range-row">
              <input
                type="range"
                className="style-input"
                min={12} max={96} step={2}
                value={fontSize}
                onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              />
              <span className="range-value">{fontSize}</span>
            </div>
          </div>

          <div className="style-field">
            <label className="style-label">Style</label>
            <div className="toggle-row" style={{ padding: 0 }}>
              <button
                className={`toggle-btn ${bold ? "active" : ""}`}
                onClick={() => onChange({ bold: !bold })}
                style={{ fontWeight: "700" }}
              >
                B
              </button>
              <button
                className={`toggle-btn ${italic ? "active" : ""}`}
                onClick={() => onChange({ italic: !italic })}
                style={{ fontStyle: "italic" }}
              >
                I
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="style-section">
        <div className="style-section-title">Colors</div>
        <div className="style-grid">
          <div className="style-field">
            <label className="style-label">Text Color</label>
            <input
              type="color"
              className="style-input"
              value={textColor}
              onChange={(e) => onChange({ textColor: e.target.value })}
            />
          </div>

          <div className="style-field">
            <label className="style-label">Background</label>
            <input
              type="color"
              className="style-input"
              value={bgColor}
              onChange={(e) => onChange({ bgColor: e.target.value })}
            />
          </div>

          <div className="style-field full">
            <label className="style-label">Background Opacity</label>
            <div className="range-row">
              <input
                type="range"
                className="style-input"
                min={0} max={255} step={5}
                value={bgAlpha}
                onChange={(e) => onChange({ bgAlpha: Number(e.target.value) })}
              />
              <span className="range-value">{Math.round(bgAlpha / 255 * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Outline & Shadow */}
      <div className="style-section">
        <div className="style-section-title">Outline &amp; Shadow</div>
        <div className="style-grid">
          <div className="style-field">
            <label className="style-label">Outline Color</label>
            <input
              type="color"
              className="style-input"
              value={strokeColor}
              onChange={(e) => onChange({ strokeColor: e.target.value })}
            />
          </div>

          <div className="style-field">
            <label className="style-label">Outline Width</label>
            <div className="range-row">
              <input
                type="range"
                className="style-input"
                min={0} max={8} step={0.5}
                value={strokeWidth}
                onChange={(e) => onChange({ strokeWidth: Number(e.target.value) })}
              />
              <span className="range-value">{strokeWidth}</span>
            </div>
          </div>

          <div className="style-field full">
            <label className="style-label">Shadow Depth</label>
            <div className="range-row">
              <input
                type="range"
                className="style-input"
                min={0} max={10} step={0.5}
                value={shadow}
                onChange={(e) => onChange({ shadow: Number(e.target.value) })}
              />
              <span className="range-value">{shadow}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Animation */}
      <div className="style-section">
        <div className="style-section-title">Animation (Rendered Video)</div>
        <div className="style-grid" style={{ padding: "10px 12px" }}>
          <div className="style-field full">
            <label className="style-label">Caption Animation</label>
            <select
              className="style-select"
              value={animation}
              onChange={(e) => onChange({ animation: e.target.value })}
            >
              <option value="none">None</option>
              <option value="fade">Fade In / Fade Out</option>
              <option value="slide-up">Slide Up</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alignment */}
      <div className="style-section">
        <div className="style-section-title">Alignment</div>
        <div className="alignment-grid">
          {ALIGNMENTS.map((a) => (
            <button
              key={a.value}
              className={`align-btn ${alignment === a.value ? "active" : ""}`}
              title={a.label}
              onClick={() => onChange({ alignment: a.value })}
            >
              {a.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Margins */}
      <div className="style-section">
        <div className="style-section-title">Margins</div>
        <div className="style-grid">
          <div className="style-field">
            <label className="style-label">Horizontal (px)</label>
            <div className="range-row">
              <input
                type="range"
                className="style-input"
                min={0} max={200} step={5}
                value={marginH}
                onChange={(e) => onChange({ marginH: Number(e.target.value) })}
              />
              <span className="range-value">{marginH}</span>
            </div>
          </div>

          <div className="style-field">
            <label className="style-label">Vertical (px)</label>
            <div className="range-row">
              <input
                type="range"
                className="style-input"
                min={0} max={200} step={5}
                value={marginV}
                onChange={(e) => onChange({ marginV: Number(e.target.value) })}
              />
              <span className="range-value">{marginV}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Caption Size */}
      <div className="style-section">
        <div className="style-section-title">Caption Size</div>
        <div className="style-grid">
          <div className="style-field full">
            <label className="style-label">Max Width (% of video)</label>
            <div className="range-row">
              <input
                type="range"
                className="style-input"
                min={20} max={100} step={5}
                value={captionMaxWidth}
                onChange={(e) => onChange({ captionMaxWidth: Number(e.target.value) })}
              />
              <span className="range-value">{captionMaxWidth}%</span>
            </div>
          </div>

          <div className="style-field full">
            <label className="style-label">Vertical Padding (px)</label>
            <div className="range-row">
              <input
                type="range"
                className="style-input"
                min={0} max={40} step={2}
                value={captionPaddingV}
                onChange={(e) => onChange({ captionPaddingV: Number(e.target.value) })}
              />
              <span className="range-value">{captionPaddingV}px</span>
            </div>
          </div>

        </div>
      </div>

      {/* Quick Templates */}
      <div className="style-section">
        <div className="style-section-title">Quick Templates</div>
        <div style={{ padding: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() =>
            onChange({
              fontFamily: "Arial", fontSize: 36, textColor: "#ffffff",
              bgColor: "#000000", bgAlpha: 160, strokeWidth: 2,
              strokeColor: "#000000", shadow: 2, alignment: "bottom-center",
            })
          }>Default</button>

          <button className="btn btn-ghost btn-sm" onClick={() =>
            onChange({
              fontFamily: "Impact", fontSize: 48, textColor: "#ffff00",
              bgColor: "#000000", bgAlpha: 0, strokeWidth: 3,
              strokeColor: "#000000", shadow: 0, alignment: "top-center",
            })
          }>YouTube Title</button>

          <button className="btn btn-ghost btn-sm" onClick={() =>
            onChange({
              fontFamily: "Arial Black", fontSize: 40, textColor: "#ffffff",
              bgColor: "#1a1a1a", bgAlpha: 220, strokeWidth: 0,
              strokeColor: "#000000", shadow: 4, alignment: "bottom-center",
            })
          }>TikTok Style</button>

          <button className="btn btn-ghost btn-sm" onClick={() =>
            onChange({
              fontFamily: "Georgia", fontSize: 28, textColor: "#f0f0f0",
              bgColor: "#000000", bgAlpha: 100, strokeWidth: 1,
              strokeColor: "#333333", shadow: 3, alignment: "bottom-center",
            })
          }>Cinematic</button>
        </div>
      </div>

      {/* Custom Presets */}
      <div className="style-section">
        <div className="style-section-title">Custom Presets</div>
        <div style={{ padding: "10px 12px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              className="style-input"
              type="text"
              placeholder="Preset name…"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") savePreset(); }}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={savePreset}
              disabled={!presetName.trim()}
            >
              Save
            </button>
          </div>

          {presets.length === 0 ? (
            <div style={{ fontSize: 11, color: "var(--text3)", textAlign: "center", padding: "6px 0" }}>
              No saved presets
            </div>
          ) : (
            <div className="preset-list">
              {presets.map((p) => (
                <div key={p.name} className="preset-item">
                  <span className="preset-name">{p.name}</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onChange(p.style)}
                    >
                      Load
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => deletePreset(p.name)}
                      style={{ color: "var(--red)" }}
                      title="Delete preset"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
