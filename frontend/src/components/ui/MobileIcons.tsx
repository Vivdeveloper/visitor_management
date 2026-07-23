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

export function IconApprovals(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

export function IconGate(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M3 7v10a2 2 0 0 0 2 2h4" />
      <path d="M21 7v10a2 2 0 0 1-2 2h-4" />
      <path d="M8 12h8" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
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

export function IconDesktop(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
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

export type MobileTabIcon = "home" | "approvals" | "gate" | "pass" | "profile";

export function MobileTabIconView({ name, size = 22 }: { name: MobileTabIcon; size?: number }) {
  switch (name) {
    case "home":
      return <IconHome size={size} />;
    case "approvals":
      return <IconApprovals size={size} />;
    case "gate":
      return <IconGate size={size} />;
    case "pass":
      return <IconPass size={size} />;
    case "profile":
      return <IconProfile size={size} />;
    default: {
      const _exhaustive: never = name;
      return _exhaustive;
    }
  }
}
