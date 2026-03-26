import React from 'react'
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native'
import { useAndroidThemeMode } from '../theme/androidAppTheme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const CIRCLE_SIZE = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 1.08

export default function AndroidThemeTransition() {
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const progress = React.useRef(new Animated.Value(0)).current
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    if (Platform.OS !== 'android') {
      return
    }

    if (androidTheme.transitionPhase === 'exiting') {
      setIsVisible(true)
      progress.stopAnimation()
      progress.setValue(0)

      Animated.timing(progress, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()

      return
    }

    if (androidTheme.transitionPhase === 'entering') {
      Animated.timing(progress, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsVisible(false)
        }
      })
      return
    }

    if (androidTheme.transitionPhase === 'idle') {
      progress.setValue(0)
      setIsVisible(false)
    }
  }, [androidTheme.transitionPhase, progress])

  if (Platform.OS !== 'android' || (!isVisible && androidTheme.transitionPhase === 'idle')) {
    return null
  }

  const isDark = colorScheme === 'dark'
  const veilColor = isDark ? '#070A0D' : '#F4F6F8'
  const glowColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)'
  const rimColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'
  const accentColor =
    androidTheme.mode === 'company'
      ? 'rgba(255,106,0,0.28)'
      : isDark
        ? 'rgba(183,244,229,0.22)'
        : 'rgba(49,95,85,0.18)'
  const accentEdgeColor =
    androidTheme.mode === 'company'
      ? 'rgba(255,140,56,0.36)'
      : isDark
        ? 'rgba(215,227,236,0.22)'
        : 'rgba(49,95,85,0.12)'

  const rootOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const veilOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isDark ? 0.88 : 0.94],
    extrapolate: 'clamp',
  })
  const circleScale = progress.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.16, 1.2, 1.85],
    extrapolate: 'clamp',
  })
  const circleOpacity = progress.interpolate({
    inputRange: [0, 0.18, 0.86, 1],
    outputRange: [0, 0.3, 0.16, 0],
    extrapolate: 'clamp',
  })
  const ringScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 1.55],
    extrapolate: 'clamp',
  })
  const ringOpacity = progress.interpolate({
    inputRange: [0, 0.2, 0.74, 1],
    outputRange: [0, 0.22, 0.14, 0],
    extrapolate: 'clamp',
  })
  const glowOpacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, isDark ? 0.16 : 0.12, isDark ? 0.08 : 0.04],
    extrapolate: 'clamp',
  })
  const glowScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.02],
    extrapolate: 'clamp',
  })
  const softFadeOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isDark ? 0.05 : 0.03],
    extrapolate: 'clamp',
  })

  return (
    <Animated.View pointerEvents="none" style={[styles.root, { opacity: rootOpacity }]}>
      <Animated.View
        style={[
          styles.veil,
          {
            backgroundColor: veilColor,
            opacity: veilOpacity,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.revealCircle,
          {
            backgroundColor: accentColor,
            opacity: circleOpacity,
            transform: [{ scale: circleScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.revealRing,
          {
            borderColor: accentEdgeColor,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.glowPrimary,
          {
            backgroundColor: glowColor,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.glowSecondary,
          {
            backgroundColor: glowColor,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.softFade,
          {
            opacity: softFadeOpacity,
          },
        ]}
      />

      <View
        style={[
          styles.frame,
          {
            borderColor: rimColor,
          },
        ]}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    overflow: 'hidden',
  },
  veil: {
    ...StyleSheet.absoluteFillObject,
  },
  revealCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    left: SCREEN_WIDTH * 0.5 - CIRCLE_SIZE / 2,
    top: SCREEN_HEIGHT * 0.78 - CIRCLE_SIZE / 2,
  },
  revealRing: {
    position: 'absolute',
    width: CIRCLE_SIZE * 0.92,
    height: CIRCLE_SIZE * 0.92,
    borderRadius: (CIRCLE_SIZE * 0.92) / 2,
    borderWidth: 18,
    left: SCREEN_WIDTH * 0.5 - (CIRCLE_SIZE * 0.92) / 2,
    top: SCREEN_HEIGHT * 0.78 - (CIRCLE_SIZE * 0.92) / 2,
  },
  glowPrimary: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    top: SCREEN_HEIGHT * 0.06,
    left: -SCREEN_WIDTH * 0.1,
  },
  glowSecondary: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.56,
    height: SCREEN_WIDTH * 0.56,
    borderRadius: SCREEN_WIDTH * 0.28,
    bottom: -SCREEN_WIDTH * 0.08,
    right: -SCREEN_WIDTH * 0.04,
  },
  softFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
})
