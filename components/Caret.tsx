// The proofreader's caret — the brand mark (scope/docs/11-brand.md) — drawn as
// an inline SVG rather than the ‸ character: U+2038 is not in the shipped font
// subsets and is missing from many system fonts, so as text the mark would be
// left to platform fallback (a mismatched glyph, or tofu). The SVG renders
// identically everywhere, inherits the text color, and survives forced-colors
// mode via currentColor. Sized in em so it scales with the surrounding type.

export function Caret({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `caret-svg ${className}` : 'caret-svg'}
      viewBox="0 0 10 8"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M1.2 7.4 L5 1.2 L8.8 7.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
