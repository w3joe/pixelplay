import type { ItemKind } from "@/lib/builder/types";
import type { ReactNode } from "react";

const GLYPHS: Record<ItemKind, ReactNode> = {
  stage: (
    <>
      <path d="M3 10.5 8 8h8l5 2.5-5 2.5H8Z" />
      <path d="M3 10.5V14l5 2.5h8l5-2.5v-3.5M8 13v3.5M16 13v3.5" />
    </>
  ),
  led: (
    <>
      <rect x="3" y="4" width="18" height="11" rx="1.5" />
      <path d="M7 8h.01M11 8h.01M15 8h.01M7 11h.01M11 11h.01M15 11h.01M12 15v4M8 20h8" />
    </>
  ),
  speaker: (
    <>
      <rect x="7" y="2.5" width="10" height="15" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
      <circle cx="12" cy="6" r="1" />
      <path d="M12 17.5V21M9 21h6" />
    </>
  ),
  sub: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <circle cx="12" cy="12.5" r="4.5" />
      <circle cx="12" cy="12.5" r="1.4" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2.5" width="6" height="10" rx="3" />
      <path d="M6 10.5a6 6 0 0 0 12 0M12 16.5V21M8.5 21h7" />
    </>
  ),
  par: (
    <>
      <path d="M6 5h7l-1 7H7Z" />
      <path d="M9.5 12v6M6.5 21l3-3 3 3M13 6l7 3M13 9l7 4" />
    </>
  ),
  truss: (
    <>
      <path d="M2.5 7.5h19M2.5 14.5h19M4 7.5l3.5 7 3.5-7 3.5 7 3.5-7 3.5 7" />
    </>
  ),
  mover: (
    <>
      <path d="M8 3h8M12 3v2.5" />
      <rect x="8.5" y="5.5" width="7" height="5" rx="1.5" />
      <path d="m10 10.5-4 10.5h12l-4-10.5" strokeDasharray="2 2" />
    </>
  ),
  fog: (
    <>
      <rect x="3" y="14" width="9" height="6" rx="1.2" />
      <path d="M12 16.5h2M14.5 12a2.5 2.5 0 0 1 4.6-1.3A2.2 2.2 0 1 1 19.5 15H15a1.5 1.5 0 0 1-.5-3Z" />
    </>
  ),
  photobooth: (
    <>
      <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4Z" />
      <circle cx="12" cy="13" r="3.2" />
    </>
  ),
};

export function ItemIcon({ kind, className = "h-5 w-5" }: { kind: ItemKind; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPHS[kind]}
    </svg>
  );
}

type IconName =
  | "undo"
  | "redo"
  | "rotate"
  | "rotateLeft"
  | "trash"
  | "copy"
  | "close"
  | "turnLeft"
  | "turnRight"
  | "fit"
  | "sound"
  | "people"
  | "spark"
  | "walk"
  | "settings"
  | "chevronUp"
  | "plus"
  | "minus"
  | "star"
  | "wand"
  | "reset";

const UI: Record<IconName, ReactNode> = {
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  redo: <path d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />,
  rotate: <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />,
  rotateLeft: <path d="M4 12a8 8 0 1 0 2.34-5.66M4 4v5h5" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  turnLeft: <path d="M3 12a9 9 0 1 0 3-6.7M3 3v6h6" />,
  turnRight: <path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" />,
  fit: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  sound: <path d="M4 9v6h4l5 4V5L8 9Zm12 0a4 4 0 0 1 0 6m2.5-9a8 8 0 0 1 0 12" />,
  people: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" />
    </>
  ),
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  walk: (
    <>
      <circle cx="12" cy="4.5" r="2" />
      <path d="M12 7.5v6m0 0-3 7m3-7 3 7M8 10.5l4-2 4 2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  chevronUp: <path d="m6 15 6-6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z" />,
  wand: <path d="m4 20 11-11M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1ZM19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6Z" />,
  reset: <path d="M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0 0 12.8 1.5M18.5 9A7 7 0 0 0 5.7 7.5" />,
};

export function Icon({
  name,
  className = "h-4 w-4",
  filled = false,
}: {
  name: IconName;
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {UI[name]}
    </svg>
  );
}
