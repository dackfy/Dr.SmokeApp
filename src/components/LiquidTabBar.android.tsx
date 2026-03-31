import React from 'react'
import { BlurView } from '@react-native-community/blur'
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  type ColorValue,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { androidTick } from '../utils/androidHaptics'

import type { TabKey } from './LiquidTabBar'

type LiquidTabBarAndroidProps = {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  homeIcon: ImageSourcePropType
  profileIcon: ImageSourcePropType
  mailIcon?: ImageSourcePropType
  trashIcon?: ImageSourcePropType
  homeLabel?: string
  trashLabel?: string
  profileLabel?: string
  themeMode?: 'dark' | 'light'
  activeTintColor?: ColorValue
  activeBackgroundColor?: ColorValue
  inactiveTintColor?: ColorValue
  shellBackgroundColor?: ColorValue
  shellBorderColor?: ColorValue
  activeForegroundColor?: ColorValue
  activePillSolidColor?: ColorValue
}

type TabConfig = {
  key: TabKey
  icon: ImageSourcePropType
  label: string
}

const BAR_HEIGHT = 68
const HORIZONTAL_PADDING = 44
const INNER_PADDING = 8
const BOTTOM_OFFSET = 10
const ACTIVE_BG_LIGHT = 'rgba(255,255,255,0.26)'
const ACTIVE_BG_DARK = 'rgba(255,255,255,0.18)'
const INACTIVE_TINT_LIGHT = 'rgba(235,241,247,0.92)'
const INACTIVE_TINT_DARK = 'rgba(235,241,247,0.9)'
const SHELL_BG_LIGHT = 'rgba(245,248,252,0.08)'
const SHELL_BG_DARK = 'rgba(18,22,28,0.12)'
const SHELL_BORDER_LIGHT = 'rgba(255,255,255,0.14)'
const SHELL_BORDER_DARK = 'rgba(255,255,255,0.09)'
const DRAG_ACTIVATION_DX = 6
const DRAG_HAPTIC_THRESHOLD = 0.34

