import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/components/theme/theme-provider";

export function Skeleton({
  height = 16,
  width = "100%" as number | `${number}%`,
  borderRadius,
}: {
  height?: number;
  width?: number | `${number}%`;
  borderRadius?: number;
}) {
  const { colors, radii } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          height,
          width: width as number,
          borderRadius: borderRadius ?? radii.md,
          backgroundColor: colors.skeleton,
        },
        style,
      ]}
    />
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={72} />
      ))}
    </View>
  );
}
