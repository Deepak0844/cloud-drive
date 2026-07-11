import React from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

// Theme
import { useTheme } from "@theme/useTheme";

// Components
import Text from "@components/ui/text/Text";
import GlassCard from "@components/ui/glass/GlassCard";

const SIZE = 80;
const R = 30;
const CIRC = 2 * Math.PI * R;

function Legend({ swatchClassName, label, value }) {
  return (
    <View className="flex-row items-center gap-1">
      <View className={`w-2 h-2 rounded-sm ${swatchClassName}`} />
      <Text size="2xs" className="text-secondary">
        {label}
      </Text>
      <Text size="2xs" bold>
        {value}
      </Text>
    </View>
  );
}

/**
 * Active/inactive user donut (design 12), fed by getSystemStats().user_stats.
 */
export default function UserStatusDonut({ total = 0, active = 0, inactive = 0 }) {
  const { colors } = useTheme();
  const activeFrac = total > 0 ? active / total : 0;
  const inactiveFrac = total > 0 ? inactive / total : 0;

  return (
    <GlassCard className="flex-1">
      <Text size="2xs" bold className="text-secondary uppercase tracking-widest mb-2">
        User Status
      </Text>
      <View className="items-center">
        <View className="w-20 h-20">
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.neutral.subtle} strokeWidth={10} fill="none" />
            {activeFrac > 0 ? (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={colors.success.DEFAULT}
                strokeWidth={10}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${activeFrac * CIRC} ${CIRC}`}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            ) : null}
            {inactiveFrac > 0 ? (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={colors.danger.DEFAULT}
                strokeWidth={10}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${inactiveFrac * CIRC} ${CIRC}`}
                strokeDashoffset={-activeFrac * CIRC}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            ) : null}
          </Svg>
          <View className="absolute inset-0 items-center justify-center">
            <Text size="md" bold>
              {total}
            </Text>
            <Text size="2xs" className="text-secondary uppercase">
              Total
            </Text>
          </View>
        </View>
        <View className="flex-row gap-3 mt-2">
          <Legend swatchClassName="bg-success" label="Active" value={active} />
          <Legend swatchClassName="bg-danger" label="Inactive" value={inactive} />
        </View>
      </View>
    </GlassCard>
  );
}