export default function LiquidTabBarAndroid({
  activeTab,
  onTabChange,
  homeIcon,
  profileIcon,
  mailIcon,
  trashIcon,
  homeLabel = 'Главная',
  trashLabel = 'Корзина',
  profileLabel = 'Профиль',
  themeMode = 'dark',
  activeTintColor: _activeTintColor,
  activeBackgroundColor,
  inactiveTintColor,
  shellBackgroundColor,
  shellBorderColor,
  activeForegroundColor,
  activePillSolidColor,
}: LiquidTabBarAndroidProps) {
  const insets = useSafeAreaInsets()
  const isLightTheme = themeMode === 'light'
  const inactiveTint =
    inactiveTintColor || (isLightTheme ? INACTIVE_TINT_LIGHT : INACTIVE_TINT_DARK)
  const shellBackground =
    shellBackgroundColor || (isLightTheme ? SHELL_BG_LIGHT : SHELL_BG_DARK)
  const shellBorder =
    shellBorderColor || (isLightTheme ? SHELL_BORDER_LIGHT : SHELL_BORDER_DARK)
  const activeBackground =
    activeBackgroundColor || (isLightTheme ? ACTIVE_BG_LIGHT : ACTIVE_BG_DARK)
  const activeForeground =
    activeForegroundColor || (isLightTheme ? '#101416' : '#F8FBFF')
  const activePillSolid =
    activePillSolidColor || (isLightTheme ? 'rgba(255,255,255,0.94)' : 'rgba(56,61,68,0.96)')

  const tabs = React.useMemo<TabConfig[]>(
    () =>
      mailIcon && trashIcon
        ? [
            { key: 'home', icon: homeIcon, label: homeLabel },
            { key: 'mail', icon: mailIcon, label: 'Сертификаты' },
            { key: 'trash', icon: trashIcon, label: trashLabel },
            { key: 'profile', icon: profileIcon, label: profileLabel },
          ]
        : trashIcon
          ? [
              { key: 'home', icon: homeIcon, label: homeLabel },
              { key: 'trash', icon: trashIcon, label: trashLabel },
              { key: 'profile', icon: profileIcon, label: profileLabel },
            ]
        : [
            { key: 'home', icon: homeIcon, label: homeLabel },
            { key: 'profile', icon: profileIcon, label: profileLabel },
          ],
    [homeIcon, homeLabel, mailIcon, profileIcon, profileLabel, trashIcon, trashLabel],
  )

  const [barWidth, setBarWidth] = React.useState(0)
  const [barPageX, setBarPageX] = React.useState(HORIZONTAL_PADDING)
  const itemWidth =
    barWidth > 0 ? (barWidth - INNER_PADDING * 2) / tabs.length : 0
  const shellRef = React.useRef<View | null>(null)

  const activeIndex = Math.max(0, tabs.findIndex(tab => tab.key === activeTab))
  const activeProgress = React.useRef(new Animated.Value(activeIndex)).current
  const pillImpactX = React.useRef(new Animated.Value(0)).current
  const dragHoverTabRef = React.useRef<TabKey | null>(null)
  const isDraggingRef = React.useRef(false)
  const isDragGestureRef = React.useRef(false)
  const lastDragHapticIndexRef = React.useRef(activeIndex)
  const lastCommittedIndexRef = React.useRef(activeIndex)
  const suppressNextTransitionImpactRef = React.useRef(false)

  const inputRange = tabs.map((_, index) => index)
  const outputRange = tabs.map((_, index) => INNER_PADDING + itemWidth * index)

  React.useEffect(() => {
    if (!itemWidth || isDraggingRef.current) return

    const direction = activeIndex === lastCommittedIndexRef.current
      ? 0
      : activeIndex > lastCommittedIndexRef.current
        ? 1
        : -1
    lastCommittedIndexRef.current = activeIndex
    const suppressImpact = suppressNextTransitionImpactRef.current
    suppressNextTransitionImpactRef.current = false
    pillImpactX.stopAnimation()
    pillImpactX.setValue(suppressImpact ? 0 : direction * 9)

    Animated.parallel([
      Animated.spring(activeProgress, {
        toValue: activeIndex,
        useNativeDriver: true,
        speed: suppressImpact ? 30 : 34,
        bounciness: suppressImpact ? 4 : 6,
      }),
      Animated.spring(pillImpactX, {
        toValue: 0,
        speed: suppressImpact ? 26 : 30,
        bounciness: suppressImpact ? 6 : 10,
        useNativeDriver: true,
      }),
    ]).start()
  }, [activeIndex, activeProgress, itemWidth, pillImpactX])

  React.useEffect(() => {
    lastDragHapticIndexRef.current = activeIndex
  }, [activeIndex])

  const syncShellMetrics = React.useCallback(() => {
    shellRef.current?.measureInWindow((x, _y, width) => {
      if (Number.isFinite(x) && x >= 0) {
        setBarPageX(x)
      }
      if (Number.isFinite(width) && width > 0) {
        setBarWidth(width)
      }
    })
  }, [])

  const resolveProgressFromPageX = React.useCallback(
    (pageX: number) => {
      if (!itemWidth || !tabs.length) {
        return activeIndex
      }

      const innerX = Math.max(
        0,
        Math.min(
          Math.max(0, barWidth - INNER_PADDING * 2 - itemWidth),
          pageX - barPageX - INNER_PADDING - itemWidth / 2,
        ),
      )
      const maxProgress = Math.max(0, tabs.length - 1)
      return Math.max(0, Math.min(maxProgress, innerX / itemWidth))
    },
    [activeIndex, barPageX, barWidth, itemWidth, tabs.length],
  )

  const resolveTabFromPageX = React.useCallback(
    (pageX: number) => {
      if (!itemWidth || !tabs.length) {
        return null
      }

      const innerX = pageX - barPageX - INNER_PADDING - itemWidth / 2
      if (innerX < 0) {
        return tabs[0]?.key ?? null
      }

      if (innerX > barWidth - INNER_PADDING * 2 - itemWidth) {
        return tabs[tabs.length - 1]?.key ?? null
      }

      const index = Math.max(0, Math.min(tabs.length - 1, Math.round(innerX / itemWidth)))
      return tabs[index]?.key ?? null
    },
    [barPageX, barWidth, itemWidth, tabs],
  )

  const updateDragFromGesture = React.useCallback(
    (pageX: number) => {
      isDraggingRef.current = true
      activeProgress.stopAnimation()
      const nextProgress = resolveProgressFromPageX(pageX)
      activeProgress.setValue(nextProgress)

      const nextTab = resolveTabFromPageX(pageX)
      if (nextTab) {
        dragHoverTabRef.current = nextTab
      }

      const nearestIndex = Math.max(
        0,
        Math.min(tabs.length - 1, Math.round(nextProgress)),
      )
      if (
        Platform.OS === 'android' &&
        nearestIndex !== lastDragHapticIndexRef.current &&
        Math.abs(nextProgress - lastDragHapticIndexRef.current) >= DRAG_HAPTIC_THRESHOLD
      ) {
        lastDragHapticIndexRef.current = nearestIndex
        androidTick()
      }
    },
    [activeProgress, resolveProgressFromPageX, resolveTabFromPageX, tabs.length],
  )

  const commitDragSelection = React.useCallback(() => {
    isDraggingRef.current = false
    isDragGestureRef.current = false
    const hoveredTab = dragHoverTabRef.current
    dragHoverTabRef.current = null
    if (hoveredTab && hoveredTab !== activeTab) {
      suppressNextTransitionImpactRef.current = true
      onTabChange(hoveredTab)
      return
    }
    Animated.timing(activeProgress, {
      toValue: activeIndex,
      useNativeDriver: true,
      duration: 220,
      easing: Easing.bezier(0.2, 0.82, 0.22, 1),
    }).start()
  }, [activeIndex, activeProgress, activeTab, onTabChange])

  const tabBarPanHandlers = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const absDx = Math.abs(gestureState.dx)
          const absDy = Math.abs(gestureState.dy)
          return absDx > DRAG_ACTIVATION_DX && absDx >= absDy
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          const absDx = Math.abs(gestureState.dx)
          const absDy = Math.abs(gestureState.dy)
          return absDx > DRAG_ACTIVATION_DX && absDx >= absDy
        },
        onPanResponderGrant: (_, gestureState) => {
          isDraggingRef.current = true
          isDragGestureRef.current = false
          dragHoverTabRef.current = activeTab
          lastDragHapticIndexRef.current = activeIndex
          updateDragFromGesture(gestureState.x0)
        },
        onPanResponderMove: (_, gestureState) => {
          isDragGestureRef.current = true
          const clampedPageX = Math.max(
            barPageX,
            Math.min(barPageX + barWidth, gestureState.moveX),
          )
          updateDragFromGesture(clampedPageX)
        },
        onPanResponderRelease: commitDragSelection,
        onPanResponderTerminate: commitDragSelection,
        onPanResponderTerminationRequest: () => false,
      }).panHandlers,
    [activeIndex, activeTab, barPageX, barWidth, commitDragSelection, updateDragFromGesture],
  )

  const indicatorX =
    itemWidth > 0
      ? activeProgress.interpolate({
          inputRange,
          outputRange,
          extrapolate: 'clamp',
        })
      : 0

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { bottom: Math.max(insets.bottom, 0) + BOTTOM_OFFSET },
      ]}>
      <View
        ref={shellRef}
        style={[
          styles.shell,
          {
            borderColor: shellBorder,
          },
        ]}
        onLayout={() => syncShellMetrics()}>
        <BlurView
          pointerEvents="none"
          style={styles.shellBlur}
          blurType={isLightTheme ? 'light' : 'dark'}
          blurAmount={32}
          reducedTransparencyFallbackColor="#0A0D10"
        />
        <View
          pointerEvents="none"
          style={[styles.shellTint, { backgroundColor: shellBackground }]}
        />
        {itemWidth > 0 ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activePillGlowOuter,
                {
                  width: itemWidth + 16,
                  transform: [{ translateX: Animated.add(indicatorX, pillImpactX) }],
                  marginLeft: -8,
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activePillGlowInner,
                {
                  width: itemWidth,
                  transform: [{ translateX: Animated.add(indicatorX, pillImpactX) }],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activePill,
                {
                  width: itemWidth,
                  transform: [{ translateX: Animated.add(indicatorX, pillImpactX) }],
                  backgroundColor: activeBackground,
                  borderColor: shellBorder,
                },
              ]}>
              <View
                pointerEvents="none"
                style={[styles.activePillSolid, { backgroundColor: activePillSolid }]}
              />
              <View style={styles.activePillFill} />
            </Animated.View>
          </>
        ) : null}

        <View style={styles.row} {...tabBarPanHandlers}>
          {tabs.map((tab, index) => {
            const isActive = tab.key === activeTab
            return (
              <Pressable
                key={tab.key}
                android_disableSound
                onPressIn={() => {
                  if (
                    Platform.OS === 'android' &&
                    tab.key !== activeTab &&
                    !isDraggingRef.current
                  ) {
                    androidTick()
                  }
                }}
                onPressOut={() => undefined}
                onPress={() => {
                  if (isDragGestureRef.current || isDraggingRef.current || tab.key === activeTab) {
                    return
                  }
                  onTabChange(tab.key)
                }}
                style={styles.tabButton}
              >
                <Animated.View
                  style={[
                    styles.tabContent,
                    itemWidth > 0
                      ? {
                          opacity: activeProgress.interpolate({
                            inputRange: [index - 1, index, index + 1],
                            outputRange: [0.94, 1, 0.94],
                            extrapolate: 'clamp',
                          }),
                        }
                      : null,
                  ]}>
                  <Animated.View
                    style={
                      itemWidth > 0
                        ? {
                            transform: [
                              {
                                scale: activeProgress.interpolate({
                                  inputRange: [index - 1, index, index + 1],
                                  outputRange: [0.985, 1.015, 0.985],
                                  extrapolate: 'clamp',
                                }),
                              },
                            ],
                            opacity: activeProgress.interpolate({
                              inputRange: [index - 1, index, index + 1],
                              outputRange: [0.92, 1, 0.92],
                              extrapolate: 'clamp',
                            }),
                          }
                        : null
                    }>
                    <Image
                      source={tab.icon}
                      fadeDuration={0}
                      style={[
                        styles.icon,
                        { tintColor: isActive ? activeForeground : inactiveTint },
                      ]}
                    />
                  </Animated.View>
                  <Animated.Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={[
                      styles.label,
                      tab.key === 'mail' ? styles.labelLong : null,
                      { color: isActive ? activeForeground : inactiveTint },
                      isActive ? styles.labelActive : null,
                      itemWidth > 0
                        ? {
                          opacity: activeProgress.interpolate({
                            inputRange: [index - 1, index, index + 1],
                            outputRange: [0.82, 1, 0.82],
                            extrapolate: 'clamp',
                          }),
                        }
                        : null,
                    ]}>
                    {tab.label}
                  </Animated.Text>
                </Animated.View>
              </Pressable>
            )
          })}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: HORIZONTAL_PADDING,
    right: HORIZONTAL_PADDING,
    zIndex: 50,
    elevation: 50,
  },
  shell: {
    height: BAR_HEIGHT,
    borderRadius: 30,
    borderWidth: 1,
    padding: INNER_PADDING,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  shellBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  shellTint: {
    ...StyleSheet.absoluteFillObject,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  activePill: {
    position: 'absolute',
    top: INNER_PADDING,
    bottom: INNER_PADDING,
    left: 0,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  activePillGlowOuter: {
    position: 'absolute',
    top: INNER_PADDING - 6,
    bottom: INNER_PADDING - 6,
    left: 0,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 244, 236, 0.045)',
    shadowColor: '#FFF4EC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 0,
  },
  activePillGlowInner: {
    position: 'absolute',
    top: INNER_PADDING - 2,
    bottom: INNER_PADDING - 2,
    left: 0,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 244, 236, 0.06)',
    shadowColor: '#FFF4EC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 0,
  },
  activePillSolid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(56,61,68,0.96)',
  },
  activePillFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.022)',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  icon: {
    width: 21,
    height: 21,
    resizeMode: 'contain',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  labelLong: {
    fontSize: 10,
    letterSpacing: -0.2,
  },
  labelActive: {
    fontWeight: '800',
  },
})
