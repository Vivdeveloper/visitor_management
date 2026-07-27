import { initials, resolveFileUrl } from "@/lib/format";

type ClickablePhotoPreviewProps = {
  src?: string | null;
  name?: string;
  emptyLabel: string;
  alt: string;
  className?: string;
  frameClassName?: string;
  onPreview: (src: string) => void;
};

export function ClickablePhotoPreview({
  src,
  name = "",
  emptyLabel,
  alt,
  className = "vm-photo-preview",
  frameClassName = "",
  onPreview,
}: ClickablePhotoPreviewProps) {
  const resolved = resolveFileUrl(src);
  const canPreview = Boolean(resolved);

  return (
    <button
      type="button"
      className={`${className}${canPreview ? " is-clickable" : ""} ${frameClassName}`.trim()}
      disabled={!canPreview}
      onClick={() => {
        if (resolved) onPreview(resolved);
      }}
      aria-label={canPreview ? `Preview ${alt}` : emptyLabel}
    >
      {resolved ? (
        <img src={resolved} alt={alt} />
      ) : name ? (
        <span className="vm-photo-preview-fallback">{initials(name)}</span>
      ) : (
        <span>{emptyLabel}</span>
      )}
      {canPreview ? <span className="vm-photo-preview-zoom" aria-hidden>⤢</span> : null}
    </button>
  );
}
