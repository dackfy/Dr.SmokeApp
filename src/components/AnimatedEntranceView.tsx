import React from 'react'
import { Platform, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native'
import Reanimated, { Easing, FadeInDown, LinearTransition } from 'react-native-reanimated'
import { useAndroidThemeMode } from '../theme/androidAppTheme'

type AnimatedEntranceViewProps = ViewProps & {
  delay?: number
  distance?: number
  style?: StyleProp<ViewStyle>
}

export default function AnimatedEntranceView({
  children,
  delay = 0,
  distance = 12,
  style,
  ...rest
}: AnimatedEntranceViewProps) {
  const androidTheme = useAndroidThemeMode()
  if (Platform.OS !== 'android') {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    )
  }

  const motionScale =
    androidTheme.motionIntensity === 'full'
      ? 1.28
      : androidTheme.motionIntensity === 'minimal'
        ? 0.46
        : 1
  const resolvedDistance = distance * motionScale
  const enterDuration =
    androidTheme.motionIntensity === 'full'
      ? 360
      : androidTheme.motionIntensity === 'minimal'
        ? 150
        : 260
  const layoutDuration =
    androidTheme.motionIntensity === 'full'
      ? 280
      : androidTheme.motionIntensity === 'minimal'
        ? 150
        : 220
  const resolvedDelay =
    androidTheme.motionIntensity === 'full'
      ? Math.round(delay * 1.15)
      : androidTheme.motionIntensity === 'minimal'
        ? Math.round(delay * 0.4)
        : delay

  return (
    <Reanimated.View
      entering={FadeInDown.delay(resolvedDelay)
        .duration(enterDuration)
        .easing(Easing.out(Easing.cubic))
        .withInitialValues({
          opacity: 0,
          transform: [{ translateY: resolvedDistance }],
        })}
      layout={LinearTransition.duration(layoutDuration).easing(Easing.out(Easing.quad))}
      style={style}
      {...rest}>
      {children}
    </Reanimated.View>
  )
}
