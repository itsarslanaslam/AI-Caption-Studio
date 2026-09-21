// ── Shared icon set ──────────────────────────────────────────────────────────
// Hand-drawn, single-stroke SVGs (24x24 viewBox, currentColor) used across the
// app instead of emoji, so the UI reads as one designed system rather than a
// grab-bag of platform-rendered glyphs.

export function UploadIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 15V4M12 4 8 8M12 4l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.5 15v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LayersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="m12 3.5 8 4.4-8 4.4-8-4.4 8-4.4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m4 12.2 8 4.4 8-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m4 16.4 8 4.4 8-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FolderIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.2a1.5 1.5 0 0 1 1.2.6l1 1.4H19a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="m5 13 4 4 10-11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BackIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BoltIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.5 3 5 13.5h5.5L11 21l7.5-10.5H13l-.5-7.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function UndoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M7 8H4V5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.3 8.5A8 8 0 1 1 4 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function RedoIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M17 8h3V5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.7 8.5A8 8 0 1 0 20 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.7" />
      <path d="m20 20-4.6-4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ScissorsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="6.5" cy="6.5" r="2.3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6.5" cy="17.5" r="2.3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.2 8 19 19M19 5 8.2 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SparkleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M11 3.5c.5 3 2 4.5 5 5-3 .5-4.5 2-5 5-.5-3-2-4.5-5-5 3-.5 4.5-2 5-5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M18 14.5c.3 1.4.9 2 2.3 2.3-1.4.3-2 .9-2.3 2.3-.3-1.4-.9-2-2.3-2.3 1.4-.3 2-.9 2.3-2.3Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function MergeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M8 4v8a4 4 0 0 0 4 4h4M8 4 5 7m3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16 13 3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M5 7h14M9.5 7V5.2a1.2 1.2 0 0 1 1.2-1.2h2.6a1.2 1.2 0 0 1 1.2 1.2V7M7 7l.8 12.2A1.5 1.5 0 0 0 9.3 20.6h5.4a1.5 1.5 0 0 0 1.5-1.4L17 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WarningIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 3.5 21 19.5H3L12 3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 9.7v4M12 16.7h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ChatIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H10l-4.5 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function MicIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3M9 20.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function GlobeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 12h16M12 3.8c2 2.2 3 5.1 3 8.2s-1 6-3 8.2c-2-2.2-3-5.1-3-8.2s1-6 3-8.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 4v11m0 0-3.5-3.5M12 15l3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 17v1.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EyeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ClapperIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 10.5 5.6 5h13L20 6.4 6.4 12l-.6-.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="4" y="10.5" width="16" height="8.5" rx="1.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="m9 6 2 4.3M13.5 5.3l2 4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function InboxIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 12.5h4.2l1.3 2.3h4.9l1.3-2.3H20" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5.3 6.5h13.4a1.3 1.3 0 0 1 1.28 1.08l1 6A1.3 1.3 0 0 1 19.7 15H4.3a1.3 1.3 0 0 1-1.28-1.42l1-6A1.3 1.3 0 0 1 5.3 6.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function MusicNoteIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M9 17.5V5.8l10-2v11.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="17.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.5" cy="15.5" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function SlidersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="13" cy="7" r="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="7" cy="17" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
