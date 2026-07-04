import React from "react";
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";

export default function Wordmark({
  text = "CLOUD DRIVE",
  gradientId,
  gradientColors,
  height = 22,
  fontSize = 17,
  fontWeight = "800",
  letterSpacing = 0,
  align = "left",
  y,
}) {
  const isCentered = align === "center";

  return (
    <Svg width="100%" height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          {gradientColors.map((color, index) => (
            <Stop key={color} offset={`${(index / (gradientColors.length - 1)) * 100}%`} stopColor={color} />
          ))}
        </LinearGradient>
      </Defs>
      <SvgText
        x={isCentered ? "50%" : "0"}
        y={y}
        textAnchor={isCentered ? "middle" : undefined}
        fontSize={fontSize}
        fontWeight={fontWeight}
        fontStyle="italic"
        letterSpacing={letterSpacing}
        fontFamily="Outfit"
        fill={`url(#${gradientId})`}
      >
        {text}
      </SvgText>
    </Svg>
  );
}
