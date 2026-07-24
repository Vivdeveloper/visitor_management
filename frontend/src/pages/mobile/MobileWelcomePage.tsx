import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { PwaInstallButton } from "@/components/ui/PwaInstallButton";
import { JourneyLangSwitcher } from "@/components/checkin/JourneyLangSwitcher";
import { type VisitorLang, vt } from "@/i18n/visitorJourney";

type VisitorWelcomePanelProps = {
  lang: VisitorLang;
  onLangChange: (lang: VisitorLang) => void;
  onGetStarted: () => void;
};

/** Add Visitor flow — light welcome splash with official brand wordmark. */
export function VisitorWelcomePanel({ lang, onLangChange, onGetStarted }: VisitorWelcomePanelProps) {
  const navigate = useNavigate();
  const [activePoint, setActivePoint] = useState<"verify" | "host" | "pass">("verify");

  const securityPoints = useMemo(
    () =>
      [
        { id: "verify" as const, title: vt(lang, "sec_verify"), detail: vt(lang, "sec_verify_detail") },
        { id: "host" as const, title: vt(lang, "sec_host"), detail: vt(lang, "sec_host_detail") },
        { id: "pass" as const, title: vt(lang, "sec_pass"), detail: vt(lang, "sec_pass_detail") },
      ] as const,
    [lang],
  );

  const active = securityPoints.find((p) => p.id === activePoint) || securityPoints[0];

  return (
    <div className="welcome-page welcome-splash welcome-in-flow welcome-light" lang={lang}>
      <div className="welcome-top-row">
        <button
          type="button"
          className="welcome-home-btn"
          onClick={() => navigate("/")}
          aria-label={vt(lang, "back_home")}
          title={vt(lang, "back_home")}
        >
          ‹ {vt(lang, "back_home")}
        </button>
      </div>

      <header className="welcome-brand">
        <BrandLogo variant="full" className="welcome-wordmark" alt="Precious Alloys" />
        <p className="welcome-brand-tag">{vt(lang, "brand_tag")}</p>
      </header>

      <div className="welcome-copy">
        <h1 className="welcome-title">{vt(lang, "welcome_title")}</h1>
        <p className="welcome-subtitle">{vt(lang, "welcome_subtitle")}</p>
      </div>

      <section className="welcome-security-panel" aria-label="Security priorities">
        <div className="welcome-security-head">
          <div className="welcome-security-mark" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <path
                d="M12 3 5 6.5v5.2c0 4.1 2.8 7.9 7 8.8 4.2-.9 7-4.7 7-8.8V6.5L12 3Z"
                fill="currentColor"
              />
              <path
                d="m9.2 12.1 1.9 1.9 3.7-3.8"
                stroke="#FFFFFF"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="welcome-msg-strong">{vt(lang, "security_priority")}</p>
            <p className="welcome-msg-sub">{vt(lang, "security_tap")}</p>
          </div>
        </div>

        <div className="welcome-security-tabs" role="tablist" aria-label="Security steps">
          {securityPoints.map((point) => {
            const selected = point.id === activePoint;
            return (
              <button
                key={point.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`welcome-security-tab${selected ? " is-active" : ""}`}
                onClick={() => setActivePoint(point.id)}
              >
                {point.title}
              </button>
            );
          })}
        </div>

        <div className="welcome-security-body" role="tabpanel">
          <p className="welcome-security-detail">{active.detail}</p>
          <div className="welcome-security-meter" aria-hidden>
            {securityPoints.map((point) => (
              <span
                key={point.id}
                className={`welcome-security-meter-seg${point.id === activePoint ? " is-on" : ""}`}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="welcome-actions">
        <button type="button" className="welcome-cta" onClick={onGetStarted}>
          <span className="welcome-cta-label">{vt(lang, "get_started")}</span>
          <span className="welcome-cta-arrow" aria-hidden>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>
        <PwaInstallButton variant="welcome" />
      </div>

      <JourneyLangSwitcher lang={lang} onChange={onLangChange} />
    </div>
  );
}
