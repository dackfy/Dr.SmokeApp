import React from 'react'
import {
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

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
const ACTIVE_TINT_LIGHT = '#2563EB'
const ACTIVE_TINT_DARK = '#FF8C38'
const INACTIVE_TINT_LIGHT = '#6B7280'
const INACTIVE_TINT_DARK = '#A1A1AA'
const SHELL_BG_LIGHT = 'rgba(255,255,255,0.92)'
const SHELL_BG_DARK = 'rgba(10,10,12,0.9)'
const SHELL_BORDER_LIGHT = 'rgba(15,23,42,0.08)'
const SHELL_BORDER_DARK = 'rgba(255,255,255,0.08)'

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
  activeTintColor,
  activeBackgroundColor,
  inactiveTintColor,
  shellBackgroundColor,
  shellBorderColor,
}: LiquidTabBarAndroidProps) {
  const insets = useSafeAreaInsets()
  const isLightTheme = themeMode === 'light'
  const activeTint =
    activeTintColor || (isLightTheme ? ACTIVE_TINT_LIGHT : ACTIVE_TINT_DARK)
  const inactiveTint =
    inactiveTintColor || (isLightTheme ? INACTIVE_TINT_LIGHT : INACTIVE_TINT_DARK)
  const shellBackground =
    shellBackgroundColor || (isLightTheme ? SHELL_BG_LIGHT : SHELL_BG_DARK)
  const shellBorder =
    shellBorderColor || (isLightTheme ? SHELL_BORDER_LIGHT : SHELL_BORDER_DARK)
  const activeBackground =
    activeBackgroundColor || (isLightTheme ? ACTIVE_BG_LIGHT : ACTIVE_BG_DARK)

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
                onPress={() => onTabChange(tab.key)}
                style={styles.tabButton}
              >
                <Image
                  source={tab.icon}
                  style={[
                    styles.icon,
                    { tintColor: isActive ? activeTint : inactiveTint },
                  ]}
                />
                <Text
                  style={[
                    styles.label,
                    { color: isActive ? activeTint : inactiveTint },
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
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 14,
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
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  icon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  labelActive: {
    fontWeight: '800',
  },
})
