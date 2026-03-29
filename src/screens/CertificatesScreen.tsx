import React from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  processColor,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { BlurView } from '@react-native-community/blur'
import { SafeAreaView } from 'react-native-safe-area-context'
import AnimatedEntranceView from '../components/AnimatedEntranceView'
import ElasticScrollView from '../components/ElasticScrollView'
import { useCertificates } from '../features/certificates/useCertificates'
import { useAndroidThemeMode } from '../theme/androidAppTheme'
import {
  type AndroidContrastMode,
  type AndroidThemePalette,
  getAndroidCompanyPalette,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors'
import {
  androidLightImpact,
  androidMediumImpact,
  androidReleaseTick,
  androidRustleHaptic,
  androidSuccessHaptic,
  androidTick,
} from '../utils/androidHaptics'
import { styles } from './CertificatesScreen.styles'

type CertificatesScreenProps = {
  employeeId: string
  isActive?: boolean
  isShiftOpen?: boolean | null
  currentShopName?: string | null
}

type CertificatesMode = 'sell' | 'redeem'

const iosPalette: AndroidThemePalette = {
  background: '#000000',
  surface: '#111111',
  surfaceRaised: '#171717',
  surfaceMuted: '#1C1C1E',
  surfaceAccent: '#202023',
  outline: '#2C2C2E',
  outlineVariant: '#242427',
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
  secondaryButton: '#1B1B1D',
}
const DOUBLE_TAP_HAPTIC_THRESHOLD_MS = 120

function extractPartnerPhoneDigits(value: string) {
  const digits = String(value || '').replace(/\D/g, '')
  return (digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits).slice(0, 10)
}

function formatPartnerPhoneDisplay(local: string) {
  if (!local) {
    return '8'
  }

  const p1 = local.slice(0, 3)
  const p2 = local.slice(3, 6)
  const p3 = local.slice(6, 8)
  const p4 = local.slice(8, 10)

  let out = '8'
  if (p1) out += ` (${p1}`
  if (p1.length === 3) out += ')'
  if (p2) out += ` ${p2}`
  if (p3) out += `-${p3}`
  if (p4) out += `-${p4}`
  return out
}

function formatPartnerPhoneInputWithBackspace(prevValue: string, nextValue: string) {
  if (!nextValue.trim()) {
    return '8'
  }

  if (nextValue.length > prevValue.length) {
    const nextDigits = String(nextValue || '').replace(/\D/g, '')
    if (nextDigits.length > 11) {
      return prevValue
    }
  }

  const prevLocal = extractPartnerPhoneDigits(prevValue)
  const nextLocal = extractPartnerPhoneDigits(nextValue)

  if (nextLocal.length > 10) {
    return prevValue
  }

  if (nextValue.length < prevValue.length && nextLocal.length === prevLocal.length) {
    return formatPartnerPhoneDisplay(prevLocal.slice(0, -1))
  }

  if (!nextLocal.length) {
    return '8'
  }

  return formatPartnerPhoneDisplay(nextLocal)
}

function normalizePartnerPhone(value: string) {
  const local = extractPartnerPhoneDigits(value)
  return local ? `8${local}` : ''
}

function getPalette(
  isAndroid: boolean,
  mode: 'company' | 'material',
  isDark: boolean,
  contrastMode: AndroidContrastMode,
): AndroidThemePalette {
  if (!isAndroid) {
    return iosPalette
  }

  return mode === 'company'
    ? getAndroidCompanyPalette()
    : getAndroidThemePalette(isDark, contrastMode)
}

export default function CertificatesScreen({
  employeeId,
  isActive = true,
  isShiftOpen = null,
  currentShopName = null,
}: CertificatesScreenProps) {
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const isAndroid = Platform.OS === 'android'
  const isMaterialDark = isAndroid && androidTheme.mode === 'material' && colorScheme === 'dark'
  const palette = React.useMemo(
    () => getPalette(isAndroid, androidTheme.mode, colorScheme === 'dark', androidTheme.contrastMode),
    [androidTheme.contrastMode, androidTheme.mode, colorScheme, isAndroid],
  )
  const ctaBackground = palette.primary
  const ctaTextColor = palette.onPrimary
  const refreshAccent =
    isAndroid && androidTheme.mode === 'company'
      ? '#FF6A00'
      : isMaterialDark
        ? '#B7F4E5'
        : '#315F55'
  const refreshSurface =
    isAndroid && androidTheme.mode === 'company'
      ? '#171717'
      : isMaterialDark
        ? '#171C2B'
        : '#F3F7FB'
  const refreshAccentColorValue: any =
    isAndroid && androidTheme.mode === 'company'
      ? '#FF6A00'
      : processColor(palette.primaryStrong ?? palette.primary ?? '#315F55') ?? refreshAccent
  const refreshSurfaceColorValue: any =
    processColor(palette.surfaceRaised ?? refreshSurface) ?? refreshSurface

  const [mode, setMode] = React.useState<CertificatesMode>('sell')
  const [partnerPhone, setPartnerPhone] = React.useState('8')
  const [sellNumber, setSellNumber] = React.useState('')
  const [nominal, setNominal] = React.useState('')
  const [redeemNumber, setRedeemNumber] = React.useState('')
  const [isPullRefreshing, setIsPullRefreshing] = React.useState(false)
  const previewPressStartedAtRef = React.useRef(0)

  const {
    status,
    isSubmitting,
    error,
    successMessage,
    lastCertificate,
    redeemPreview,
    refresh,
    sell,
    loadRedeemPreview,
    redeem,
    clearFeedback,
  } = useCertificates({
    employeeId,
    enabled: isActive,
  })

  const isUnavailable =
    isShiftOpen === false || !status.available || status.shiftStatus !== 'open'
  const accentLabelColor =
    isAndroid && androidTheme.mode === 'company'
      ? palette.primaryStrong
      : isMaterialDark
        ? palette.onSurface
        : palette.primary
  const mutedLabelColor = isMaterialDark
    ? '#C7D0D8'
    : palette.onSurfaceMuted
  const activeSegmentBorder = isMaterialDark
    ? '#A8C8FF'
    : palette.primary
  const activeSegmentBackground =
    isAndroid && androidTheme.mode === 'company'
      ? palette.primaryContainerStrong
      : isMaterialDark
        ? '#232B33'
        : palette.surfaceAccent
  const disabledButtonBackground = palette.surface
  const disabledButtonBorder = palette.outlineVariant
  const disabledButtonTextColor = palette.onSurfaceMuted
  const lockOverlayBackground =
    isAndroid && androidTheme.mode === 'company'
      ? 'rgba(5, 5, 5, 0.58)'
      : isMaterialDark
        ? 'rgba(10, 13, 18, 0.56)'
        : 'rgba(226, 232, 240, 0.42)'
  const lockCardBackground =
    isAndroid && androidTheme.mode === 'company'
      ? 'rgba(18, 18, 18, 0.88)'
      : isMaterialDark
        ? 'rgba(24, 28, 34, 0.86)'
        : 'rgba(255, 255, 255, 0.82)'
  const lockCardBorder =
    isAndroid && androidTheme.mode === 'company'
      ? palette.primaryContainerStrong
      : palette.outline
  const elevatedBorder = isMaterialDark ? palette.outline : palette.outlineVariant
  const lockIconBackground =
    isAndroid && androidTheme.mode === 'company'
      ? palette.primaryContainer
      : isMaterialDark
        ? palette.surfaceAccent
        : palette.surfaceMuted

  const sellDisabled =
    isSubmitting ||
    isUnavailable ||
    !normalizePartnerPhone(partnerPhone) ||
    !sellNumber.trim() ||
    !nominal.trim()

  const previewDisabled = isSubmitting || isUnavailable || !redeemNumber.trim()
  const redeemDisabled =
    isSubmitting || isUnavailable || !redeemPreview?.canRedeem || !redeemPreview.certificateNumber

  const heroBorderColor =
    isAndroid && androidTheme.mode === 'company'
      ? palette.primaryContainerStrong
      : elevatedBorder
  const shopDisplay =
    currentShopName?.trim() ||
    status.shopName?.trim() ||
    (status.shopId ? `#${status.shopId}` : 'Не определён')
  const modeCardAccent =
    mode === 'sell'
      ? palette.primaryStrong
      : isMaterialDark
        ? '#A8C8FF'
        : palette.secondary

  React.useEffect(() => {
    if (!isActive || !employeeId) {
      return
    }

    refresh()
  }, [employeeId, isActive, refresh])

  React.useEffect(() => {
    if (isShiftOpen === false) {
      clearFeedback()
      return
    }

    if (isShiftOpen === true && isActive && employeeId) {
      refresh()
    }
  }, [clearFeedback, employeeId, isActive, isShiftOpen, refresh])

  const handleSell = React.useCallback(async () => {
    if (isUnavailable) {
      return
    }

    clearFeedback()

    await sell({
      certificateNumber: sellNumber.trim(),
      partnerPhone: normalizePartnerPhone(partnerPhone),
      nominal: Number(nominal),
    })
  }, [clearFeedback, isUnavailable, nominal, partnerPhone, sell, sellNumber])

  const handlePreviewRedeem = React.useCallback(async () => {
    if (isUnavailable) {
      return
    }

    clearFeedback()
    await loadRedeemPreview({
      certificateNumber: redeemNumber.trim(),
    })
  }, [clearFeedback, isUnavailable, loadRedeemPreview, redeemNumber])

  const handleRedeem = React.useCallback(async () => {
    if (isUnavailable) {
      return
    }

    clearFeedback()
    await redeem({
      certificateNumber: redeemNumber.trim(),
    })
  }, [clearFeedback, isUnavailable, redeem, redeemNumber])

  const handlePullToRefresh = React.useCallback(async () => {
    androidRustleHaptic()
    setIsPullRefreshing(true)
    try {
      await refresh()
    } finally {
      setIsPullRefreshing(false)
    }
  }, [refresh])

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}>
      <ElasticScrollView
        scrollEnabled={!isUnavailable}
        enableTopElastic={false}
        enableBottomElastic
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isPullRefreshing}
            onRefresh={() => {
              handlePullToRefresh().catch(() => {})
            }}
            tintColor={refreshAccentColorValue}
            colors={[refreshAccentColorValue]}
            progressBackgroundColor={refreshSurfaceColorValue}
          />
        }>
        <AnimatedEntranceView
          delay={30}
        style={[
          styles.heroCard,
          {
            backgroundColor: palette.surfaceRaised,
            borderColor: heroBorderColor,
          },
        ]}>
          <View style={[styles.heroAccent, { backgroundColor: palette.primary }]} />
          <Text style={[styles.kicker, { color: accentLabelColor }]}>Инструменты</Text>
          <Text style={[styles.title, { color: palette.onSurface }]}>Работа с сертификатами</Text>
          <Text style={[styles.subtitle, { color: palette.onSurfaceMuted }]}>
            Продажа и обналичивание сертификатов, теперь прямо в приложении.
          </Text>
          <View
            style={[
              styles.heroShopCard,
              {
                backgroundColor: palette.surface,
                borderColor: isAndroid && androidTheme.mode === 'company'
                  ? palette.primaryContainerStrong
                  : elevatedBorder,
              },
            ]}>
            <Text
              style={[
                styles.heroShopLabel,
                {
                  color:
                    isAndroid && androidTheme.mode === 'company'
                      ? palette.primaryStrong
                      : palette.onSurface,
                },
              ]}>
              Магазин смены
            </Text>
            <Text style={[styles.heroShopValue, { color: palette.onSurface }]}>
              {shopDisplay}
            </Text>
          </View>
        </AnimatedEntranceView>

        <AnimatedEntranceView delay={90} style={styles.segmentRow}>
          {(['sell', 'redeem'] as CertificatesMode[]).map(segment => {
            const isSegmentActive = mode === segment
            return (
              <Pressable
                key={segment}
                onPress={() => {
                  clearFeedback()
                  androidLightImpact()
                  setMode(segment)
                }}
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor: isSegmentActive
                      ? activeSegmentBackground
                      : palette.surfaceRaised,
                    borderColor: isSegmentActive
                      ? activeSegmentBorder
                      : elevatedBorder,
                  },
                ]}>
                <Text style={[styles.segmentTitle, { color: palette.onSurface }]}>
                  {segment === 'sell' ? 'Продать' : 'Обналичить'}
                </Text>
                <Text style={[styles.segmentSubtitle, { color: mutedLabelColor }]}>
                  {segment === 'sell' ? 'Новый сертификат' : 'Проданный сертификат'}
                </Text>
              </Pressable>
            )
          })}
        </AnimatedEntranceView>

        <AnimatedEntranceView
          delay={150}
          style={[
            styles.panel,
            {
              backgroundColor: palette.surfaceRaised,
              borderColor: elevatedBorder,
            },
          ]}>
          <View
            style={[
              styles.modeAccentLine,
              { backgroundColor: modeCardAccent },
            ]}
          />
          <View style={styles.panelHeader}>
            <Text style={[styles.panelKicker, { color: accentLabelColor }]}>
              {mode === 'sell' ? 'Продажа сертификата' : 'Обналичивание сертификата'}
            </Text>
            <Text style={[styles.panelTitle, { color: palette.onSurface }]}>
              {mode === 'sell'
                ? 'Введи данные партнёра, номер сертификата и номинал'
                : 'Проверь сертификат и подтверди обналичивание'}
            </Text>
          </View>

          {mode === 'sell' ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: mutedLabelColor }]}>Телефон партнёра</Text>
                <TextInput
                  value={partnerPhone}
                  onChangeText={value =>
                    setPartnerPhone(prevValue => formatPartnerPhoneInputWithBackspace(prevValue, value))
                  }
                  keyboardType="phone-pad"
                  placeholder="8 (900) 000-00-00"
                  placeholderTextColor={mutedLabelColor}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.surface,
                      borderColor: elevatedBorder,
                      color: palette.onSurface,
                    },
                  ]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: mutedLabelColor }]}>Номер сертификата</Text>
                <TextInput
                  value={sellNumber}
                  onChangeText={setSellNumber}
                  autoCapitalize="characters"
                  placeholder="Например: 12345678"
                  placeholderTextColor={mutedLabelColor}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.surface,
                      borderColor: elevatedBorder,
                      color: palette.onSurface,
                    },
                  ]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: mutedLabelColor }]}>Номинал</Text>
                <TextInput
                  value={nominal}
                  onChangeText={value => setNominal(value.replace(/[^\d]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="От 1000"
                  placeholderTextColor={mutedLabelColor}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.surface,
                      borderColor: elevatedBorder,
                      color: palette.onSurface,
                    },
                  ]}
                />
                <Text style={[styles.helper, { color: mutedLabelColor }]}>
                  Бот принимает только целое число без копеек и не меньше 1000 рублей.
                </Text>
              </View>

              <TouchableOpacity
                disabled={sellDisabled}
                onPress={() => {
                  androidMediumImpact()
                  handleSell()
                }}
                style={[
                  styles.ctaButton,
                  sellDisabled
                    ? {
                        backgroundColor: disabledButtonBackground,
                        borderColor: disabledButtonBorder,
                      }
                    : {
                        backgroundColor: ctaBackground,
                        borderColor: palette.primaryStrong,
                      },
                  sellDisabled ? styles.ctaButtonDisabled : null,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color={ctaTextColor} />
                ) : (
                  <Text
                    style={[
                      styles.ctaButtonText,
                      { color: sellDisabled ? disabledButtonTextColor : ctaTextColor },
                    ]}>
                    Продать сертификат
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: mutedLabelColor }]}>Номер сертификата</Text>
                <TextInput
                  value={redeemNumber}
                  onChangeText={setRedeemNumber}
                  autoCapitalize="characters"
                  placeholder="Введите номер сертификата"
                  placeholderTextColor={mutedLabelColor}
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.surface,
                      borderColor: elevatedBorder,
                      color: palette.onSurface,
                    },
                  ]}
                />
              </View>

              <TouchableOpacity
                disabled={previewDisabled}
                onPressIn={() => {
                  if (!previewDisabled) {
                    previewPressStartedAtRef.current = Date.now()
                    androidTick()
                  }
                }}
                onPressOut={() => {
                  if (!previewDisabled) {
                    if (
                      Date.now() - previewPressStartedAtRef.current >
                      DOUBLE_TAP_HAPTIC_THRESHOLD_MS
                    ) {
                      androidReleaseTick()
                    }
                    previewPressStartedAtRef.current = 0
                  }
                }}
                onPress={() => {
                  handlePreviewRedeem()
                }}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: palette.secondaryButton,
                    borderColor: elevatedBorder,
                  },
                  previewDisabled ? styles.ctaButtonDisabled : null,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color={palette.onSurface} />
                ) : (
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      {
                        color: previewDisabled
                          ? disabledButtonTextColor
                          : palette.onSurface,
                      },
                    ]}>
                    Проверить сертификат
                  </Text>
                )}
              </TouchableOpacity>

              {redeemPreview ? (
                <View
                  style={[
                    styles.feedbackCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: elevatedBorder,
                    },
                  ]}>
                  <Text style={[styles.feedbackTitle, { color: palette.onSurface }]}>
                    Сертификат найден
                  </Text>
                  <Text style={[styles.feedbackText, { color: mutedLabelColor }]}>
                    Номер: {redeemPreview.certificateNumber}
                  </Text>
                  <Text style={[styles.feedbackText, { color: mutedLabelColor }]}>
                    Номинал: {redeemPreview.nominal ?? '-'} руб.
                  </Text>
                  <Text style={[styles.feedbackText, { color: mutedLabelColor }]}>
                    Статус: {redeemPreview.status || 'Не определён'}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                disabled={redeemDisabled}
                onPress={() => {
                  androidSuccessHaptic()
                  handleRedeem()
                }}
                style={[
                  styles.ctaButton,
                  redeemDisabled
                    ? {
                        backgroundColor: disabledButtonBackground,
                        borderColor: disabledButtonBorder,
                      }
                    : {
                        backgroundColor: ctaBackground,
                        borderColor: palette.primaryStrong,
                      },
                  redeemDisabled ? styles.ctaButtonDisabled : null,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color={ctaTextColor} />
                ) : (
                  <Text
                    style={[
                      styles.ctaButtonText,
                      { color: redeemDisabled ? disabledButtonTextColor : ctaTextColor },
                    ]}>
                    Обналичить сертификат
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </AnimatedEntranceView>

        {!isUnavailable && error ? (
          <AnimatedEntranceView
            delay={210}
            style={[
              styles.feedbackCard,
              {
                backgroundColor: palette.errorContainer,
                borderColor: palette.errorBorder,
              },
            ]}>
            <Text style={[styles.feedbackTitle, { color: palette.error }]}>Ошибка</Text>
            <Text style={[styles.feedbackText, { color: palette.onSurface }]}>{error}</Text>
          </AnimatedEntranceView>
        ) : null}

        {!isUnavailable && successMessage ? (
          <AnimatedEntranceView
            delay={210}
            style={[
              styles.feedbackCard,
              {
                backgroundColor: palette.successContainer,
                borderColor: palette.successBorder,
              },
            ]}>
            <Text style={[styles.feedbackTitle, { color: palette.success }]}>Готово</Text>
            <Text style={[styles.feedbackText, { color: palette.onSurface }]}>
              {successMessage}
            </Text>
            {lastCertificate?.certificateNumber ? (
              <Text style={[styles.feedbackText, { color: mutedLabelColor }]}>
                Сертификат: {lastCertificate.certificateNumber}
              </Text>
            ) : null}
          </AnimatedEntranceView>
        ) : null}

      </ElasticScrollView>
      {isUnavailable ? (
        <View pointerEvents="auto" style={styles.lockOverlay}>
          <BlurView
            style={styles.lockBlur}
            blurType={isMaterialDark ? 'dark' : 'light'}
            blurAmount={18}
            reducedTransparencyFallbackColor={refreshSurface}
          />
          <View style={[styles.lockTint, { backgroundColor: lockOverlayBackground }]} />
          <View
            style={[
              styles.lockCard,
              {
                backgroundColor: lockCardBackground,
                borderColor: lockCardBorder,
              },
            ]}>
            <View
              style={[
                styles.lockIconWrap,
                {
                  backgroundColor: lockIconBackground,
                  borderColor: lockCardBorder,
                },
              ]}>
              <Text style={[styles.lockIconText, { color: accentLabelColor }]}>!</Text>
            </View>
            <Text style={[styles.lockTitle, { color: palette.onSurface }]}>
              Работа с сертификатами временно недоступна
            </Text>
            <Text style={[styles.lockText, { color: mutedLabelColor }]}>
              Продажа и обналичивание доступны только при открытой смене. После открытия
              смены раздел разблокируется автоматически.
            </Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  )
}
