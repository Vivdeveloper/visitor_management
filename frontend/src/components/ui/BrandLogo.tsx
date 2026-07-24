import { useTheme, type ThemeMode } from "@/context/ThemeContext";

type BrandLogoVariant = "full" | "mark" | "on-dark" | "icon";

type BrandLogoProps = {
  /** full = horizontal wordmark · mark/icon = square app icon · on-dark = dark-surface mark */
  variant?: BrandLogoVariant;
  /** Override app theme (useful for forced surfaces). */
  appearance?: ThemeMode;
  className?: string;
  alt?: string;
};

function assetUrl(file: string) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}brand/${file}`;
}

function effectiveAppearance(
  variant: BrandLogoVariant,
  appearance: ThemeMode | undefined,
  theme: ThemeMode,
): ThemeMode {
  if (variant === "on-dark") return "dark";
  return appearance ?? theme;
}

/** Brand assets: light/dark wordmark + square icon pairs. */
export function brandLogoSrc(
  variant: BrandLogoVariant = "full",
  appearance: ThemeMode = "light",
) {
  const mode = variant === "on-dark" ? "dark" : appearance;
  if (variant === "full") {
    return assetUrl(
      mode === "dark" ? "precious-alloys-logo-dark.png" : "precious-alloys-logo-light.png",
    );
  }
  return assetUrl(
    mode === "dark" ? "precious-alloys-icon-dark.png" : "precious-alloys-icon-light.png",
  );
}

export function BrandLogo({
  variant = "full",
  appearance,
  className = "",
  alt = "Precious Alloys",
}: BrandLogoProps) {
  const { theme } = useTheme();
  const mode = effectiveAppearance(variant, appearance, theme);
  const square = variant !== "full";

  return (
    <img
      src={brandLogoSrc(variant, mode)}
      alt={alt}
      className={`brand-logo brand-logo-${variant}${className ? ` ${className}` : ""}`}
      decoding="async"
      width={square ? 128 : 280}
      height={square ? 128 : 100}
    />
  );
}
