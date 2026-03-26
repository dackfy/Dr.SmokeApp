import React from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCertificates } from '../features/certificates/useCertificates'
import { useAndroidThemeMode } from '../theme/androidAppTheme'
import {
  type AndroidThemePalette,
  getAndroidCompanyPalette,
  getAndroidStatusBarStyle,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors'
import { styles } from './CertificatesScreen.styles'

type CertificatesScreenProps = {
  employeeId: string
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

function formatPartnerPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '')
  const local = (digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits).slice(0, 10)

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

function normalizePartnerPhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '')
  const local = (digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits).slice(0, 10)
  return local ? `8${local}` : ''
}

function getPalette(
  isAndroid: boolean,
  mode: 'company' | 'material',
  isDark: boolean,
): AndroidThemePalette {
  if (!isAndroid) {
    return iosPalette
  }

  return mode === 'company'
    ? getAndroidCompanyPalette()
    : getAndroidThemePalette(isDark)
}

export default function CertificatesScreen({
  employeeId,
}: CertificatesScreenProps) {
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const isAndroid = Platform.OS === 'android'
  const isMaterialDark = isAndroid && androidTheme.mode === 'material' && colorScheme === 'dark'
  const palette = React.useMemo(
    () => getPalette(isAndroid, androidTheme.mode, colorScheme === 'dark'),
    [androidTheme.mode, colorScheme, isAndroid],
  )
  const ctaBackground = String(palette.primary)
  const ctaTextColor = isMaterialDark
    ? '#FFFFFF'
    : getAndroidStatusBarStyle(ctaBackground) === 'dark-content'
      ? '#08120F'
      : '#FFFFFF'

  const [mode, setMode] = React.useState<CertificatesMode>('sell')
  const [partnerPhone, setPartnerPhone] = React.useState('8')
  const [sellNumber, setSellNumber] = React.useState('')
  const [nominal, setNominal] = React.useState('')
  const [redeemNumber, setRedeemNumber] = React.useState('')

  const {
    status,
    isLoading,
    isRefreshing,
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
    enabled: true,
  })

  const isUnavailable = !status.available
  const accentLabelColor = isMaterialDark
    ? '#EAF0F5'
    : String(palette.primary)
  const mutedLabelColor = isMaterialDark
    ? '#C7D0D8'
    : String(palette.onSurfaceMuted)
  const activeSegmentBorder = isMaterialDark
    ? '#A8C8FF'
    : String(palette.primary)
  const activeSegmentBackground =
    isAndroid && androidTheme.mode === 'company'
      ? String(palette.primaryContainerStrong)
      : isMaterialDark
        ? '#232B33'
        : String(palette.surfaceAccent)
  const disabledButtonBackground = String(palette.surface)
  const disabledButtonBorder = String(palette.outlineVariant)
  const disabledButtonTextColor = String(palette.onSurfaceMuted)
  const statusHint =
    status.shiftStatus === 'open'
      ? 'Раздел доступен для работы.'
      : 'Для продажи и обналичивания сертификатов нужно открыть смену.'

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
      ? String(palette.primaryContainerStrong)
      : String(palette.outlineVariant)

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

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: String(palette.background) }]}
      edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: String(palette.surfaceRaised),
              borderColor: heroBorderColor,
            },
          ]}>
          <Text style={[styles.kicker, { color: accentLabelColor }]}>Инструменты</Text>
          <Text style={[styles.title, { color: String(palette.onSurface) }]}>Работа с сертификатами</Text>
          <Text style={[styles.subtitle, { color: String(palette.onSurfaceMuted) }]}>
            Продажа и обналичивание сертификатов по логике Telegram-бота, теперь прямо в приложении.
          </Text>

          <View style={styles.row}>
            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: String(palette.surface),
                  borderColor: String(palette.outlineVariant),
                },
              ]}>
              <Text style={[styles.statLabel, { color: mutedLabelColor }]}>Статус</Text>
              <Text style={[styles.statValue, { color: status.available ? String(palette.success) : String(palette.error) }]}>
                {status.available ? 'Готово' : 'Недоступно'}
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                {
                  backgroundColor: String(palette.surface),
                  borderColor: String(palette.outlineVariant),
                },
              ]}>
              <Text style={[styles.statLabel, { color: mutedLabelColor }]}>Магазин смены</Text>
              <Text style={[styles.statValue, { color: String(palette.onSurface) }]}>
                {status.shopId ? `#${status.shopId}` : 'Не определён'}
              </Text>
            </View>
          </View>
          <Text style={[styles.helper, { color: mutedLabelColor }]}>{statusHint}</Text>
        </View>

        <View style={styles.segmentRow}>
          {(['sell', 'redeem'] as CertificatesMode[]).map(segment => {
            const isActive = mode === segment
            return (
              <Pressable
                key={segment}
                onPress={() => {
                  clearFeedback()
                  setMode(segment)
                }}
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor: isActive
                      ? activeSegmentBackground
                      : String(palette.surfaceRaised),
                    borderColor: isActive
                      ? activeSegmentBorder
                      : String(palette.outlineVariant),
                  },
                ]}>
                <Text style={[styles.segmentTitle, { color: String(palette.onSurface) }]}>
                  {segment === 'sell' ? 'Продать' : 'Обналичить'}
                </Text>
                <Text style={[styles.segmentSubtitle, { color: mutedLabelColor }]}>
                  {segment === 'sell' ? 'Новый сертификат' : 'Проданный сертификат'}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View
          style={[
            styles.panel,
            {
              backgroundColor: String(palette.surfaceRaised),
              borderColor: String(palette.outlineVariant),
            },
          ]}>
          <View style={styles.panelHeader}>
            <Text style={[styles.panelKicker, { color: accentLabelColor }]}>
              {mode === 'sell' ? 'Продажа сертификата' : 'Обналичивание сертификата'}
            </Text>
            <Text style={[styles.panelTitle, { color: String(palette.onSurface) }]}>
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
                  onChangeText={value => setPartnerPhone(formatPartnerPhone(value))}
                  keyboardType="phone-pad"
                  placeholder="8 (900) 000-00-00"
                  placeholderTextColor={mutedLabelColor}
                  style={[
                    styles.input,
                    {
                      backgroundColor: String(palette.surface),
                      borderColor: String(palette.outlineVariant),
                      color: String(palette.onSurface),
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
                      backgroundColor: String(palette.surface),
                      borderColor: String(palette.outlineVariant),
                      color: String(palette.onSurface),
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
                      backgroundColor: String(palette.surface),
                      borderColor: String(palette.outlineVariant),
                      color: String(palette.onSurface),
                    },
                  ]}
                />
                <Text style={[styles.helper, { color: mutedLabelColor }]}>
                  Бот принимает только целое число без копеек и не меньше 1000 рублей.
                </Text>
              </View>

              <TouchableOpacity
                disabled={sellDisabled}
                onPress={handleSell}
                style={[
                  styles.ctaButton,
                  sellDisabled
                    ? {
                        backgroundColor: disabledButtonBackground,
                        borderColor: disabledButtonBorder,
                      }
                    : {
                        backgroundColor: ctaBackground,
                        borderColor: String(palette.primaryStrong),
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
                      backgroundColor: String(palette.surface),
                      borderColor: String(palette.outlineVariant),
                      color: String(palette.onSurface),
                    },
                  ]}
                />
              </View>

              <TouchableOpacity
                disabled={previewDisabled}
                onPress={handlePreviewRedeem}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: String(palette.secondaryButton),
                    borderColor: String(palette.outlineVariant),
                  },
                  previewDisabled ? styles.ctaButtonDisabled : null,
                ]}>
                {isSubmitting ? (
                  <ActivityIndicator color={String(palette.onSurface)} />
                ) : (
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      {
                        color: previewDisabled
                          ? disabledButtonTextColor
                          : String(palette.onSurface),
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
                      backgroundColor: String(palette.surface),
                      borderColor: String(palette.outlineVariant),
                    },
                  ]}>
                  <Text style={[styles.feedbackTitle, { color: String(palette.onSurface) }]}>
                    Сертификат найден
                  </Text>
                  <Text style={[styles.feedbackText, { color: mutedLabelColor }]}>
                    Номер: {redeemPreview.certificateNumber}
                  </Text>
                  <Text style={[styles.feedbackText, { color: mutedLabelColor }]}>
                    Номинал: {redeemPreview.nominal ?? '-'} руб.
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                disabled={redeemDisabled}
                onPress={handleRedeem}
                style={[
                  styles.ctaButton,
                  redeemDisabled
                    ? {
                        backgroundColor: disabledButtonBackground,
                        borderColor: disabledButtonBorder,
                      }
                    : {
                        backgroundColor: ctaBackground,
                        borderColor: String(palette.primaryStrong),
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
        </View>

        {error ? (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor: String(palette.errorContainer),
                borderColor: String(palette.errorBorder),
              },
            ]}>
            <Text style={[styles.feedbackTitle, { color: String(palette.error) }]}>Ошибка</Text>
            <Text style={[styles.feedbackText, { color: String(palette.onSurface) }]}>{error}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor: String(palette.successContainer),
                borderColor: String(palette.successBorder),
              },
            ]}>
            <Text style={[styles.feedbackTitle, { color: String(palette.success) }]}>Готово</Text>
            <Text style={[styles.feedbackText, { color: String(palette.onSurface) }]}>
              {successMessage}
            </Text>
            {lastCertificate?.certificateNumber ? (
              <Text style={[styles.feedbackText, { color: mutedLabelColor }]}>
                Сертификат: {lastCertificate.certificateNumber}
              </Text>
            ) : null}
          </View>
        ) : null}

        <TouchableOpacity
          disabled={isRefreshing || isLoading}
          onPress={refresh}
          style={[
            styles.secondaryButton,
            {
              backgroundColor: String(palette.secondaryButton),
              borderColor: String(palette.outlineVariant),
            },
          ]}>
          {isRefreshing || isLoading ? (
            <ActivityIndicator color={String(palette.onSurface)} />
          ) : (
            <Text style={[styles.secondaryButtonText, { color: String(palette.onSurface) }]}>
              Обновить статус
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
