type BrandLogoVariant = "full" | "mark" | "on-dark" | "icon";

type BrandLogoProps = {
  /** full = horizontal wordmark · mark/icon = square app icon · on-dark = dark-surface mark */
  variant?: BrandLogoVariant;
  className?: string;
  alt?: string;
};

function assetUrl(file: string) {
  const base = import.meta.env.BASE_URL || "/";
  return `${base}brand/${file}`;
}

/** Brand assets: light wordmark + icon; on-dark uses dark-surface assets for gate pass etc. */
export function brandLogoSrc(variant: BrandLogoVariant = "full") {
  const onDark = variant === "on-dark";
  if (variant === "full") {
    return assetUrl(onDark ? "precious-alloys-logo-dark.png" : "precious-alloys-logo-light.png");
  }
  return assetUrl(onDark ? "precious-alloys-icon-dark.png" : "precious-alloys-icon-light.png");
}

export function BrandLogo({
  variant = "full",
  className = "",
  alt = "Precious Alloys",
}: BrandLogoProps) {
  const square = variant !== "full";

  return (
    <img
      src={brandLogoSrc(variant)}
      alt={alt}
      className={`brand-logo brand-logo-${variant}${className ? ` ${className}` : ""}`}
      decoding="async"
      width={square ? 128 : 280}
      height={square ? 128 : 100}
    />
  );
}
