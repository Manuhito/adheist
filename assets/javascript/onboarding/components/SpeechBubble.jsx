import React from "react";

/**
 * SpeechBubble PRO (SVG) con texto encima.
 *
 * Props:
 * - width, height: tamaño total del bubble
 * - radius: radio esquinas
 * - tail: "bottom-left" | "bottom-right" | "top-left" | "top-right" | "left" | "right" | "none"
 * - tailSize: tamaño de la cola (px)
 * - fill: color fondo
 * - stroke: color borde
 * - strokeWidth
 * - padding: padding interior para el texto
 * - children: texto/HTML
 */
export default function SpeechBubble({
  width = 320,
  height = 140,
  radius = 20,
  tail = "bottom-left",
  tailSize = 22,
  fill = "#fff",
  stroke = "#111",
  strokeWidth = 3,
  padding = 18,
  style,
  className,
  children,
}) {
  // Área útil del globo sin cola
  const tailSpace = tail === "none" ? 0 : tailSize;
  const bodyX = tail === "left" ? tailSpace : 0;
  const bodyY = tail.startsWith("top") ? tailSpace : 0;
  const bodyW = width - (tail === "left" || tail === "right" ? tailSpace : 0);
  const bodyH = height - (tail.startsWith("top") || tail.startsWith("bottom") ? tailSpace : 0);

  // Cola triangular por defecto (se renderiza solo si tail !== none)
  const tailPath = getTailPath({
    tail,
    tailSize,
    width,
    height,
    bodyX,
    bodyY,
    bodyW,
    bodyH,
    radius,
  });

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width,
        height,
        ...style,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Cuerpo del globo */}
        <rect
          x={bodyX}
          y={bodyY}
          width={bodyW}
          height={bodyH}
          rx={radius}
          ry={radius}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />

        {/* Cola */}
        {tail !== "none" && (
          <path
            d={tailPath}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )}
      </svg>

      {/* Texto encima */}
      <div
        style={{
          position: "absolute",
          left: bodyX + padding,
          top: bodyY + padding,
          width: bodyW - padding * 2,
          height: bodyH - padding * 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          fontSize: 16,
          lineHeight: 1.35,
          color: "#111",
          pointerEvents: "none", // para no bloquear clicks debajo si lo necesitas
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Devuelve el path SVG de la cola según la dirección */
function getTailPath({
  tail,
  tailSize,
  width,
  height,
  bodyX,
  bodyY,
  bodyW,
  bodyH,
  radius,
}) {
  const s = tailSize;

  switch (tail) {
    case "bottom-left": {
      const x1 = bodyX + radius + 8;
      const y1 = bodyY + bodyH;
      const x2 = x1 + s;
      const y2 = y1;
      const x3 = x1 + s * 0.35;
      const y3 = y1 + s;
      return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`;
    }
    case "bottom-right": {
      const x2 = bodyX + bodyW - radius - 8;
      const y2 = bodyY + bodyH;
      const x1 = x2 - s;
      const y1 = y2;
      const x3 = x2 - s * 0.35;
      const y3 = y2 + s;
      return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`;
    }
    case "top-left": {
      const x1 = bodyX + radius + 8;
      const y1 = bodyY;
      const x2 = x1 + s;
      const y2 = y1;
      const x3 = x1 + s * 0.35;
      const y3 = y1 - s;
      return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`;
    }
    case "top-right": {
      const x2 = bodyX + bodyW - radius - 8;
      const y2 = bodyY;
      const x1 = x2 - s;
      const y1 = y2;
      const x3 = x2 - s * 0.35;
      const y3 = y2 - s;
      return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`;
    }
    case "left": {
      const x1 = bodyX;
      const y1 = bodyY + bodyH * 0.45;
      const x2 = x1;
      const y2 = y1 + s;
      const x3 = x1 - s;
      const y3 = y1 + s * 0.5;
      return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`;
    }
    case "right": {
      const x1 = bodyX + bodyW;
      const y1 = bodyY + bodyH * 0.45;
      const x2 = x1;
      const y2 = y1 + s;
      const x3 = x1 + s;
      const y3 = y1 + s * 0.5;
      return `M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} Z`;
    }
    default:
      return "";
  }
}
