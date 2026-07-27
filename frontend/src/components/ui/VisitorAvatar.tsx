import { useState } from "react";
import { initials, resolveFileUrl } from "@/lib/format";

type VisitorAvatarProps = {
  name?: string;
  photo?: string | null;
  className?: string;
  size?: number;
};

export function VisitorAvatar({ name = "", photo, className = "", size }: VisitorAvatarProps) {
  const [broken, setBroken] = useState(false);
  const src = resolveFileUrl(photo);
  const showImage = Boolean(src) && !broken;
  const label = initials(name) || "?";

  return (
    <div
      className={`vm-visitor-avatar${showImage ? " has-photo" : ""} ${className}`.trim()}
      style={size ? { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.34)) } : undefined}
      aria-hidden
    >
      {showImage ? (
        <img
          src={src!}
          alt=""
          className="vm-visitor-avatar-img"
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{label}</span>
      )}
    </div>
  );
}
