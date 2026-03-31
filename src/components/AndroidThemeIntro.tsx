import React from 'react'
import {
  Animated,
  Easing,
  type GestureResponderEvent,
  Platform,
  PlatformColor,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAndroidThemeMode } from '../theme/androidAppTheme'
import {
  androidLightImpact,
  androidPeakImpact,
} from '../utils/androidHaptics'
import {
  getAndroidCompanyPalette,
  getAndroidStatusBarStyle,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors'

type ThemeMode = 'company' | 'material'
const ambientTeeth = Array.from({ length: 22 }, (_, index) => index)

export default function AndroidThemeIntro() {
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const progress = React.useRef(new Animated.Value(0)).current
  const previewPulse = React.useRef(new Animated.Value(1)).current
  const footerPulse = React.useRef(new Animated.Value(1)).current
  const selectionPulse = React.useRef(new Animated.Value(0)).current
  const revealProgress = React.useRef(new Animated.Value(0)).current
  const revealFade = React.useRef(new Animated.Value(0)).current
  const ambienceProgress = React.useRef(new Animated.Value(0)).current
  const orbitRotateA = React.useRef(new Animated.Value(0)).current
  const orbitRotateB = React.useRef(new Animated.Value(0)).current
  const [selectedMode, setSelectedMode] = React.useState<ThemeMode>(androidTheme.mode)
  const [isCompleting, setIsCompleting] = React.useState(false)
  const [revealTarget, setRevealTarget] = React.useState<ThemeMode>('material')
  const [revealOrigin, setRevealOrigin] = React.useState({ x: 0, y: 0 })
  const [rootSize, setRootSize] = React.useState({ width: 1, height: 1 })

  React.useEffect(() => {
    if (!androidTheme.shouldShowIntro || Platform.OS !== 'android') {
      return
    }

    setSelectedMode(androidTheme.mode)
    progress.setValue(0)
    ambienceProgress.setValue(0)
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 1,
        duration: 520,
        easing: Easing.bezier(0.2, 0.88, 0.24, 1),
        useNativeDriver: true,
      }),
      Animated.timing(ambienceProgress, {
        toValue: 1,
        duration: 760,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start()
  }, [ambienceProgress, androidTheme.mode, androidTheme.shouldShowIntro, progress])

  React.useEffect(() => {
    if (!androidTheme.shouldShowIntro || Platform.OS !== 'android') {
      return
    }

    orbitRotateA.setValue(0)
    orbitRotateB.setValue(0)

    const loopA = Animated.loop(
      Animated.timing(orbitRotateA, {
        toValue: 1,
        duration: 24000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )
    const loopB = Animated.loop(
      Animated.timing(orbitRotateB, {
        toValue: 1,
        duration: 32000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    )

    loopA.start()
    loopB.start()

    return () => {
      loopA.stop()
      loopB.stop()
    }
  }, [androidTheme.shouldShowIntro, orbitRotateA, orbitRotateB])

  React.useEffect(() => {
    if (!androidTheme.shouldShowIntro || Platform.OS !== 'android') {
      return
    }

    previewPulse.setValue(0.985)
    footerPulse.setValue(0.97)

    Animated.parallel([
      Animated.spring(previewPulse, {
        toValue: 1,
        stiffness: 220,
        damping: 16,
        mass: 0.72,
        useNativeDriver: true,
      }),
      Animated.spring(footerPulse, {
        toValue: 1,
        stiffness: 210,
        damping: 17,
        mass: 0.78,
        useNativeDriver: true,
      }),
    ]).start()
  }, [androidTheme.shouldShowIntro, footerPulse, previewPulse, selectedMode])

  if (Platform.OS !== 'android' || !androidTheme.shouldShowIntro) {
    return null
  }

  const supportsSystemPalette = Number(Platform.Version) >= 31
  const materialPalette = getAndroidThemePalette(colorScheme === 'dark', androidTheme.contrastMode)
  const companyPalette = getAndroidCompanyPalette()
  const materialSystemAccent = supportsSystemPalette
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_accent1_300'
          : '@android:color/system_accent1_500',
      )
    : materialPalette.primary
  const materialSystemAccentStrong = supportsSystemPalette
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_accent1_100'
          : '@android:color/system_accent1_700',
      )
    : materialPalette.primaryStrong
  const materialSystemBackground = supportsSystemPalette
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_neutral1_900'
          : '@android:color/system_neutral1_10',
      )
    : materialPalette.background
  const materialSystemBackgroundSecondary = supportsSystemPalette
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_accent1_900'
          : '@android:color/system_accent1_50',
      )
    : materialPalette.primaryContainer
  const materialSystemSurface = supportsSystemPalette
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_neutral1_800'
          : '@android:color/system_neutral1_0',
      )
    : materialPalette.surfaceRaised
  const materialSystemSurfaceMuted = supportsSystemPalette
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_neutral2_800'
          : '@android:color/system_neutral2_50',
      )
    : materialPalette.surfaceMuted
  const materialSystemOutline = supportsSystemPalette
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_neutral2_700'
          : '@android:color/system_neutral2_200',
      )
    : materialPalette.outlineVariant
  const materialSystemText = supportsSystemPalette
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_neutral1_50'
          : '@android:color/system_neutral1_900',
      )
    : materialPalette.onSurface
  const materialSystemMutedText = supportsSystemPalette
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_neutral2_200'
          : '@android:color/system_neutral2_700',
      )
    : materialPalette.onSurfaceMuted
  const materialSystemContainer = supportsSystemPalette
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_accent1_800'
          : '@android:color/system_accent1_100',
      )
    : materialPalette.primaryContainer
  const materialSystemContainerStrong = supportsSystemPalette
    ? PlatformColor(
        colorScheme === 'dark'
          ? '@android:color/system_accent1_700'
          : '@android:color/system_accent1_200',
      )
    : materialPalette.primaryContainerStrong
  const materialPreviewAccent = String(
    colorScheme === 'dark' ? materialPalette.primaryStrong : materialPalette.primary,
  )
  const materialOptionSurfaceMuted = materialSystemSurfaceMuted
  const materialOptionOutline = materialSystemOutline
  const materialOptionText = materialSystemText
  const materialOptionMutedText = materialSystemMutedText
  const materialOptionAccent = materialSystemAccent
  const materialOptionAccentStrong = materialSystemAccentStrong
  const materialOptionContainerStrong = materialSystemContainerStrong
  const activeBackground =
    selectedMode === 'company'
      ? String(companyPalette.background)
      : colorScheme === 'dark'
        ? '#0B1020'
        : '#EDF3FF'
  const activeAccentStrong =
    selectedMode === 'company' ? '#FF8C38' : materialPreviewAccent
  const activeBackgroundColorValue =
    selectedMode === 'company' ? companyPalette.background : materialSystemBackground
  const activeBackgroundSecondaryColorValue =
    selectedMode === 'company'
      ? companyPalette.surface
      : materialSystemBackgroundSecondary
  const activeSurfaceColorValue =
    selectedMode === 'company' ? companyPalette.surfaceRaised : materialSystemSurface
  const activeSurfaceMutedColorValue =
    selectedMode === 'company' ? companyPalette.surface : materialSystemSurfaceMuted
  const activeOutlineColorValue =
    selectedMode === 'company' ? companyPalette.outlineVariant : materialSystemOutline
  const activeTextColorValue =
    selectedMode === 'company' ? companyPalette.onSurface : materialSystemText
  const activeMutedTextColorValue =
    selectedMode === 'company' ? companyPalette.onSurfaceMuted : materialSystemMutedText
  const activeContainerColorValue =
    selectedMode === 'company' ? companyPalette.primaryContainer : materialSystemContainer
  const activeContainerStrongColorValue =
    selectedMode === 'company'
      ? companyPalette.primaryContainerStrong
      : materialSystemContainerStrong
  const activeAccentColorValue =
    selectedMode === 'company' ? companyPalette.primary : materialSystemAccent
  const activeAccentStrongColorValue =
    selectedMode === 'company'
      ? companyPalette.primaryStrong
      : materialSystemAccentStrong
  const activeOnPrimary =
    selectedMode === 'company'
      ? '#FFFFFF'
      : colorScheme === 'dark'
        ? '#08120F'
        : '#FFFFFF'
  const statusBarStyle = getAndroidStatusBarStyle(activeBackground)
  const ambientGlowColor =
    selectedMode === 'company'
      ? 'rgba(255,106,0,0.22)'
      : colorScheme === 'dark'
        ? 'rgba(167,199,255,0.26)'
        : 'rgba(69,123,255,0.18)'
  const ambientGlowStrongColor =
    selectedMode === 'company'
      ? 'rgba(255,140,56,0.18)'
      : colorScheme === 'dark'
        ? 'rgba(221,233,255,0.16)'
        : 'rgba(98,142,255,0.14)'

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [42, 0],
    extrapolate: 'clamp',
  })
  const sheetOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const sheetScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
    extrapolate: 'clamp',
  })
  const continueScale = footerPulse.interpolate({
    inputRange: [0.97, 1],
    outputRange: [0.985, 1],
    extrapolate: 'clamp',
  })
  const continueOpacity = footerPulse.interpolate({
    inputRange: [0.97, 1],
    outputRange: [0.88, 1],
    extrapolate: 'clamp',
  })
  const ambientTopStyle = {
    opacity: ambienceProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateY: ambienceProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [-22, 0],
          extrapolate: 'clamp',
        }),
      },
      {
        scale: ambienceProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
          extrapolate: 'clamp',
        }),
      },
    ],
  }
  const ambientBottomStyle = {
    opacity: ambienceProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      {
        translateY: ambienceProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [26, 0],
          extrapolate: 'clamp',
        }),
      },
      {
        scale: ambienceProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
          extrapolate: 'clamp',
        }),
      },
    ],
  }
  const backgroundSecondaryOpacity = ambienceProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12, 0.3],
    extrapolate: 'clamp',
  })

  const optionData: Array<{
    mode: ThemeMode
    eyebrow: string
    title: string
    badge: string
    description: string
  }> = [
    {
      mode: 'company',
      eyebrow: 'Фирменный стиль',
      title: 'Код компании',
      badge: 'Черный и оранжевый',
      description:
        'Контрастный интерфейс с плотными карточками и фирменным оранжевым акцентом.',
    },
    {
      mode: 'material',
      eyebrow: 'Системная тема',
      title: 'Material You',
      badge: colorScheme === 'dark' ? 'Под твою темную тему' : 'Под твою светлую тему',
      description:
        'Подстраивается под системную тему Android и использует системный акцент без резких цветов.',
    },
  ]

  const renderLivePreview = () => (
    <Animated.View
      style={[
        styles.previewShell,
        {
          backgroundColor: activeSurfaceColorValue,
          borderColor: activeOutlineColorValue,
          transform: [
            {
              scale: Animated.multiply(
                previewPulse,
                selectionPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.01],
                  extrapolate: 'clamp',
                }),
              ),
            },
            {
              translateY: selectionPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -4],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}>
      <View style={styles.previewTopRow}>
        <View
          style={[
            styles.previewChip,
            {
              backgroundColor:
                selectedMode === 'company'
                  ? String(companyPalette.primaryContainer)
                  : activeContainerStrongColorValue,
              borderColor:
                selectedMode === 'company'
                  ? '#503016'
                  : activeOutlineColorValue,
            },
          ]}>
          <Text
            style={[
              styles.previewChipText,
              {
                color:
                  selectedMode === 'company' ? activeAccentStrong : activeAccentStrongColorValue,
              },
            ]}>
            {selectedMode === 'company' ? 'Код компании' : 'Material You'}
          </Text>
        </View>
        <View
          style={[
            styles.previewAvatar,
            { backgroundColor: activeContainerColorValue },
          ]}>
          <Text
            style={[
              styles.previewAvatarText,
              {
                color:
                  selectedMode === 'company' ? activeAccentStrong : activeTextColorValue,
              },
            ]}>
            D
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.previewHeroCard,
          {
            backgroundColor: activeSurfaceMutedColorValue,
            borderColor: activeOutlineColorValue,
          },
        ]}>
        <View
          style={[
            styles.previewBadge,
            {
              backgroundColor:
                selectedMode === 'company'
                  ? String(companyPalette.closedBadge)
                  : activeContainerStrongColorValue,
              borderColor:
                selectedMode === 'company'
                  ? String(companyPalette.closedBadgeBorder)
                  : activeOutlineColorValue,
            },
          ]}>
          <Text
            style={[
              styles.previewBadgeText,
              {
                color:
                  selectedMode === 'company'
                    ? String(companyPalette.primaryStrong)
                    : activeAccentStrongColorValue,
              },
            ]}>
            {selectedMode === 'company' ? 'Фирменный режим' : 'Системный режим'}
          </Text>
        </View>
        <View
          style={[
            styles.previewLineLong,
            { backgroundColor: activeTextColorValue },
          ]}
        />
        <View
          style={[
            styles.previewLineMedium,
            { backgroundColor: activeMutedTextColorValue },
          ]}
        />
      </View>

      <View style={styles.previewBottomRow}>
        <View
          style={[
            styles.previewMiniCard,
            {
              backgroundColor: activeSurfaceMutedColorValue,
              borderColor: activeOutlineColorValue,
            },
          ]}>
          <View style={[styles.previewMiniDot, { backgroundColor: activeAccentColorValue }]} />
          <View
            style={[
              styles.previewMiniLineWide,
              { backgroundColor: activeTextColorValue },
            ]}
          />
        </View>
        <View
          style={[
            styles.previewMiniCard,
            {
              backgroundColor:
                selectedMode === 'company'
                  ? String(companyPalette.primaryContainer)
                  : activeContainerStrongColorValue,
              borderColor: activeOutlineColorValue,
            },
          ]}>
          <View
            style={[
              styles.previewMiniLineWide,
              {
                backgroundColor:
                  selectedMode === 'company'
                    ? '#FFFFFF'
                    : activeAccentStrongColorValue,
              },
            ]}
          />
          <View
            style={[
              styles.previewMiniLineShort,
              { backgroundColor: activeMutedTextColorValue },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  )
  const selectedOption = optionData.find(option => option.mode === selectedMode) ?? optionData[0]
  const animateReveal = (mode: ThemeMode, persist = false) => {
    setRevealTarget(mode)
    revealProgress.stopAnimation()
    revealFade.stopAnimation()
    revealProgress.setValue(0)
    revealFade.setValue(0)

    if (persist) {
      Animated.parallel([
        Animated.timing(revealProgress, {
          toValue: 1,
          duration: 760,
          easing: Easing.bezier(0.16, 0.92, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(revealFade, {
          toValue: 1,
          duration: 760,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start()
      return
    }

    Animated.sequence([
      Animated.parallel([
        Animated.timing(revealProgress, {
          toValue: 1,
          duration: 620,
          easing: Easing.bezier(0.18, 0.82, 0.22, 1),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(revealFade, {
            toValue: 0.6,
            duration: 300,
            easing: Easing.bezier(0.2, 0.84, 0.24, 1),
            useNativeDriver: true,
          }),
          Animated.timing(revealFade, {
            toValue: 0,
            duration: 340,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start()
  }

  const handleSelectPressIn = (mode: ThemeMode, event: GestureResponderEvent) => {
    if (mode === selectedMode || isCompleting) {
      return
    }

    const { pageX, pageY } = event.nativeEvent
    setRevealOrigin({ x: pageX, y: pageY })
  }

  const handleSelectMode = (mode: ThemeMode) => {
    if (mode === selectedMode || isCompleting) {
      return
    }

    androidLightImpact()
    selectionPulse.stopAnimation()
    selectionPulse.setValue(0)
    Animated.sequence([
      Animated.timing(selectionPulse, {
        toValue: 1,
        duration: 240,
        easing: Easing.bezier(0.2, 0.88, 0.24, 1),
        useNativeDriver: true,
      }),
      Animated.timing(selectionPulse, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start()
    animateReveal(mode)
    setSelectedMode(mode)
  }

  const handleComplete = () => {
    if (isCompleting) {
      return
    }

    androidPeakImpact()
    setIsCompleting(true)
    animateReveal(selectedMode, true)
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(footerPulse, {
        toValue: 0.94,
        duration: 190,
        useNativeDriver: true,
      }),
    ]).start(() => {
      androidTheme.completeIntro(selectedMode)
      setIsCompleting(false)
    })
  }

  const revealAccent =
    revealTarget === 'company' ? '#FF6A00' : materialOptionAccent
  const revealRadius = Math.max(
    Math.hypot(revealOrigin.x, revealOrigin.y),
    Math.hypot(rootSize.width - revealOrigin.x, revealOrigin.y),
    Math.hypot(revealOrigin.x, rootSize.height - revealOrigin.y),
    Math.hypot(rootSize.width - revealOrigin.x, rootSize.height - revealOrigin.y),
    1,
  )
  const revealSize = revealRadius * 2
  const orbitRotationA = orbitRotateA.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })
  const orbitRotationB = orbitRotateB.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  })
  const topOrbitSize = Math.max(rootSize.width * 0.88, 320)
  const topOrbitCenterX = rootSize.width * 0.78
  const topOrbitCenterY = topOrbitSize * 0.16
  const topOrbitLeft = topOrbitCenterX - topOrbitSize / 2
  const topOrbitTop = topOrbitCenterY - topOrbitSize / 2
  const topOrbitCoreSize = topOrbitSize * 0.62
  const topOrbitRingSize = topOrbitSize * 0.76

  const bottomOrbitSize = Math.max(rootSize.width * 1.16, 380)
  const bottomOrbitCenterX = rootSize.width * 0.14
  const bottomOrbitCenterY = rootSize.height * 1.08
  const bottomOrbitLeft = bottomOrbitCenterX - bottomOrbitSize / 2
  const bottomOrbitTop = bottomOrbitCenterY - bottomOrbitSize / 2
  const bottomOrbitRingSize = bottomOrbitSize * 0.88

  return (
    <View
      style={styles.root}
      onLayout={event => {
        const { width, height } = event.nativeEvent.layout
        setRootSize({ width, height })
      }}>
      <View style={[styles.backgroundBase, { backgroundColor: activeBackgroundColorValue }]} />
      <Animated.View
        style={[
          styles.backgroundSecondary,
          {
            backgroundColor: activeBackgroundSecondaryColorValue,
            opacity: backgroundSecondaryOpacity,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientOrbit,
          {
            width: topOrbitSize,
            height: topOrbitSize,
            left: topOrbitLeft,
            top: topOrbitTop,
          },
          {
            transform: [
              ...ambientTopStyle.transform,
              { rotate: orbitRotationA },
            ],
            opacity: ambientTopStyle.opacity,
          },
        ]}
      >
        <View
          style={[
            styles.ambientOrbitCore,
            {
              width: topOrbitCoreSize,
              height: topOrbitCoreSize,
              borderRadius: topOrbitCoreSize / 2,
              backgroundColor: ambientGlowColor,
            },
          ]}
        />
        <View
          style={[
            styles.ambientOrbitRing,
            {
              width: topOrbitRingSize,
              height: topOrbitRingSize,
              borderRadius: topOrbitRingSize / 2,
              borderColor: ambientGlowStrongColor,
            },
          ]}
        />
        {ambientTeeth.map(index => {
          const angle = (Math.PI * 2 * index) / ambientTeeth.length
          const degrees = (index / ambientTeeth.length) * 360
          if (degrees < 110 || degrees > 255) {
            return null
          }
          const radius = topOrbitSize * 0.385
          const segmentWidth = 18
          const segmentHeight = 5
          return (
            <View
              key={`orbit-top-${index}`}
              style={[
                styles.ambientOrbitTooth,
                {
                  backgroundColor: ambientGlowStrongColor,
                  width: segmentWidth,
                  height: segmentHeight,
                  borderRadius: segmentHeight / 2,
                  left:
                    topOrbitSize / 2 - segmentWidth / 2 + Math.cos(angle) * radius,
                  top:
                    topOrbitSize / 2 - segmentHeight / 2 + Math.sin(angle) * radius,
                  transform: [{ rotate: `${degrees + 90}deg` }],
                },
              ]}
            />
          )
        })}
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientOrbit,
          {
            width: bottomOrbitSize,
            height: bottomOrbitSize,
            left: bottomOrbitLeft,
            top: bottomOrbitTop,
          },
          {
            transform: [
              ...ambientBottomStyle.transform,
              { rotate: orbitRotationB },
            ],
            opacity: ambientBottomStyle.opacity,
          },
        ]}
      >
        <View
          style={[
            styles.ambientOrbitRingSmall,
            {
              width: bottomOrbitRingSize,
              height: bottomOrbitRingSize,
              borderRadius: bottomOrbitRingSize / 2,
              borderColor: ambientGlowColor,
            },
          ]}
        />
      </Animated.View>
      <View pointerEvents="none" style={styles.revealOverlay}>
        <Animated.View
          style={[
            styles.revealVeil,
            {
              backgroundColor: revealAccent,
              opacity: revealFade.interpolate({
                inputRange: [0, 0.24, 0.8, 1],
                outputRange: [0, 0.035, 0.075, 0.085],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.revealHalo,
            {
              width: revealSize,
              height: revealSize,
              borderRadius: revealRadius,
              left: revealOrigin.x - revealRadius,
              top: revealOrigin.y - revealRadius,
              backgroundColor: revealAccent,
              opacity: revealFade.interpolate({
                inputRange: [0, 0.22, 0.7, 1],
                outputRange: [0, 0.04, 0.07, 0.045],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: revealProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.16, 1.14],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.revealCircle,
            {
              width: revealSize,
              height: revealSize,
              borderRadius: revealRadius,
              left: revealOrigin.x - revealRadius,
              top: revealOrigin.y - revealRadius,
              backgroundColor: revealAccent,
              opacity: revealFade.interpolate({
                inputRange: [0, 0.22, 0.7, 1],
                outputRange: [0, 0.055, 0.085, 0.06],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: revealProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.18, 1.02],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.revealRing,
            {
              width: revealSize,
              height: revealSize,
              borderRadius: revealRadius,
              left: revealOrigin.x - revealRadius,
              top: revealOrigin.y - revealRadius,
              borderColor: revealAccent,
              opacity: revealFade.interpolate({
                inputRange: [0, 0.18, 0.46, 1],
                outputRange: [0, 0.16, 0.08, 0],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: revealProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.24, 1.06],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
      </View>
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: activeSurfaceColorValue,
              borderColor:
                selectedMode === 'company'
                  ? 'rgba(255,255,255,0.06)'
                  : activeOutlineColorValue,
              opacity: sheetOpacity,
              transform: [{ translateY: sheetTranslateY }, { scale: sheetScale }],
            },
          ]}>
          <StatusBar
            barStyle={statusBarStyle}
            backgroundColor={activeBackground}
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.heroBlock}>
              <Text
                style={[
                  styles.kicker,
                  {
                    color:
                      selectedMode === 'company'
                        ? '#FF8C38'
                        : activeAccentStrongColorValue,
                  },
                ]}>
                Первый запуск
              </Text>
              <Text style={[styles.title, { color: activeTextColorValue }]}>
                Выбери стиль приложения
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: activeMutedTextColorValue },
                ]}>
                Выбери один из двух режимов. Настройку потом можно поменять во вкладке
                «Ещё».
              </Text>
            </View>

            {renderLivePreview()}

            <View style={styles.optionRow}>
              {optionData.map(option => {
                const isSelected = selectedMode === option.mode
                const optionAccent =
                  option.mode === 'company'
                    ? '#FF6A00'
                    : materialOptionAccent

                return (
                  <Animated.View
                    key={option.mode}
                    style={[
                      styles.optionCardWrap,
                      isSelected
                        ? {
                            transform: [
                              {
                                translateY: selectionPulse.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, -6],
                                  extrapolate: 'clamp',
                                }),
                              },
                              {
                                scale: selectionPulse.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [1, 1.018],
                                  extrapolate: 'clamp',
                                }),
                              },
                            ],
                          }
                        : null,
                    ]}>
                    <Pressable
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor: isSelected
                            ? option.mode === 'material'
                              ? materialOptionContainerStrong
                              : String(companyPalette.surfaceRaised)
                            : option.mode === 'material'
                              ? materialOptionSurfaceMuted
                              : String(companyPalette.surface),
                          borderColor: isSelected
                            ? optionAccent
                            : option.mode === 'material'
                              ? materialOptionOutline
                              : String(companyPalette.outlineVariant),
                        },
                      ]}
                      onPressIn={event => handleSelectPressIn(option.mode, event)}
                      onPress={() => handleSelectMode(option.mode)}>
                      <View style={styles.optionTop}>
                        <View style={styles.optionCopy}>
                          <Text
                            style={[
                              styles.optionTitle,
                              {
                                color: isSelected
                                  ? option.mode === 'material'
                                    ? materialOptionText
                                    : String(companyPalette.onSurface)
                                  : option.mode === 'material'
                                    ? materialOptionMutedText
                                    : String(companyPalette.onSurfaceMuted),
                              },
                            ]}>
                            {option.title}
                          </Text>
                          <Text
                            style={[
                              styles.optionMeta,
                              {
                                color: isSelected
                                  ? option.mode === 'company'
                                    ? '#FF8C38'
                                    : materialOptionAccentStrong
                                  : option.mode === 'material'
                                    ? materialOptionMutedText
                                    : String(companyPalette.onSurfaceMuted),
                              },
                            ]}>
                            {option.mode === 'company' ? 'Фирменный' : 'Системная'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.optionRadio,
                            {
                              backgroundColor: isSelected ? optionAccent : 'transparent',
                              borderColor: isSelected
                                ? optionAccent
                                : option.mode === 'material'
                                  ? materialOptionOutline
                                  : String(companyPalette.outline),
                            },
                          ]}>
                          {isSelected ? <View style={styles.optionRadioInner} /> : null}
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                )
              })}
            </View>

            <Text
              style={[
                styles.footerCaption,
                {
                  color: activeMutedTextColorValue,
                  marginTop: 10,
                  paddingHorizontal: 2,
                },
              ]}>
              Доступность и внешний вид Material You зависят от версии Android и оболочки
              устройства. На некоторых устройствах оформление может отличаться.
            </Text>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                backgroundColor: activeSurfaceColorValue,
                borderTopColor: activeOutlineColorValue,
              },
            ]}>
            <Text
              style={[
                styles.footerCaption,
                { color: activeMutedTextColorValue },
              ]}>
              Выбран режим:{' '}
              <Text style={[styles.footerSelectedValue, { color: activeTextColorValue }]}>
                {selectedOption.title}
              </Text>
            </Text>

            <Pressable
              style={[
                styles.continueButton,
                {
                  backgroundColor: activeAccentColorValue,
                  borderColor:
                    selectedMode === 'company'
                      ? '#FF8C38'
                      : activeAccentStrongColorValue,
                },
              ]}
              onPress={handleComplete}>
              <Animated.View
                style={{
                  transform: [{ scale: continueScale }],
                  opacity: continueOpacity,
                }}>
                <Text style={[styles.continueButtonText, { color: activeOnPrimary }]}>
                  Продолжить
                </Text>
              </Animated.View>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 400,
    elevation: 400,
  },
  backgroundBase: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundSecondary: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
  },
  ambientOrbit: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientOrbitCore: {
    opacity: 0.26,
  },
  ambientOrbitRing: {
    position: 'absolute',
    borderWidth: 1,
    opacity: 0.12,
  },
  ambientOrbitRingSmall: {
    position: 'absolute',
    borderWidth: 1,
    opacity: 0.1,
  },
  ambientOrbitTooth: {
    position: 'absolute',
    opacity: 0.42,
  },
  revealOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 6,
  },
  revealVeil: {
    ...StyleSheet.absoluteFillObject,
  },
  revealHalo: {
    position: 'absolute',
  },
  revealCircle: {
    position: 'absolute',
  },
  revealRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sheet: {
    maxHeight: '74%',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 34,
    elevation: 14,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 10,
  },
  heroBlock: {
    gap: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  previewShell: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewChip: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewChipText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  previewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: {
    fontSize: 17,
    fontWeight: '900',
  },
  previewHeroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    overflow: 'hidden',
  },
  previewBadge: {
    alignSelf: 'flex-start',
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.25,
  },
  previewLineLong: {
    width: '88%',
    height: 7,
    borderRadius: 999,
  },
  previewLineMedium: {
    width: '64%',
    height: 7,
    borderRadius: 999,
    opacity: 0.76,
  },
  previewBottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  previewMiniCard: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  previewMiniDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  previewMiniLineWide: {
    width: '84%',
    height: 7,
    borderRadius: 999,
  },
  previewMiniLineShort: {
    width: '56%',
    height: 7,
    borderRadius: 999,
    opacity: 0.76,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionCardWrap: {
    flex: 1,
  },
  optionCard: {
    flex: 1,
    minHeight: 64,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  optionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '900',
  },
  optionMeta: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.25,
  },
  optionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  footerCaption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  footerSelectedValue: {
    fontWeight: '800',
  },
  continueButton: {
    minHeight: 52,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
})
