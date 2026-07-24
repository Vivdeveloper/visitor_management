import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function baseProps({ size = 22, className, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
    ...rest,
  };
}

export function IconHome(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

export function IconCheckIn(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 10.2-5.35" />
      <path d="M16 16v6M13 19h6" />
    </svg>
  );
}

export function IconScan(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M7 4H5a1 1 0 0 0-1 1v2M17 4h2a1 1 0 0 1 1 1v2M7 20H5a1 1 0 0 1-1-1v-2M17 20h2a1 1 0 0 0 1-1v-2" />
      <rect x="8" y="8" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export function IconInside(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="9" cy="8" r="2.75" />
      <circle cx="16" cy="9" r="2.25" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M14 19a4.5 4.5 0 0 1 6.5-4" />
    </svg>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 8v4.5l3 1.5" />
    </svg>
  );
}

export function IconApprovals(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

export function IconPass(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M7 14h4" />
      <circle cx="16.5" cy="14" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconProfile(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

export function IconChevron(props: IconProps) {
  return (
    <svg {...baseProps({ size: 18, ...props })}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconLogin(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M10 17v2a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v2" />
      <path d="M15 12H3m0 0 3-3m-3 3 3 3" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      <circle cx="18" cy="4" r="3" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

export function IconUserInside(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="5" y="4" width="14" height="16" rx="3" strokeWidth="1.75" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8 17a4 4 0 0 1 8 0" />
    </svg>
  );
}

export function IconExit(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M13 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

export function IconAlertShield(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
    </svg>
  );
}

export function IconReports(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function IconMenuMore(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export type MobileTabIcon = "home" | "checkin" | "scan" | "inside" | "history" | "pass" | "reports" | "more" | "approvals";

export function MobileTabIconView({ name, size = 22 }: { name: MobileTabIcon; size?: number }) {
  switch (name) {
    case "home":
      return <IconHome size={size} />;
    case "checkin":
      return <IconCheckIn size={size} />;
    case "scan":
      return <IconScan size={size} />;
    case "inside":
      return <IconInside size={size} />;
    case "history":
      return <IconHistory size={size} />;
    case "pass":
      return <IconPass size={size} />;
    case "reports":
      return <IconReports size={size} />;
    case "more":
      return <IconMenuMore size={size} />;
    case "approvals":
      return <IconApprovals size={size} />;
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}
