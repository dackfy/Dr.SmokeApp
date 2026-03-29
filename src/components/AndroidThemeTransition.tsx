import React from 'react'
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StyleSheet,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAndroidThemeMode } from '../theme/androidAppTheme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const CIRCLE_SIZE = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 1.08

export default function AndroidThemeTransition() {
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const insets = useSafeAreaInsets()
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
        duration: 320,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: true,
      }).start()

      return
    }

    if (androidTheme.transitionPhase === 'entering') {
      Animated.timing(progress, {
        toValue: 0,
        duration: 520,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
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

  const isPreviewVisible =
    androidTheme.transitionPhase === 'idle' &&
    androidTheme.previewTarget !== null
  const isTransitionVisible =
    isVisible || androidTheme.transitionPhase !== 'idle' || isPreviewVisible

  if (Platform.OS !== 'android' || !isTransitionVisible) {
    return null
  }

  const isDark = colorScheme === 'dark'
  const veilColor = isDark ? '#070A0D' : '#F4F6F8'
  const glowColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)'
  const rimColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'
  const targetMode = androidTheme.transitionTarget ?? androidTheme.mode
  const accentColor =
    targetMode === 'company'
      ? 'rgba(255,106,0,0.24)'
      : isDark
        ? 'rgba(183,244,229,0.24)'
        : 'rgba(49,95,85,0.24)'
  const accentEdgeColor =
    targetMode === 'company'
      ? 'rgba(255,140,56,0.3)'
      : isDark
        ? 'rgba(215,227,236,0.3)'
        : 'rgba(49,95,85,0.3)'
  const previewTargetMode = androidTheme.previewTarget ?? androidTheme.mode
  const previewAccentColor =
    previewTargetMode === 'company'
      ? 'rgba(255,106,0,0.18)'
      : isDark
        ? 'rgba(183,244,229,0.18)'
        : 'rgba(49,95,85,0.18)'
  const previewEdgeColor =
    previewTargetMode === 'company'
      ? 'rgba(255,140,56,0.24)'
      : isDark
        ? 'rgba(215,227,236,0.24)'
        : 'rgba(49,95,85,0.24)'
  const overscanTop = Math.max(StatusBar.currentHeight ?? 0, insets.top, 20)
  const overscanBottom = Math.max(insets.bottom, 28)
  const previewOriginX = androidTheme.previewOrigin?.x ?? SCREEN_WIDTH * 0.5
  const previewOriginY = androidTheme.previewOrigin?.y ?? SCREEN_HEIGHT * 0.78
  const transitionOriginX = androidTheme.transitionOrigin?.x ?? previewOriginX
  const transitionOriginY = androidTheme.transitionOrigin?.y ?? previewOriginY
  const previewRootOpacity = androidTheme.previewProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const previewVeilOpacity = androidTheme.previewProgress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.14, isDark ? 0.28 : 0.22],
    extrapolate: 'clamp',
  })
  const previewCircleScale = androidTheme.previewProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.01, 1.22],
    extrapolate: 'clamp',
  })
  const previewCircleOpacity = androidTheme.previewProgress.interpolate({
    inputRange: [0, 0.28, 0.75, 1],
    outputRange: [0, 0.22, 0.36, 0.42],
    extrapolate: 'clamp',
  })
  const previewRingScale = androidTheme.previewProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, 1.3],
    extrapolate: 'clamp',
  })
  const previewRingOpacity = androidTheme.previewProgress.interpolate({
    inputRange: [0, 0.24, 0.7, 1],
    outputRange: [0, 0.54, 0.22, 0],
    extrapolate: 'clamp',
  })

  const rootOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const veilOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isDark ? 0.94 : 0.98],
    extrapolate: 'clamp',
  })
  const circleScale = progress.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0.1, 1.24, 1.86],
    extrapolate: 'clamp',
  })
  const circleOpacity = progress.interpolate({
    inputRange: [0, 0.18, 0.86, 1],
    outputRange: [0, 0.42, 0.22, 0],
    extrapolate: 'clamp',
  })
  const ringScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 1.48],
    extrapolate: 'clamp',
  })
  const ringOpacity = progress.interpolate({
    inputRange: [0, 0.2, 0.74, 1],
    outputRange: [0, 0.34, 0.18, 0],
    extrapolate: 'clamp',
  })
  const glowOpacity = progress.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, isDark ? 0.16 : 0.12, isDark ? 0.08 : 0.04],
    extrapolate: 'clamp',
  })
  const glowScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1.01],
    extrapolate: 'clamp',
  })
  const softFadeOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isDark ? 0.05 : 0.03],
    extrapolate: 'clamp',
  })

  return (
    <View
      pointerEvents="none"
      style={[
        styles.host,
        {
          top: -overscanTop,
          bottom: -overscanBottom,
        },
      ]}>
      {isPreviewVisible ? (
        <Animated.View style={[styles.root, { opacity: previewRootOpacity }]}>
          <Animated.View
            style={[
              styles.veil,
              {
                backgroundColor: veilColor,
                opacity: previewVeilOpacity,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.revealCircle,
              {
                backgroundColor: previewAccentColor,
                opacity: previewCircleOpacity,
                left: previewOriginX - CIRCLE_SIZE / 2,
                top: previewOriginY + overscanTop - CIRCLE_SIZE / 2,
                transform: [{ scale: previewCircleScale }],
              },
            ]}
          />

          <Animated.View
            style={[
              styles.revealRing,
              {
                borderColor: previewEdgeColor,
                opacity: previewRingOpacity,
                left: previewOriginX - CIRCLE_SIZE * 0.92 / 2,
                top: previewOriginY + overscanTop - CIRCLE_SIZE * 0.92 / 2,
                transform: [{ scale: previewRingScale }],
              },
            ]}
          />
        </Animated.View>
      ) : null}

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
            left: transitionOriginX - CIRCLE_SIZE / 2,
            top: transitionOriginY + overscanTop - CIRCLE_SIZE / 2,
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
            left: transitionOriginX - CIRCLE_SIZE * 0.92 / 2,
            top: transitionOriginY + overscanTop - CIRCLE_SIZE * 0.92 / 2,
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
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    overflow: 'hidden',
  },
  root: {
    ...StyleSheet.absoluteFillObject,
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
  },
  revealRing: {
    position: 'absolute',
    width: CIRCLE_SIZE * 0.92,
    height: CIRCLE_SIZE * 0.92,
    borderRadius: (CIRCLE_SIZE * 0.92) / 2,
    borderWidth: 18,
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
