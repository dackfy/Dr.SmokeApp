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
import LinearGradient from 'react-native-linear-gradient'
import { useAndroidThemeMode } from '../theme/androidAppTheme'
import {
  getAndroidCompanyPalette,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function AndroidThemeTransition() {
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const progress = React.useRef(new Animated.Value(0)).current
  const sweep = React.useRef(new Animated.Value(0)).current
  const [isVisible, setIsVisible] = React.useState(false)

  const palette =
    androidTheme.mode === 'company'
      ? getAndroidCompanyPalette()
      : getAndroidThemePalette(colorScheme === 'dark')

  React.useEffect(() => {
    if (Platform.OS !== 'android') {
      return
    }

    if (androidTheme.transitionPhase === 'exiting') {
      setIsVisible(true)
      progress.stopAnimation()
      sweep.stopAnimation()
      sweep.setValue(0)

      Animated.parallel([
        Animated.timing(progress, {
          toValue: 1,
          duration: 320,
          easing: Easing.bezier(0.16, 0.92, 0.28, 1),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 1,
          duration: 620,
          easing: Easing.bezier(0.16, 0.86, 0.22, 1),
          useNativeDriver: true,
        }),
      ]).start()

      return
    }

    if (androidTheme.transitionPhase === 'entering') {
      Animated.parallel([
        Animated.timing(progress, {
          toValue: 0,
          duration: 520,
          easing: Easing.bezier(0.2, 0.02, 0.16, 1),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsVisible(false)
        }
      })
      return
    }

    if (androidTheme.transitionPhase === 'idle') {
      progress.setValue(0)
      sweep.setValue(0)
      setIsVisible(false)
    }
  }, [androidTheme.transitionPhase, progress, sweep])

  if (Platform.OS !== 'android' || (!isVisible && androidTheme.transitionPhase === 'idle')) {
    return null
  }

  const overlayOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const veilOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.16],
    extrapolate: 'clamp',
  })
  const glowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.14],
    extrapolate: 'clamp',
  })
  const glowScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.03],
    extrapolate: 'clamp',
  })
  const sweepTranslateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH * 0.7, SCREEN_WIDTH * 1.15],
    extrapolate: 'clamp',
  })
  const sweepOpacity = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0.085, 0.04],
    extrapolate: 'clamp',
  })

  return (
    <Animated.View pointerEvents="none" style={[styles.root, { opacity: overlayOpacity }]}>
      <Animated.View
        style={[
          styles.veil,
          {
            backgroundColor: String(palette.background),
            opacity: veilOpacity,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.glowOrb,
          {
            backgroundColor: String(palette.primary),
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.glowOrbSecondary,
          {
            backgroundColor: String(palette.primaryStrong),
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.sweepWrap,
          {
            opacity: sweepOpacity,
            transform: [{ translateX: sweepTranslateX }, { rotate: '-14deg' }],
          },
        ]}>
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.14)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.sweep}
        />
      </Animated.View>

      <View
        style={[
          styles.frame,
          {
            borderColor: String(palette.outlineVariant),
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
  glowOrb: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_WIDTH * 0.9,
    borderRadius: SCREEN_WIDTH * 0.45,
    top: SCREEN_HEIGHT * 0.08,
    left: -SCREEN_WIDTH * 0.18,
  },
  glowOrbSecondary: {
    position: 'absolute',
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    bottom: -SCREEN_WIDTH * 0.14,
    right: -SCREEN_WIDTH * 0.08,
  },
  sweepWrap: {
    position: 'absolute',
    top: -SCREEN_HEIGHT * 0.12,
    bottom: -SCREEN_HEIGHT * 0.12,
    width: SCREEN_WIDTH * 0.5,
  },
  sweep: {
    flex: 1,
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
  },
})
