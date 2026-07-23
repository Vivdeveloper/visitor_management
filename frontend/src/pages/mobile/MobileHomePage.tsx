import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { resolveMode } from "@/lib/roles";
import {
  IconApprovals,
  IconChevron,
  IconDesktop,
  IconGate,
  IconLogin,
  IconPass,
} from "@/components/ui/MobileIcons";

type Action = {
  to: string;
  title: string;
  hint: string;
  icon: ReactNode;
  tone?: "primary" | "ghost" | "default";
};

export function MobileHomePage() {
  const { user, isAuthenticated } = useAuth();
  const mode = resolveMode(user);
  const name = user?.full_name || user?.mobile || user?.user || "there";

  const actions: Action[] = [];

  if (mode === "host" || mode === "security") {
    actions.push({
      to: "/m/approvals",
      title: "Approvals",
      hint: "Review pending visitor requests",
      icon: <IconApprovals size={20} />,
    });
  }
  if (mode === "security") {
    actions.push({
      to: "/m/gate",
      title: "Gate check-in / out",
      hint: "Scan and verify at the entrance",
      icon: <IconGate size={20} />,
    });
  }
  actions.push({
    to: "/m/pass",
    title: mode === "visitor" ? "My pass" : "Pass lookup",
    hint: mode === "visitor" ? "Show your QR visitor pass" : "Find and open a visitor pass",
    icon: <IconPass size={20} />,
    tone: "primary",
  });
  if (!isAuthenticated && !user?.verified) {
    actions.push({
      to: "/m/login",
      title: "Sign in with OTP",
      hint: "Verify your mobile number",
      icon: <IconLogin size={20} />,
    });
  }
  actions.push({
    to: "/",
    title: "Open desktop app",
    hint: "Full dashboard and reports",
    icon: <IconDesktop size={20} />,
    tone: "ghost",
  });

  return (
    <section className="m-page m-home">
      <div className="m-home-hero">
        <p className="m-eyebrow">Visitor workspace</p>
        <h1>
          Hello, <span className="m-home-name">{name}</span>
        </h1>
        <p className="m-sub">Quick actions for the floor — tap to continue.</p>
      </div>

      <div className="m-actions">
        {actions.map((action, index) => (
          <Link
            key={action.to + action.title}
            className={`m-action m-action-card${action.tone ? ` ${action.tone}` : ""}`}
            to={action.to}
            style={{ animationDelay: `${0.06 + index * 0.07}s` }}
          >
            <span className="m-action-icon" aria-hidden>
              {action.icon}
            </span>
            <span className="m-action-copy">
              <span className="m-action-title">{action.title}</span>
              <span className="m-action-hint">{action.hint}</span>
            </span>
            <span className="m-action-chevron" aria-hidden>
              <IconChevron />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
