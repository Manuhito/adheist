import React from "react";

/**
 * SpeechBubble PRO (CSS-based) that adapts to content size.
 */
export default function SpeechBubble({
  fill = "#fff",
  children,
  className = "",
  tail = "bottom-right" // We focus on bottom-right as used in Mascot
}) {
  return (
    <div
      className={`relative rounded-2xl p-5 shadow-sm ${className}`}
      style={{
        backgroundColor: fill,
        width: "fit-content",
        transition: "all 0.2s ease-out"
      }}
    >
      <div className="relative z-10">
        {children}
      </div>

      {/* Tail - SVG absolute positioned */}
      {tail === "bottom-right" && (
        <div
          className="absolute"
          style={{
            bottom: "-14px", // Height of the tail
            right: "24px",   // Offset from right edge
            width: "24px",
            height: "14px",
            color: fill
          }}
        >
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 24 14"
            preserveAspectRatio="none"
            style={{ display: "block" }}
          >
            <path
              d="M0 0 L24 0 L16 14 Z"
              fill={fill}
            />
          </svg>
        </div>
      )}
    </div>
  );
}
