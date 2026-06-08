"use client";

import { bandsToCssGradient, studioCss } from "@/lib/backgroundBands";

/**
 * Each option's `value` is what we pass to the server for the final
 * composite. The server knows several categories:
 *   - "studio" -> soft radial gradient (matches the AI's old natural bg)
 *   - "beach"  -> render the pixelated beach scene under the avatar
 *   - "transparent" -> leave alpha as-is in the download
 *   - any other CSS color -> flatten onto that solid color
 */
export const BACKGROUND_OPTIONS = [
  { id: "studio", label: "Studio", value: "studio", kind: "scene" as const },
  { id: "beach", label: "Beach", value: "beach", kind: "scene" as const },
  {
    id: "transparent",
    label: "None",
    value: "transparent",
    kind: "transparent" as const,
  },
  { id: "pink", label: "Hot Pink", value: "#ff006e", kind: "solid" as const },
  { id: "cyan", label: "Cyan", value: "#00f5ff", kind: "solid" as const },
  { id: "yellow", label: "Yellow", value: "#ffd60a", kind: "solid" as const },
  { id: "purple", label: "Purple", value: "#7209b7", kind: "solid" as const },
  { id: "lime", label: "Lime", value: "#9ef01a", kind: "solid" as const },
] as const;

// Backwards compatibility export: Studio.tsx imports this name.
export const BACKGROUND_COLORS = BACKGROUND_OPTIONS;

/**
 * Resolve a stored bgColor value to a CSS background string suitable
 * for the in-browser preview. The server uses the raw value at
 * download time to pick the right composite.
 */
export function bgValueToCss(value: string): string | undefined {
  if (value === "studio") return studioCss();
  if (value === "beach") return bandsToCssGradient();
  if (value === "transparent") return undefined;
  return value;
}

interface BackgroundColorPickerProps {
  selected: string;
  onSelect: (value: string) => void;
}

export function BackgroundColorPicker({
  selected,
  onSelect,
}: BackgroundColorPickerProps) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-wide">
        Background for the image shown above
      </p>
      <p className="text-xs text-muted mb-2">
        Each image can have its own. Free to change anytime.
      </p>
      <div className="flex gap-2 flex-wrap">
        {BACKGROUND_OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          // Each swatch shows what its background looks like
          const swatchStyle =
            opt.value === "studio"
              ? { background: studioCss() }
              : opt.value === "beach"
              ? { background: bandsToCssGradient() }
              : opt.kind === "transparent"
              ? {
                  background:
                    "repeating-conic-gradient(#e5e5e5 0% 25%, #ffffff 0% 50%) 50% / 12px 12px",
                }
              : { background: opt.value };

          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.value)}
              aria-label={opt.label}
              title={opt.label}
              className={`w-12 h-12 border-[3px] border-ink transition-all ${
                isSelected
                  ? "shadow-[3px_3px_0_0_#0a0a0a] translate-x-[-1px] translate-y-[-1px]"
                  : "hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0a0a0a]"
              }`}
              style={swatchStyle}
            />
          );
        })}
      </div>
    </div>
  );
}
