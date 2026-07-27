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
        { id: "verify" as const, title: vt(lang, "sec_verify") },
        { id: "host" as const, title: vt(lang, "sec_host") },
        { id: "pass" as const, title: vt(lang, "sec_pass") },
      ] as const,
    [lang],
  );

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
      </div>

      <section className="welcome-security-panel" aria-label="Check-in steps">
        <div className="welcome-security-tabs" role="tablist" aria-label="Check-in steps">
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
