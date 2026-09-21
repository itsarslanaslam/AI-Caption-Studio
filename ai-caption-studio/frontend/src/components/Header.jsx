export default function Header() {
  return (
    <header className="header">
      <div className="header-logo">
        <div className="header-logo-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="14" rx="3.2" stroke="currentColor" strokeWidth="1.7" />
            <path d="M7 14.2h4M13 14.2h4M7 9.8h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>
        <span className="header-title">AI Caption Studio</span>
      </div>
      <span className="header-divider" aria-hidden="true" />
      <span className="header-subtitle">Whisper + FFmpeg</span>
    </header>
  );
}
