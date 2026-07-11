import React from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import GlassCard from "@components/ui/glass/GlassCard";

const GAUGE_W = 76;
const GAUGE_H = 46;
const RADIUS = 28;
const CX = GAUGE_W / 2;
const CY = 42;
// Arc sweeps 260° open at the bottom (design 12), from 220° to -40°.
const START_ANGLE = 220;
const SWEEP_DEGREES = 260;

function polarToCartesian(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + RADIUS * Math.cos(rad), y: CY - RADIUS * Math.sin(rad) };
}

function arcPath(fromDeg, toDeg) {
  const start = polarToCartesian(fromDeg);
  const end = polarToCartesian(toDeg);
  const largeArc = fromDeg - toDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * Arc gauge for CPU / memory / disk (design 12).
 * @param {string} title
 * @param {number} percent - 0..100
 * @param {string} sub - line under the gauge (e.g. "Temp: 67°C", "5.5/8.0 GB")
 * @param {string} color - arc colour
 * @param {boolean} live - show the pulsing live dot
 */
export default function HardwareGaugeCard({ title = "", percent = 0, sub = "", color, live = true }) {
  const { colors } = useTheme();
  const resolvedColor = color ?? colors.primary.DEFAULT;
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  const fillEnd = START_ANGLE - (clamped / 100) * SWEEP_DEGREES;

  return (
    <GlassCard className="flex-1 items-center py-3">
      {live ? <View className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-success" /> : null}
      <Text size="2xs" bold className="text-secondary uppercase tracking-widest mb-1">
        {title}
      </Text>
      <View className="w-[76px] h-[46px]">
        <Svg width={GAUGE_W} height={GAUGE_H}>
          <Path
            d={arcPath(START_ANGLE, START_ANGLE - SWEEP_DEGREES)}
            stroke={colors.neutral.subtle}
            strokeWidth={7}
            strokeLinecap="round"
            fill="none"
          />
          {clamped > 0 ? (
            <Path
              d={arcPath(START_ANGLE, fillEnd)}
              stroke={resolvedColor}
              strokeWidth={7}
              strokeLinecap="round"
              fill="none"
            />
          ) : null}
        </Svg>
        <View className="absolute inset-0 items-center justify-center pt-2">
          <Text size="xs" bold>
            {clamped.toFixed(1)}%
          </Text>
        </View>
      </View>
      {sub ? (
        <Text size="2xs" className="text-secondary mt-1">
          {sub}
        </Text>
      ) : null}
    </GlassCard>
  );
}
