import React from 'react'
import {
  Animated,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
const SHELL_BG_LIGHT = 'rgba(251,252,254,0.94)'
const SHELL_BG_DARK = 'rgba(14,18,22,0.9)'
const SHELL_BORDER_LIGHT = 'rgba(16,24,32,0.08)'
const SHELL_BORDER_DARK = 'rgba(203,213,225,0.12)'

function pulseHaptic() {
  if (Platform.OS === 'android') {
    Vibration.vibrate(8)
  }
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
            { key: 'mail', icon: mailIcon, label: 'Почта' },
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
  const indicatorX = React.useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (!itemWidth) return

    Animated.spring(indicatorX, {
      toValue: INNER_PADDING + itemWidth * activeIndex,
      useNativeDriver: false,
      speed: 20,
      bounciness: 8,
    }).start()
  }, [activeIndex, indicatorX, itemWidth])

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
          />
        ) : null}

        <View style={styles.row}>
          {tabs.map(tab => {
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
                <Image
                  source={tab.icon}
                  style={[
                    styles.icon,
                    { tintColor: isActive ? activeForeground : inactiveTint },
                  ]}
                />
                <Text
                  style={[
                    styles.label,
                    { color: isActive ? activeForeground : inactiveTint },
                    isActive ? styles.labelActive : null,
                  ]}>
                  {tab.label}
                </Text>
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
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
  },
  labelActive: {
    fontWeight: '800',
  },
})
