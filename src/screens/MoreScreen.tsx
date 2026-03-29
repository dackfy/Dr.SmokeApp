import React from 'react'
import {
  Animated,
  BackHandler,
  Easing,
  type ColorValue,
  type GestureResponderEvent,
  Image,
  type LayoutChangeEvent,
  Linking,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import AnimatedEntranceView from '../components/AnimatedEntranceView'
import { usePortalAccess } from '../features/portal/usePortalAccess'
import { useAndroidThemeMode } from '../theme/androidAppTheme'
import {
  type AndroidThemePalette,
  getAndroidCompanyPalette,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors'
import {
  androidPeakImpact,
  androidRustleHaptic,
} from '../utils/androidHaptics'
import { styles } from './MoreScreen.styles'

type MoreScreenRoute = 'root' | 'appearance' | 'portal' | 'preferences'

type MoreScreenProps = {
  employeeId: string
}

const PORTAL_URL = 'https://portal.dr-smoke.ru/'
const COMPANY_THEME_ACCENT = '#FF6A00'
const COMPANY_PREVIEW_COLORS = ['#050505', '#FF6A00', '#252525'] as const
const moreIcon = require('../assets/icons/more.png')
const lockIcon = require('../assets/icons/lock.png')

const iosPalette: AndroidThemePalette = {
  background: '#000000',
  surface: '#121212',
  surfaceRaised: '#171717',
  surfaceMuted: '#1E1E21',
  surfaceAccent: '#1C1C1C',
  outline: '#2C2C2E',
  outlineVariant: '#262628',
  onSurface: '#FFFFFF',
  onSurfaceMuted: '#A1A1AA',
  primary: '#FF6A00',
  primaryStrong: '#FF8C38',
  secondary: '#C97B42',
  tertiary: '#7A5C46',
  primaryContainer: '#241409',
  primaryContainerStrong: '#2E1808',
  onPrimary: '#FFFFFF',
  error: '#FF7A7A',
  errorContainer: '#351313',
  errorBorder: '#6A2828',
  success: '#69D08E',
  successContainer: '#102317',
  successBorder: '#234130',
  buttonText: '#FFFFFF',
  closedBadge: '#24160B',
  closedBadgeBorder: '#503016',
  secondaryButton: '#1C1C1E',
}

function formatPortalExpiry(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function MoreNavGlyph({
  kind,
  color,
}: {
  kind: 'appearance' | 'preferences' | 'portal'
  color: ColorValue
}) {
  const stroke = typeof color === 'string' ? color : '#FFFFFF'

  if (kind === 'appearance') {
    return (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Rect x={2.5} y={5.5} width={8} height={10} rx={2.5} stroke={stroke} strokeWidth={1.7} />
        <Rect x={9.5} y={3.5} width={8} height={10} rx={2.5} stroke={stroke} strokeWidth={1.7} />
      </Svg>
    )
  }

  if (kind === 'preferences') {
    return (
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Path d="M4 6H16" stroke={stroke} strokeWidth={1.7} strokeLinecap="round" />
        <Path d="M4 10H16" stroke={stroke} strokeWidth={1.7} strokeLinecap="round" />
        <Path d="M4 14H16" stroke={stroke} strokeWidth={1.7} strokeLinecap="round" />
        <Circle cx={7} cy={6} r={1.8} fill={stroke} />
        <Circle cx={12.5} cy={10} r={1.8} fill={stroke} />
        <Circle cx={9} cy={14} r={1.8} fill={stroke} />
      </Svg>
    )
  }

  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M7 4.5H5.8C4.81 4.5 4 5.31 4 6.3V13.7C4 14.69 4.81 15.5 5.8 15.5H7"
        stroke={stroke}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 10H16"
        stroke={stroke}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Path
        d="M13.2 7.2L16 10L13.2 12.8"
        stroke={stroke}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function MoreNavIcon({
  kind,
  color,
}: {
  kind: 'appearance' | 'preferences' | 'portal'
  color: ColorValue
}) {
  if (Platform.OS === 'ios') {
    const iconSource = kind === 'portal' ? lockIcon : moreIcon
    return (
      <Image
        source={iconSource}
        style={{
          width: 18,
          height: 18,
          tintColor: typeof color === 'string' ? color : '#FFFFFF',
          resizeMode: 'contain',
        }}
      />
    )
  }

  return <MoreNavGlyph kind={kind} color={color} />
}

export default function MoreScreen({
  employeeId,
}: MoreScreenProps) {
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const isAndroid = Platform.OS === 'android'
  const [route, setRoute] = React.useState<MoreScreenRoute>('root')
  const holdTimersRef = React.useRef<number[]>([])
  const holdCommittedRef = React.useRef(false)
  const [holdTarget, setHoldTarget] = React.useState<'company' | 'material' | null>(null)
  const [holdOrigin, setHoldOrigin] = React.useState<Record<'company' | 'material', { x: number; y: number }>>({
    company: { x: 0, y: 0 },
    material: { x: 0, y: 0 },
  })
  const [holdLayout, setHoldLayout] = React.useState<Record<'company' | 'material', { width: number; height: number }>>({
    company: { width: 1, height: 1 },
    material: { width: 1, height: 1 },
  })

  const palette = React.useMemo(() => {
    if (!isAndroid) {
      return iosPalette
    }

    return androidTheme.mode === 'company'
      ? getAndroidCompanyPalette()
      : getAndroidThemePalette(colorScheme === 'dark', androidTheme.contrastMode)
  }, [androidTheme.contrastMode, androidTheme.mode, colorScheme, isAndroid])
  const materialPalette = React.useMemo(() => {
    if (!isAndroid) {
      return iosPalette
    }

    return getAndroidThemePalette(colorScheme === 'dark', androidTheme.contrastMode)
  }, [androidTheme.contrastMode, colorScheme, isAndroid])
  const isCompanyMode = isAndroid && androidTheme.mode === 'company'
  const isMaterialMode = isAndroid && androidTheme.mode === 'material'
  const isSystemDark = colorScheme === 'dark'
  const isMaterialDark = isSystemDark
  const materialPreviewAccent = materialPalette.primary
  const accentTextColor = isCompanyMode
    ? palette.primaryStrong
    : isMaterialDark
      ? palette.onSurface
      : palette.primary
  const subtleSurfaceColor = isCompanyMode
    ? palette.surfaceMuted
    : isMaterialDark
      ? palette.surface
      : palette.surfaceRaised
  const rootCardBackground = isCompanyMode
    ? palette.surfaceRaised
    : subtleSurfaceColor
  const heroCardBackground = isCompanyMode
    ? palette.surfaceRaised
    : isMaterialMode
      ? palette.surfaceRaised
      : rootCardBackground
  const accentSurface = isCompanyMode
    ? palette.primaryContainerStrong
    : palette.primaryContainerStrong
  const heroKickerColor = accentTextColor
  const secondaryMutedColor =
    isMaterialDark ? palette.onSurfaceMuted : palette.onSurfaceMuted
  const heroBorderColor = isCompanyMode
    ? palette.primaryContainerStrong
    : isMaterialMode && isMaterialDark
      ? palette.outline
      : isMaterialMode
        ? palette.primary
        : palette.outlineVariant
  const portalHeroBackground = isCompanyMode
    ? palette.surfaceMuted
    : subtleSurfaceColor
  const portalPanelBackground = isCompanyMode
    ? palette.surfaceRaised
    : palette.surfaceRaised
  const portalSecondaryPanel = isCompanyMode
    ? palette.surface
    : subtleSurfaceColor
  const ctaBackground =
    isCompanyMode
      ? palette.primary
      : isMaterialDark
        ? palette.primaryStrong
        : palette.primary
  const ctaTextColor = palette.onPrimary
  const ctaBorderColor =
    isCompanyMode
      ? palette.primaryStrong
      : isMaterialDark
        ? palette.primaryStrong
        : palette.primary
  const materialSolidAccent = materialPalette.primary
  const materialPreviewCardBackground = materialPalette.surfaceAccent
  const materialPreviewCardSecondaryBackground = materialPalette.primaryContainer
  const materialPreviewBorderColor = materialPalette.outline
  const materialPreviewLineStrong = materialPalette.primary
  const materialPreviewLineSoft = materialPalette.secondary
  const companyCardAccent = COMPANY_THEME_ACCENT
  const materialCardAccent = materialPalette.primary
  const companyCardBackground = palette.surface
  const materialCardBackground = isMaterialMode
    ? materialPalette.surface
    : palette.surface
  const companyCardBorderColor = isCompanyMode ? companyCardAccent : palette.outlineVariant
  const materialCardBorderColor = isMaterialMode
    ? materialPalette.outline
    : palette.outlineVariant
  const companyBadgeBackground = isCompanyMode ? companyCardAccent : palette.surfaceMuted
  const materialBadgePillBackground = isMaterialMode
    ? materialPalette.surfaceAccent
    : isSystemDark
      ? '#252D35'
      : '#E7EEF4'
  const companyBadgeTextColor = isCompanyMode ? palette.onPrimary : palette.onSurface
  const materialBadgePillTextColor = isMaterialMode
    ? materialPalette.onSurface
    : isSystemDark
      ? '#EAF2F8'
      : '#23313D'
  const companyRadioBorderColor = isCompanyMode ? companyCardAccent : palette.outline
  const materialRadioBorderColor = isMaterialMode ? materialPalette.primaryStrong : palette.outline
  const activeCardShadowColor = isMaterialMode ? '#000000' : companyCardAccent
  const activeCardShadowOpacity = isMaterialMode ? 0.06 : 0.1
  const activeCardShadowRadius = 18
  const activeCardElevation = 4
  const backButtonBorderColor = isCompanyMode
    ? palette.primaryContainerStrong
    : palette.outlineVariant
  const {
    session: portalSession,
    isLoading: isPortalLoading,
    isRefreshing: isPortalRefreshing,
    error: portalError,
    login: loginPortal,
    confirm: confirmPortal,
    logout: logoutPortal,
  } = usePortalAccess({
    employeeId,
    enabled: route === 'portal',
  })
  const portalStatusLabel =
    portalSession.status === 'active'
      ? 'Сессия активна'
      : portalSession.status === 'pending_confirm'
        ? 'Ожидает подтверждения'
        : 'Доступ не активирован'
  const portalActionLabel =
    portalSession.status === 'active'
      ? 'Завершить сессию'
      : portalSession.status === 'pending_confirm'
        ? 'Подтвердить вход'
        : 'Войти на портал'
  const formattedPortalExpiry = formatPortalExpiry(portalSession.expiresAt)

  const openPortal = React.useCallback(() => {
    Linking.openURL(portalSession.portalUrl || PORTAL_URL).catch(() => {})
  }, [portalSession.portalUrl])

  React.useEffect(() => {
    if (!isAndroid || route === 'root') {
      return
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setRoute('root')
      return true
    })

    return () => subscription.remove()
  }, [isAndroid, route])

  React.useEffect(() => {
    return () => {
      holdTimersRef.current.forEach(timer => clearTimeout(timer))
      holdTimersRef.current = []
    }
  }, [])

  const stopThemeHold = React.useCallback(
    (animated = true) => {
      holdTimersRef.current.forEach(timer => clearTimeout(timer))
      holdTimersRef.current = []

      const finish = () => {
        setHoldTarget(null)
        holdCommittedRef.current = false
      }

      if (animated) {
        Animated.timing(androidTheme.previewProgress, {
          toValue: 0,
          duration: 360,
          easing: Easing.bezier(0.24, 0.86, 0.24, 1),
          useNativeDriver: true,
        }).start(() => {
          androidTheme.clearPreview()
          finish()
        })
      } else {
        androidTheme.clearPreview()
        finish()
      }
    },
    [androidTheme],
  )

  const startThemeHold = React.useCallback(
    (mode: 'company' | 'material') => {
      if (!isAndroid || androidTheme.transitionPhase !== 'idle') {
        return
      }

      holdCommittedRef.current = false
      setHoldTarget(mode)
      androidRustleHaptic()
      holdTimersRef.current = []

      Animated.timing(androidTheme.previewProgress, {
        toValue: 1,
        duration: 1280,
        easing: Easing.bezier(0.2, 0.92, 0.24, 1),
        useNativeDriver: true,
      }).start()
    },
    [androidTheme, isAndroid],
  )

  const commitThemeHold = React.useCallback(
    (mode: 'company' | 'material') => {
      if (!isAndroid || holdCommittedRef.current || androidTheme.mode === mode) {
        stopThemeHold()
        return
      }

      holdCommittedRef.current = true
      holdTimersRef.current.forEach(timer => clearTimeout(timer))
      holdTimersRef.current = []
      androidPeakImpact()

      Animated.timing(androidTheme.previewProgress, {
        toValue: 1,
        duration: 240,
        easing: Easing.bezier(0.18, 0.9, 0.22, 1),
        useNativeDriver: true,
      }).start(() => {
        androidTheme.setMode(mode)
        setTimeout(() => {
          stopThemeHold()
        }, 420)
      })
    },
    [androidTheme, isAndroid, stopThemeHold],
  )

  const handleThemeCardLayout = React.useCallback(
    (mode: 'company' | 'material', event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout
      setHoldLayout(current => {
        const prev = current[mode]
        if (Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1) {
          return current
        }
        return {
          ...current,
          [mode]: { width, height },
        }
      })
    },
    [],
  )

  const handleThemePressIn = React.useCallback(
    (mode: 'company' | 'material', event: GestureResponderEvent) => {
      const { locationX, locationY, pageX, pageY } = event.nativeEvent
      stopThemeHold(false)
      setHoldOrigin(current => ({
        ...current,
        [mode]: { x: locationX, y: locationY },
      }))
      androidTheme.beginPreview(mode, { x: pageX, y: pageY })
      startThemeHold(mode)
    },
    [androidTheme, startThemeHold, stopThemeHold],
  )

  const renderThemeHoldOverlay = (mode: 'company' | 'material', accent: ColorValue) => {
    if (holdTarget !== mode) {
      return null
    }

    const layout = holdLayout[mode]
    const origin = holdOrigin[mode]
    const maxRadius = Math.max(
      Math.hypot(origin.x, origin.y),
      Math.hypot(layout.width - origin.x, origin.y),
      Math.hypot(origin.x, layout.height - origin.y),
      Math.hypot(layout.width - origin.x, layout.height - origin.y),
      1,
    )
    const circleSize = maxRadius * 2
    const fillOpacity = [0.18, 0.46]
    const circleOpacity = [0.12, 0.5]
    const strokeOpacity = [0.34, 0.98]

    return (
      <>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.optionHoldFill,
            {
              backgroundColor: accent,
              opacity: androidTheme.previewProgress.interpolate({
                inputRange: [0, 1],
                outputRange: fillOpacity,
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.optionHoldCircle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: maxRadius,
              left: origin.x - maxRadius,
              top: origin.y - maxRadius,
              backgroundColor: accent,
              opacity: androidTheme.previewProgress.interpolate({
                inputRange: [0, 1],
                outputRange: circleOpacity,
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: androidTheme.previewProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.02, 1.14],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.optionHoldStroke,
            {
              borderColor: accent,
              opacity: androidTheme.previewProgress.interpolate({
                inputRange: [0, 1],
                outputRange: strokeOpacity,
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </>
    )
  }

  const handlePortalPrimaryAction = React.useCallback(() => {
    if (portalSession.status === 'active') {
      logoutPortal()
      return
    }

    if (portalSession.status === 'pending_confirm') {
      confirmPortal()
      return
    }

    loginPortal()
  }, [confirmPortal, loginPortal, logoutPortal, portalSession.status])

  const renderHeader = (title: string, subtitle?: string) => (
    <View style={styles.topBar}>
      <View style={styles.topBarLeft}>
        {route !== 'root' ? (
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: isCompanyMode
                  ? palette.surfaceMuted
                  : palette.surfaceRaised,
                borderColor: backButtonBorderColor,
              },
            ]}
            onPress={() => setRoute('root')}
            accessibilityRole="button"
            accessibilityLabel="Назад">
            {Platform.OS === 'ios' ? (
              <Text style={[styles.backButtonText, { color: palette.onSurface }]}>‹</Text>
            ) : (
              <Svg width={16} height={16} viewBox="0 0 16 16">
                <Path
                  d="M10.5 2.5 L5 8 L10.5 13.5"
                  stroke="#FFFFFF"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            )}
          </TouchableOpacity>
        ) : null}
        <View style={styles.headerTextWrap}>
          <Text style={[styles.screenTitle, { color: palette.onSurface }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: palette.onSurfaceMuted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  )

  const renderRoot = () => (
    <>
      <AnimatedEntranceView
        delay={30}
        style={[
          styles.sectionCard,
          styles.heroCard,
          {
            backgroundColor: heroCardBackground,
            borderColor: isCompanyMode
              ? palette.primaryContainerStrong
              : palette.outlineVariant,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: isCompanyMode ? 0.18 : 0.08,
            shadowRadius: 24,
            elevation: isCompanyMode ? 8 : 4,
          },
        ]}>
        <View
          style={[
            styles.heroAccentBar,
            { backgroundColor: isCompanyMode ? palette.primary : materialSolidAccent },
          ]}
        />
        <Text style={[styles.heroKicker, { color: heroKickerColor }]}>
          Центр настроек
        </Text>
        <Text style={[styles.heroTitle, { color: palette.onSurface }]}>
          Настройки и инструменты
        </Text>
        <Text style={[styles.subtitle, { color: secondaryMutedColor }]}>
          Оформление, портал и служебные инструменты в одном месте.
        </Text>
        <View style={styles.heroInfoGrid}>
          <View
            style={[
              styles.heroInfoCard,
              {
                backgroundColor: palette.surface,
                borderColor: isCompanyMode
                  ? palette.primaryContainerStrong
                  : palette.outlineVariant,
              },
            ]}>
            <Text style={[styles.heroInfoLabel, { color: heroKickerColor }]}>Оформление</Text>
            <Text style={[styles.heroInfoValue, { color: palette.onSurface }]}>
              {isAndroid ? (androidTheme.mode === 'company' ? 'Код компании' : 'Material You') : 'iOS'}
            </Text>
          </View>
          <View
            style={[
              styles.heroInfoCard,
              {
                backgroundColor: palette.surface,
                borderColor: isCompanyMode
                  ? palette.primaryContainerStrong
                  : palette.outlineVariant,
              },
            ]}>
            <Text style={[styles.heroInfoLabel, { color: heroKickerColor }]}>Портал</Text>
            <Text style={[styles.heroInfoValue, { color: palette.onSurface }]}>
              {portalStatusLabel}
            </Text>
          </View>
        </View>
      </AnimatedEntranceView>

      <AnimatedEntranceView
        delay={110}
        style={[
          styles.sectionCard,
          styles.rootLinksCard,
          {
            backgroundColor: rootCardBackground,
            borderColor: isCompanyMode ? palette.outlineVariant : palette.outlineVariant,
          },
        ]}>
        <View style={styles.appearanceOptionList}>
            <Pressable
            style={[
              styles.navRow,
              {
                backgroundColor: isCompanyMode
                  ? palette.surface
                  : palette.surface,
                borderColor: isCompanyMode
                  ? palette.primaryContainerStrong
                  : palette.outlineVariant,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: isCompanyMode ? 0.12 : 0.04,
                shadowRadius: 18,
                elevation: isCompanyMode ? 4 : 2,
                minHeight: Platform.OS === 'ios' ? 72 : undefined,
              },
            ]}
            onPress={() => setRoute('appearance')}>
              <View
                style={[
                  styles.navRowBadge,
                  {
                    backgroundColor: accentSurface,
                    borderColor: isCompanyMode
                      ? palette.primaryContainerStrong
                      : palette.outlineVariant,
                    width: Platform.OS === 'ios' ? 42 : undefined,
                    minWidth: Platform.OS === 'ios' ? 42 : undefined,
                    height: Platform.OS === 'ios' ? 42 : undefined,
                    borderRadius: Platform.OS === 'ios' ? 16 : undefined,
                  },
                ]}>
              <MoreNavIcon kind="appearance" color={accentTextColor} />
            </View>
            <View style={styles.navRowTextWrap}>
              <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                Оформление
              </Text>
              <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
                Стиль приложения
              </Text>
              <Text
                style={[
                  styles.navRowSubtitle,
                  { color: secondaryMutedColor },
                ]}>
                {isAndroid
                  ? 'Фирменный стиль Dr.Smoke и Material You.'
                  : 'Настройки оформления приложения.'}
              </Text>
            </View>
            <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
          </Pressable>

          {isAndroid ? (
            <Pressable
              style={[
                styles.navRow,
                {
                  backgroundColor: palette.surface,
                  borderColor: isCompanyMode
                    ? palette.primaryContainerStrong
                    : palette.outlineVariant,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: isCompanyMode ? 0.12 : 0.04,
                  shadowRadius: 18,
                  elevation: isCompanyMode ? 4 : 2,
                  minHeight: Platform.OS === 'ios' ? 72 : undefined,
                },
              ]}
              onPress={() => setRoute('preferences')}>
              <View
                style={[
                  styles.navRowBadge,
                  {
                    backgroundColor: accentSurface,
                    borderColor: isCompanyMode
                      ? palette.primaryContainerStrong
                      : palette.outlineVariant,
                    width: Platform.OS === 'ios' ? 42 : undefined,
                    minWidth: Platform.OS === 'ios' ? 42 : undefined,
                    height: Platform.OS === 'ios' ? 42 : undefined,
                    borderRadius: Platform.OS === 'ios' ? 16 : undefined,
                  },
                ]}>
                <MoreNavIcon kind="preferences" color={accentTextColor} />
              </View>
              <View style={styles.navRowTextWrap}>
                <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                  Персонализация
                </Text>
                <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
                  Анимация и отклик
                </Text>
                <Text
                  style={[
                    styles.navRowSubtitle,
                    { color: secondaryMutedColor },
                ]}>
                  Анимации, отклик и контраст.
                </Text>
              </View>
              <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[
              styles.navRow,
              {
                backgroundColor: isCompanyMode
                  ? palette.surface
                  : palette.surface,
                borderColor: isCompanyMode
                  ? palette.primaryContainerStrong
                  : palette.outlineVariant,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: isCompanyMode ? 0.12 : 0.04,
                shadowRadius: 18,
                elevation: isCompanyMode ? 4 : 2,
                minHeight: Platform.OS === 'ios' ? 72 : undefined,
              },
            ]}
            onPress={() => setRoute('portal')}>
            <View
              style={[
                styles.navRowBadge,
                {
                  backgroundColor: accentSurface,
                  borderColor: isCompanyMode
                    ? palette.primaryContainerStrong
                    : palette.outlineVariant,
                  width: Platform.OS === 'ios' ? 42 : undefined,
                  minWidth: Platform.OS === 'ios' ? 42 : undefined,
                  height: Platform.OS === 'ios' ? 42 : undefined,
                  borderRadius: Platform.OS === 'ios' ? 16 : undefined,
                },
              ]}>
              <MoreNavIcon kind="portal" color={accentTextColor} />
            </View>
            <View style={styles.navRowTextWrap}>
              <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                Инструменты
              </Text>
              <Text style={[styles.navRowTitle, { color: palette.onSurface }]}>
                Доступ на портал
              </Text>
              <Text
                style={[
                  styles.navRowSubtitle,
                  { color: secondaryMutedColor },
                ]}>
                Быстрый вход в портал сотрудника.
              </Text>
            </View>
            <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
          </Pressable>
        </View>
      </AnimatedEntranceView>

    </>
  )

  const renderAppearance = () => (
    <AnimatedEntranceView
      delay={40}
      style={[
        styles.sectionCard,
        styles.appearanceSectionCard,
        {
          backgroundColor: palette.surfaceRaised,
          borderColor: palette.outlineVariant,
        },
      ]}>
      {!isAndroid ? (
        <>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: palette.primaryContainer },
            ]}>
            <Text style={[styles.statusPillText, { color: palette.primaryStrong }]}>
              iOS
            </Text>
          </View>
          <Text style={[styles.heroTitle, { color: palette.onSurface }]}>
            Оформление приложения
          </Text>
          <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
            На iPhone приложение опирается на нативный iOS-стиль. Отдельное переключение тем
            используется только на Android.
          </Text>
        </>
      ) : (
        <View style={styles.rowList}>
          <View style={styles.appearanceIntro}>
            <View
              style={[
                styles.appearanceIntroBar,
                { backgroundColor: isCompanyMode ? companyCardAccent : materialCardAccent },
              ]}
            />
            <Text style={[styles.appearanceIntroKicker, { color: accentTextColor }]}>
              Android Themes
            </Text>
            <Text style={[styles.appearanceIntroText, { color: secondaryMutedColor }]}>
              Выбери фирменный стиль или системную тему. Удержание карточки запускает
              переключение и применяет оформление ко всему приложению.
            </Text>
          </View>

          <Pressable
            style={[
              styles.optionCard,
              {
                backgroundColor: companyCardBackground,
                borderColor: companyCardBorderColor,
                shadowColor: isCompanyMode ? activeCardShadowColor : '#000000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: isCompanyMode ? activeCardShadowOpacity : 0.03,
                shadowRadius: isCompanyMode ? activeCardShadowRadius : 14,
                elevation: isCompanyMode ? activeCardElevation : 2,
              },
            ]}
            delayLongPress={620}
            onLayout={event => handleThemeCardLayout('company', event)}
            onPressIn={event => handleThemePressIn('company', event)}
            onPressOut={() => stopThemeHold()}
            onLongPress={() => commitThemeHold('company')}>
            {renderThemeHoldOverlay('company', COMPANY_THEME_ACCENT)}
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badgeLeft,
                  {
                    backgroundColor: companyBadgeBackground,
                  },
                ]}>
                <Text
                  style={[
                    styles.badgeLeftText,
                    {
                      color: companyBadgeTextColor,
                    },
                  ]}>
                  Фирменный
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: companyRadioBorderColor,
                    backgroundColor: isCompanyMode ? companyCardAccent : 'transparent',
                  },
                ]}>
                {isCompanyMode ? (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: '#FFFFFF' },
                    ]}
                  />
                ) : null}
              </View>
            </View>
            <View style={styles.optionHeader}>
              <Text style={[styles.optionTitle, { color: palette.onSurface }]}>
                Код компании
              </Text>
              <Text style={[styles.optionMeta, { color: companyCardAccent }]}>
                Темный режим
              </Text>
            </View>
            <View style={styles.previewRail}>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: COMPANY_PREVIEW_COLORS[0],
                    borderColor: 'rgba(255,255,255,0.06)',
                  },
                ]}>
                <View
                  style={[
                    styles.previewDot,
                    { backgroundColor: COMPANY_THEME_ACCENT },
                  ]}
                />
                <View
                  style={[
                    styles.previewLine,
                    { backgroundColor: 'rgba(255,255,255,0.18)' },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.previewTall,
                  { backgroundColor: COMPANY_THEME_ACCENT },
                ]}
              />
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: COMPANY_PREVIEW_COLORS[2],
                    borderColor: 'rgba(255,255,255,0.06)',
                  },
                ]}>
                <View
                  style={[
                    styles.previewLine,
                    { backgroundColor: 'rgba(255,255,255,0.9)' },
                  ]}
                />
                <View
                  style={[
                    styles.previewLineShort,
                    { backgroundColor: 'rgba(255,255,255,0.22)' },
                  ]}
                />
              </View>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.optionCard,
              {
                backgroundColor: materialCardBackground,
                borderColor: materialCardBorderColor,
                shadowColor: isMaterialMode ? activeCardShadowColor : '#000000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: isMaterialMode ? activeCardShadowOpacity : 0.03,
                shadowRadius: isMaterialMode ? activeCardShadowRadius : 14,
                elevation: isMaterialMode ? activeCardElevation : 2,
              },
            ]}
            delayLongPress={620}
            onLayout={event => handleThemeCardLayout('material', event)}
            onPressIn={event => handleThemePressIn('material', event)}
            onPressOut={() => stopThemeHold()}
            onLongPress={() => commitThemeHold('material')}>
            {renderThemeHoldOverlay('material', materialSolidAccent)}
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badgeLeft,
                  {
                    backgroundColor: materialBadgePillBackground,
                  },
                ]}>
                <Text
                  style={[
                    styles.badgeLeftText,
                    {
                      color: materialBadgePillTextColor,
                    },
                  ]}>
                  Системная
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: materialRadioBorderColor,
                    backgroundColor: isMaterialMode ? materialCardAccent : 'transparent',
                  },
                ]}>
                {isMaterialMode ? (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: '#FFFFFF' },
                    ]}
                  />
                ) : null}
              </View>
            </View>
            <View style={styles.optionHeader}>
              <Text style={[styles.optionTitle, { color: palette.onSurface }]}>
                Material You
              </Text>
              <Text
                style={[
                  styles.optionMeta,
                  { color: isMaterialMode ? materialCardAccent : secondaryMutedColor },
                ]}>
                Системная тема
              </Text>
            </View>
            <View style={styles.previewRail}>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: materialPreviewCardBackground,
                    borderColor: materialPreviewBorderColor,
                  },
                ]}>
                <View
                  style={[
                    styles.previewDot,
                    { backgroundColor: materialPreviewAccent },
                  ]}
                />
                <View
                  style={[
                    styles.previewLine,
                    { backgroundColor: materialPreviewLineStrong },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.previewTall,
                  { backgroundColor: materialPreviewAccent },
                ]}
              />
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: materialPreviewCardSecondaryBackground,
                    borderColor: materialPreviewBorderColor,
                  },
                ]}>
                <View
                  style={[
                    styles.previewLine,
                    {
                      backgroundColor: materialPreviewLineStrong,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.previewLineShort,
                    {
                      backgroundColor: materialPreviewLineSoft,
                    },
                  ]}
                />
              </View>
            </View>
          </Pressable>

          <View
            style={[
              styles.appearanceNoteCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.outlineVariant,
              },
            ]}>
            <View style={styles.appearanceNoteRow}>
              <View
                style={[
                  styles.appearanceNoteDot,
                  { backgroundColor: isCompanyMode ? companyCardAccent : materialCardAccent },
                ]}
              />
              <Text style={[styles.appearanceNoteLabel, { color: accentTextColor }]}>
                Совместимость
              </Text>
            </View>
            <Text style={[styles.appearanceNoteText, { color: palette.onSurfaceMuted }]}>
              Внешний вид Material You зависит от версии Android и оболочки устройства. На
              некоторых устройствах системная тема может отображаться иначе.
            </Text>
          </View>

        </View>
      )}
    </AnimatedEntranceView>
  )

  const renderPreferences = () => (
    <AnimatedEntranceView
      delay={40}
      style={[
        styles.sectionCard,
        styles.preferencesCard,
        {
          backgroundColor: rootCardBackground,
          borderColor: palette.outlineVariant,
        },
      ]}>
      <View style={styles.preferencesHeaderText}>
        <Text style={[styles.preferencesTitle, { color: palette.onSurface }]}>
          Персонализация
        </Text>
        <Text style={[styles.preferencesSummary, { color: secondaryMutedColor }]}>
          Анимация, отклик и читаемость интерфейса.
        </Text>
      </View>

      <View style={styles.preferencesPanel}>
        <View style={styles.preferencesRow}>
          <View style={styles.preferencesLabelWrap}>
            <Text style={[styles.preferencesTitle, { color: palette.onSurface }]}>
              Интенсивность анимаций
            </Text>
            <Text style={[styles.preferencesSubtitle, { color: secondaryMutedColor }]}>
              Насколько выражено двигаются и появляются элементы интерфейса.
            </Text>
          </View>
          <View style={styles.segmentRow}>
            {([
              ['full', 'Полная'],
              ['standard', 'Стандарт'],
              ['minimal', 'Минимум'],
            ] as const).map(([value, label]) => {
              const isSelected = androidTheme.motionIntensity === value
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: isSelected ? accentSurface : palette.surface,
                      borderColor: isSelected
                        ? isCompanyMode
                          ? palette.primaryStrong
                          : materialPalette.primaryStrong
                        : palette.outlineVariant,
                    },
                    isSelected ? styles.segmentButtonActive : null,
                  ]}
                  onPress={() => {
                    androidRustleHaptic()
                    androidTheme.setMotionIntensity(value)
                  }}>
                  <Text
                    style={[
                      styles.segmentButtonText,
                      { color: isSelected ? accentTextColor : palette.onSurfaceMuted },
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={styles.preferencesRow}>
          <View style={styles.preferencesLabelWrap}>
            <Text style={[styles.preferencesTitle, { color: palette.onSurface }]}>
              Сила отклика
            </Text>
            <Text style={[styles.preferencesSubtitle, { color: secondaryMutedColor }]}>
              Характер вибрации и плотность хаптиков при взаимодействиях.
            </Text>
          </View>
          <View style={styles.segmentRow}>
            {([
              ['soft', 'Мягкий'],
              ['normal', 'Обычный'],
              ['expressive', 'Выразит.'],
            ] as const).map(([value, label]) => {
              const isSelected = androidTheme.hapticStrength === value
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: isSelected ? accentSurface : palette.surface,
                      borderColor: isSelected
                        ? isCompanyMode
                          ? palette.primaryStrong
                          : materialPalette.primaryStrong
                        : palette.outlineVariant,
                    },
                    isSelected ? styles.segmentButtonActive : null,
                  ]}
                  onPress={() => {
                    androidTheme.setHapticStrength(value)
                    androidRustleHaptic()
                  }}>
                  <Text
                    style={[
                      styles.segmentButtonText,
                      { color: isSelected ? accentTextColor : palette.onSurfaceMuted },
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <View style={styles.preferencesRow}>
          <View style={styles.preferencesLabelWrap}>
            <Text style={[styles.preferencesTitle, { color: palette.onSurface }]}>
              Повышенный контраст
            </Text>
            <Text style={[styles.preferencesSubtitle, { color: secondaryMutedColor }]}>
              Усиливает границы, разделители и читаемость в Material You.
            </Text>
          </View>
          <View style={styles.segmentRow}>
            {([
              ['balanced', 'Обычный'],
              ['high', 'Высокий'],
            ] as const).map(([value, label]) => {
              const isSelected = androidTheme.contrastMode === value
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.segmentButton,
                    {
                      backgroundColor: isSelected ? accentSurface : palette.surface,
                      borderColor: isSelected
                        ? isCompanyMode
                          ? palette.primaryStrong
                          : materialPalette.primaryStrong
                        : palette.outlineVariant,
                    },
                    isSelected ? styles.segmentButtonActive : null,
                  ]}
                  onPress={() => {
                    androidRustleHaptic()
                    androidTheme.setContrastMode(value)
                  }}>
                  <Text
                    style={[
                      styles.segmentButtonText,
                      { color: isSelected ? accentTextColor : palette.onSurfaceMuted },
                    ]}>
                    {label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>
    </AnimatedEntranceView>
  )

  const renderPortal = () => (
    <>
      <AnimatedEntranceView
        delay={40}
        style={[
          styles.heroGlowCard,
          {
            backgroundColor: portalHeroBackground,
            borderColor: heroBorderColor,
          },
        ]}>
        <View
          style={[
            styles.heroAccentBar,
            { backgroundColor: isCompanyMode ? palette.primary : materialSolidAccent },
          ]}
        />
        <View
          style={[
            styles.statusPill,
            { backgroundColor: palette.surfaceRaised },
          ]}>
          <Text style={[styles.statusPillText, { color: heroKickerColor }]}>
            Портал
          </Text>
        </View>
        <Text style={[styles.heroTitle, { color: palette.onSurface }]}>
          Доступ на портал
        </Text>
        <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
          Быстрый вход в портал сотрудника с PIN и подтверждением входа.
        </Text>

        <View style={styles.portalHeroGrid}>
          <View style={styles.portalStatRow}>
            <View
              style={[
                styles.portalStatCard,
                {
                  backgroundColor: palette.surfaceRaised,
                  borderColor: palette.outlineVariant,
                },
              ]}>
              <Text style={[styles.portalStatLabel, { color: heroKickerColor }]}>
                Статус
              </Text>
              <Text style={[styles.portalStatValue, { color: palette.onSurface }]}>
                {isPortalLoading ? 'Загрузка…' : portalStatusLabel}
              </Text>
            </View>
            <View
              style={[
                styles.portalStatCard,
                {
                  backgroundColor: palette.surfaceRaised,
                  borderColor: palette.outlineVariant,
                },
              ]}>
              <Text style={[styles.portalStatLabel, { color: heroKickerColor }]}>
                PIN-код
              </Text>
              <Text style={[styles.portalStatValue, { color: palette.onSurface }]}>
                {portalSession.pin || '--------'}
              </Text>
            </View>
          </View>
        </View>
      </AnimatedEntranceView>

      <AnimatedEntranceView
        delay={110}
        style={[
          styles.portalLinkCard,
          {
            backgroundColor: portalPanelBackground,
            borderColor: palette.outlineVariant,
          },
        ]}>
        <Text style={[styles.portalLinkLabel, { color: heroKickerColor }]}>
          Ссылка на портал
        </Text>
        <Text style={[styles.portalLinkValue, { color: palette.onSurface }]}>
          {portalSession.portalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </Text>
        <View style={styles.inlineActionRow}>
          <TouchableOpacity
            style={[
              styles.inlineActionButton,
              {
                backgroundColor: palette.surfaceAccent,
                borderColor: palette.outlineVariant,
              },
            ]}
            onPress={openPortal}>
            <Text style={[styles.inlineActionText, { color: palette.onSurface }]}>
              Открыть в браузере
            </Text>
          </TouchableOpacity>
        </View>
      </AnimatedEntranceView>

      <AnimatedEntranceView
        delay={180}
        style={[
          styles.portalCodeCard,
          {
            backgroundColor: portalSecondaryPanel,
            borderColor: palette.outlineVariant,
          },
        ]}>
        <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
          {portalError
            ? portalError
            : portalSession.status === 'pending_confirm'
              ? 'Введи PIN на портале и подтверди вход в приложении.'
              : portalSession.status === 'active'
                ? 'Сессия активна. При необходимости её можно завершить вручную.'
                : 'Запроси PIN, открой портал и подтверди вход.'}
        </Text>
        {formattedPortalExpiry ? (
          <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
            Действует до: {formattedPortalExpiry}
          </Text>
        ) : null}
      </AnimatedEntranceView>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            {
              backgroundColor: ctaBackground,
              borderColor: ctaBorderColor,
            },
          ]}
          onPress={handlePortalPrimaryAction}
          disabled={isPortalLoading || isPortalRefreshing}>
          <Text style={[styles.primaryButtonText, { color: ctaTextColor }]}>
            {portalActionLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  )

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.background,
        },
      ]}>
      {route === 'portal' ? (
        <View style={styles.staticContainer}>
          {renderHeader('Портал')}
          <View style={styles.portalStaticContent}>
            {renderPortal()}
          </View>
        </View>
      ) : (
        <View style={styles.staticContainer}>
          {route === 'root'
            ? null
            : route === 'appearance'
              ? renderHeader('Оформление')
              : renderHeader('Персонализация')}

          <View style={route === 'root' ? undefined : styles.staticTopContentWrap}>
            {route === 'root' ? renderRoot() : null}
            {route === 'appearance' ? renderAppearance() : null}
            {route === 'preferences' ? renderPreferences() : null}
          </View>
        </View>
      )}
    </View>
  )
}
