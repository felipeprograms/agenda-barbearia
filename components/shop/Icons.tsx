/** Ícones de linha usados na página pública. Todos usam a cor do texto ao redor (currentColor). */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export type IconName = "scissors" | "comb" | "clock" | "pin" | "phone" | "check" | "bell" | "link" | "wallet";

export function Icon({ name, className }: { name: IconName; className?: string }) {
  switch (name) {
    case "scissors":
      return (
        <svg {...base} className={className}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M8.1 8.1 20 20M8.1 15.9 20 4" />
        </svg>
      );
    case "comb":
      return (
        <svg {...base} className={className}>
          <rect x="3" y="5" width="18" height="6" rx="1.5" />
          <path d="M6 11v7M9.5 11v7M13 11v7M16.5 11v7" />
        </svg>
      );
    case "clock":
      return (
        <svg {...base} className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.5 2" />
        </svg>
      );
    case "pin":
      return (
        <svg {...base} className={className}>
          <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      );
    case "phone":
      return (
        <svg {...base} className={className}>
          <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...base} className={className}>
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
          <path d="M10 20.5a2 2 0 0 0 4 0" />
        </svg>
      );
    case "link":
      return (
        <svg {...base} className={className}>
          <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
          <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...base} className={className}>
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
          <rect x="4" y="8" width="16" height="11" rx="2" />
          <circle cx="16" cy="13.5" r="1.2" />
        </svg>
      );
    case "check":
      return (
        <svg {...base} className={className}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12.5 2.8 2.8L16 9.5" />
        </svg>
      );
  }
}
