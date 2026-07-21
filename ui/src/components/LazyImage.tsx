import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";

interface LazyImageProps {
  src: string;
  placeholder?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string;
  className?: string;
}

/**
 * Lazy-loaded image with a blur-up placeholder. The wrapper reserves space
 * using the real image dimensions (no layout shift) and shows the tiny
 * placeholder image, scaled up by the browser into a natural blur, until the
 * full image loads and fades in. Falls back to a pulsing skeleton when no
 * placeholder data is available.
 */
export function LazyImage({ src, placeholder, width, height, alt, className }: LazyImageProps) {
  const loaded = useSignal(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // onLoad never fires for cached images that complete before hydration
  useEffect(() => {
    if (imgRef.current?.complete) {
      loaded.value = true;
    }
  }, []);

  const hasPlaceholder = Boolean(placeholder);

  return (
    <div
      className={`relative overflow-hidden ${!hasPlaceholder && !loaded.value ? 'bg-slate-400' : ''} ${className ?? ''}`}
      style={{
        aspectRatio: width && height ? `${width} / ${height}` : '16 / 9',
        // The blur stays behind the image so it remains visible through the fade
        ...(hasPlaceholder
          ? {
              backgroundImage: `url("${placeholder}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }
          : {})
      }}
    >
      {!loaded.value && <div className="absolute inset-0 animate-pulse bg-white/10" />}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => (loaded.value = true)}
        className={`w-full h-full object-contain ${hasPlaceholder ? 'transition-opacity duration-[250ms]' : ''} ${loaded.value ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
