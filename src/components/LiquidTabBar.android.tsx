import React from 'react'
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Vibration,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getAndroidStatusBarStyle } from '../theme/androidDynamicColors'

import type { TabKey } from './LiquidTabBar'

type LiquidTabBarAndroidProps = {
  activeTab: TabKey
  onTabChange: (tab: TabKey) => void
  homeIcon: ImageSourcePropType
  profileIcon: ImageSourcePropType
  mailIcon?: ImageSourcePropType
  trashIcon?: ImageSourcePropType
  homeLabel?: string
  profileLabel?: string
  themeMode?: 'dark' | 'light'
  activeTintColor?: string
  activeBackgroundColor?: string
  inactiveTintColor?: string
  shellBackgroundColor?: string
  shellBorderColor?: string
  activeForegroundColor?: string
}

type TabConfig = {
  key: TabKey
  icon: ImageSourcePropType
  label: string
}

const BAR_HEIGHT = 68
const HORIZONTAL_PADDING = 22
const INNER_PADDING = 8
const BOTTOM_OFFSET = 10
const ACTIVE_BG_LIGHT = '#DCE8FF'
const ACTIVE_BG_DARK = '#243048'
const INACTIVE_TINT_LIGHT = '#5C6874'
const INACTIVE_TINT_DARK = '#B5BEC7'
const SHELL_BG_LIGHT = 'rgba(251,252,254,0.78)'
const SHELL_BG_DARK = 'rgba(14,18,22,0.74)'
const SHELL_BORDER_LIGHT = 'rgba(16,24,32,0.08)'
const SHELL_BORDER_DARK = 'rgba(203,213,225,0.12)'

function pulseHaptic() {
  if (Platform.OS === 'android') {
    Vibration.vibrate(8)
  }
}

function TrashGlyph({ color, active }: { color: string; active: boolean }) {
  return (
    <View style={[styles.trashGlyph, active ? styles.trashGlyphActive : null]}>
      <View style={[styles.trashLid, { borderColor: color }]} />
      <View style={[styles.trashHandle, { backgroundColor: color }]} />
      <View style={[styles.trashBody, { borderColor: color }]}>
        <View style={[styles.trashColumn, { backgroundColor: color }]} />
        <View style={[styles.trashColumn, { backgroundColor: color }]} />
        <View style={[styles.trashColumn, { backgroundColor: color }]} />
      </View>
    </View>
  )
}

export default function LiquidTabBarAndroid({
  activeTab,
  onTabChange,
  homeIcon,
  profileIcon,
  mailIcon,
  trashIcon,
  homeLabel = 'Главная',
  profileLabel = 'Профиль',
  themeMode = 'dark',
  activeTintColor: _activeTintColor,
  activeBackgroundColor,
  inactiveTintColor,
  shellBackgroundColor,
  shellBorderColor,
  activeForegroundColor,
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
    activeForegroundColor ||
    (getAndroidStatusBarStyle(activeBackground) === 'dark-content' ? '#101416' : '#F8FBFF')

  const tabs = React.useMemo<TabConfig[]>(
    () =>
      mailIcon && trashIcon
        ? [
            { key: 'home', icon: homeIcon, label: homeLabel },
            { key: 'mail', icon: mailIcon, label: 'Сертификаты' },
            { key: 'trash', icon: trashIcon, label: 'Корзина' },
            { key: 'profile', icon: profileIcon, label: profileLabel },
          ]
        : [
            { key: 'home', icon: homeIcon, label: homeLabel },
            { key: 'profile', icon: profileIcon, label: profileLabel },
          ],
    [homeIcon, homeLabel, mailIcon, profileIcon, profileLabel, trashIcon],
  )

  const [barWidth, setBarWidth] = React.useState(0)
  const itemWidth =
    barWidth > 0 ? (barWidth - INNER_PADDING * 2) / tabs.length : 0

  const activeIndex = Math.max(0, tabs.findIndex(tab => tab.key === activeTab))
  const activeProgress = React.useRef(new Animated.Value(activeIndex)).current

  const inputRange = tabs.map((_, index) => index)
  const outputRange = tabs.map((_, index) => INNER_PADDING + itemWidth * index)

  React.useEffect(() => {
    if (!itemWidth) return

    Animated.timing(activeProgress, {
      toValue: activeIndex,
      useNativeDriver: true,
      duration: 320,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    }).start()
  }, [activeIndex, activeProgress, itemWidth])

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
        style={[
          styles.shell,
          {
            backgroundColor: shellBackground,
            borderColor: shellBorder,
          },
        ]}
        onLayout={event => setBarWidth(event.nativeEvent.layout.width)}>
        {itemWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activePill,
              {
                width: itemWidth,
                transform: [{ translateX: indicatorX }],
                backgroundColor: activeBackground,
                borderColor: shellBorder,
              },
            ]}
            renderToHardwareTextureAndroid
          />
        ) : null}

        <View style={styles.row}>
          {tabs.map((tab, index) => {
            const isActive = tab.key === activeTab
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  if (tab.key !== activeTab) {
                    pulseHaptic()
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
                    }
                    renderToHardwareTextureAndroid>
                    {tab.key === 'trash' ? (
                      <TrashGlyph
                        color={isActive ? activeForeground : inactiveTint}
                        active={isActive}
                      />
                    ) : (
                      <Image
                        source={tab.icon}
                        style={[
                          styles.icon,
                          { tintColor: isActive ? activeForeground : inactiveTint },
                        ]}
                      />
                    )}
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
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 22,
    elevation: 8,
    overflow: 'hidden',
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  icon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
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
  trashGlyph: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashGlyphActive: {
    transform: [{ translateY: -0.5 }],
  },
  trashLid: {
    position: 'absolute',
    top: 4,
    width: 14,
    height: 3,
    borderRadius: 2,
    borderWidth: 1.8,
  },
  trashHandle: {
    position: 'absolute',
    top: 1,
    width: 6,
    height: 2.5,
    borderRadius: 2,
  },
  trashBody: {
    position: 'absolute',
    top: 7,
    width: 13,
    height: 10,
    borderRadius: 3,
    borderWidth: 1.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 1.5,
  },
  trashColumn: {
    width: 1.4,
    height: 5.5,
    borderRadius: 1,
  },
})
