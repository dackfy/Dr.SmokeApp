import React from 'react'
import {
  Animated,
  Alert,
  ActivityIndicator,
  Easing,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Image,
  Modal,
  PermissionsAndroid,
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { launchCamera } from 'react-native-image-picker'
import type { AuthSession } from '../features/auth/types'
import { useShiftFlow } from '../features/shift/useShiftFlow'
import { styles } from './ShiftScreen.styles'
import LiquidTabBar from '../components/LiquidTabBar'
import type { TabKey } from '../components/LiquidTabBar'
import { buildApiUrl } from '../config/api'

type ShiftScreenProps = {
  session: AuthSession
  onLogout: () => void
  onBack?: () => void
  onGoHome?: () => void
  onGoMail?: () => void
  onGoTrash?: () => void
  onGoProfile?: () => void
  activeTab?: TabKey
  showHeaderActions?: boolean
  showTabBar?: boolean
}

type DcHistoryItem = {
  id: number
  date: string | null
  reason: string
  points: number | string
}

type ScheduleItem = {
  id: number
  date: string
  duty: string | null
  shop_id: number | null
  shop_name: string | null
  address_street: string | null
  address_number: string | null
  opening_time: string | null
  closing_time: string | null
}

const homeIcon = require('../assets/icons/home.png')
const profileIcon = require('../assets/icons/more.png')
const mailIcon = require('../assets/icons/mail.png')
const trashIcon = require('../assets/icons/trash.png')

function formatDateTime(value?: string) {
  if (!value) return '-'

  const normalized = value.trim()
  if (!normalized) return '-'

  const mysqlDateTimeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(:\d{2})?$/)
  if (mysqlDateTimeMatch) {
    const [, year, month, day, hour, minute] = mysqlDateTimeMatch
    return `${day}.${month}.${year}, ${hour}:${minute}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

function formatShortDateTime(value?: string | null) {
  if (!value) return '—'

  const normalized = String(value).trim()
  if (!normalized) return '—'

  const mysqlDateTimeMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  if (mysqlDateTimeMatch) {
    const [, year, month, day, hour, minute] = mysqlDateTimeMatch
    return `${day}.${month}.${year}, ${hour}:${minute}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return '—'

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function formatPoints(value: number | string) {
  const parsed =
    typeof value === 'number'
      ? value
      : Number(String(value).replace(/\s/g, '').replace(',', '.'))

  if (!Number.isFinite(parsed)) return String(value ?? '0')
  const abs = Math.trunc(Math.abs(parsed))
  return `${parsed >= 0 ? '+' : '-'}${new Intl.NumberFormat('ru-RU').format(abs)}`
}

function capitalizeFirst(value: string) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatScheduleDate(dateValue: string) {
  const raw = String(dateValue || '').trim()
  if (!raw) return '—'
  const parsed = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return raw
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(parsed)
}

function formatScheduleWeekday(dateValue: string) {
  const raw = String(dateValue || '').trim()
  if (!raw) return '—'
  const parsed = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return '—'
  return capitalizeFirst(new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(parsed))
}

function normalizeClock(value?: string | null) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const hhmmss = raw.match(/^(\d{2}):(\d{2})(:\d{2})?$/)
  if (hhmmss) {
    return `${hhmmss[1]}:${hhmmss[2]}`
  }
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return ''
  const hours = String(parsed.getHours()).padStart(2, '0')
  const minutes = String(parsed.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function isDutyShift(value?: string | null) {
  return String(value || '').trim().toLowerCase() === 'дежурный'
}

async function ensureCameraPermission() {
  if (Platform.OS !== 'android') {
    return true
  }

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
  return granted === PermissionsAndroid.RESULTS.GRANTED
}

async function takePhoto(
  onSuccess: (uri: string) => void,
  cameraType: 'back' | 'front' = 'back',
) {
  try {
    const hasPermission = await ensureCameraPermission()
    if (!hasPermission) {
      Alert.alert('Нет доступа к камере', 'Разрешите доступ к камере в настройках устройства.')
      return
    }

    const result = await launchCamera({
      mediaType: 'photo',
      cameraType,
      quality: 0.7,
      saveToPhotos: false,
    })

    if (result.didCancel) return

    if (result.errorCode) {
      Alert.alert('Ошибка камеры', result.errorMessage || 'Не удалось сделать фото')
      return
    }

    const uri = result.assets?.[0]?.uri

    if (!uri) {
      Alert.alert('Ошибка', 'Фото не получено')
      return
    }

    onSuccess(uri)
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes('launchCamera')
        ? 'Модуль камеры не подключен в сборке. Пересоберите приложение после установки react-native-image-picker.'
        : 'Не удалось открыть камеру.'

    Alert.alert('Ошибка камеры', message)
  }
}

export default function ShiftScreen({
  session,
  onLogout,
  onBack,
  onGoHome,
  onGoMail,
  onGoTrash,
  onGoProfile,
  activeTab = 'home',
  showHeaderActions = true,
  showTabBar = true,
}: ShiftScreenProps) {
  const [isShopDropdownOpen, setIsShopDropdownOpen] = React.useState(false)
  const [focusedField, setFocusedField] = React.useState<string | null>(null)
  const [dcBalance, setDcBalance] = React.useState<number | null>(null)
  const [dcHistory, setDcHistory] = React.useState<DcHistoryItem[]>([])
  const [scheduleItems, setScheduleItems] = React.useState<ScheduleItem[]>([])
  const [isScheduleLoading, setIsScheduleLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isDcHistoryExpanded, setIsDcHistoryExpanded] = React.useState(false)
  const dcHistoryAnim = React.useRef(new Animated.Value(0)).current
  const shiftErrorOpacity = React.useRef(new Animated.Value(0)).current
  const shiftNoticeOpacity = React.useRef(new Animated.Value(0)).current
  const cashAccessoryId = 'shift-cash-accessory'

  const {
    mode,
    openStep,
    closeStep,
    closeEditTarget,
    status,
    availableShops,
    openDraft,
    closeDraft,
    canStartOpening,
    canStartClosing,
    isLoading,
    isSubmitting,
    error,
    notice,
    actions,
  } = useShiftFlow(session.user)

  const fullName = [session.user.name, session.user.lastName].filter(Boolean).join(' ')
  const displayName = fullName || session.user.email

  const loadDcData = React.useCallback(async () => {
    try {
      const [balanceRes, historyRes] = await Promise.all([
        fetch(buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/dc-balance`)),
        fetch(buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/dc-history`)),
      ])

      if (!balanceRes.ok) {
        throw new Error(`Balance HTTP ${balanceRes.status}`)
      }

      const balanceData = (await balanceRes.json()) as { dc_balance?: number | null }
      const nextBalance = Number(balanceData.dc_balance ?? 0)
      setDcBalance(Number.isFinite(nextBalance) ? nextBalance : 0)

      if (historyRes.ok) {
        const historyData = (await historyRes.json()) as { history?: DcHistoryItem[] }
        setDcHistory(Array.isArray(historyData.history) ? historyData.history.slice(0, 5) : [])
      } else {
        setDcHistory([])
      }
    } catch {
      setDcBalance(null)
      setDcHistory([])
    }
  }, [session.user.id])

  const loadScheduleData = React.useCallback(async () => {
    try {
      const res = await fetch(
        buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/schedule/upcoming?days=30`),
      )

      if (!res.ok) {
        throw new Error(`Schedule HTTP ${res.status}`)
      }

      const data = (await res.json()) as { schedule?: ScheduleItem[] }
      setScheduleItems(Array.isArray(data.schedule) ? data.schedule : [])
    } catch {
      setScheduleItems([])
    } finally {
      setIsScheduleLoading(false)
    }
  }, [session.user.id])

  React.useEffect(() => {
    loadDcData()
  }, [loadDcData])

  React.useEffect(() => {
    loadScheduleData()
  }, [loadScheduleData])

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([actions.refresh(), loadDcData(), loadScheduleData()])
    } finally {
      setIsRefreshing(false)
    }
  }, [actions, loadDcData, loadScheduleData])

  const balanceValue =
    dcBalance === null
      ? '— Dℂ'
      : `${new Intl.NumberFormat('ru-RU').format(dcBalance)} Dℂ`

  const collapseDcHistory = React.useCallback(() => {
    if (!isDcHistoryExpanded) return
    setIsDcHistoryExpanded(false)
    Animated.timing(dcHistoryAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [dcHistoryAnim, isDcHistoryExpanded])

  const toggleDcHistory = React.useCallback(() => {
    const nextExpanded = !isDcHistoryExpanded
    setIsDcHistoryExpanded(nextExpanded)
    Animated.timing(dcHistoryAnim, {
      toValue: nextExpanded ? 1 : 0,
      duration: nextExpanded ? 320 : 220,
      easing: nextExpanded ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [dcHistoryAnim, isDcHistoryExpanded])

  const historyAnimatedStyle = React.useMemo(
    () => ({
      maxHeight: dcHistoryAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 320],
      }),
      opacity: dcHistoryAnim.interpolate({
        inputRange: [0, 0.25, 1],
        outputRange: [0, 0.45, 1],
      }),
      transform: [
        {
          translateY: dcHistoryAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-4, 0],
          }),
        },
      ],
    }),
    [dcHistoryAnim],
  )
  const profileLetter = (session.user.email?.trim()?.charAt(0) || 'П').toUpperCase()
  const shiftShopDisplay = status.openedShift?.shopName
  const shiftOpenedAtDisplay = status.openedShift
    ? formatDateTime(status.openedShift.openedAt)
    : null

  const switchTab = React.useCallback(
    (nextTab: TabKey) => {
      if (nextTab === 'home') {
        onGoHome?.()
        return
      }
      collapseDcHistory()
      if (nextTab === 'mail') {
        onGoMail?.()
        return
      }
      if (nextTab === 'trash') {
        onGoTrash?.()
        return
      }
      onGoProfile?.()
    },
    [collapseDcHistory, onGoHome, onGoMail, onGoProfile, onGoTrash],
  )

  React.useEffect(() => {
    if (openStep !== 'shop') {
      setIsShopDropdownOpen(false)
    }
  }, [openStep])

  React.useEffect(() => {
    if (!error) {
      shiftErrorOpacity.setValue(0)
      return
    }

    Animated.timing(shiftErrorOpacity, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()

    const hideTimer = setTimeout(() => {
      Animated.timing(shiftErrorOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          actions.clearError()
        }
      })
    }, 3000)

    return () => {
      clearTimeout(hideTimer)
    }
  }, [actions, error, shiftErrorOpacity])

  React.useEffect(() => {
    if (!notice) {
      shiftNoticeOpacity.setValue(0)
      return
    }

    Animated.timing(shiftNoticeOpacity, {
      toValue: 1,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()

    const hideTimer = setTimeout(() => {
      Animated.timing(shiftNoticeOpacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          actions.clearNotice()
        }
      })
    }, 3000)

    return () => {
      clearTimeout(hideTimer)
    }
  }, [actions, notice, shiftNoticeOpacity])

  React.useEffect(() => {
    if (activeTab !== 'home') {
      collapseDcHistory()
    }
  }, [activeTab, collapseDcHistory])

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
              colors={['#FF6A00']}
              progressBackgroundColor="#111111"
            />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScrollBeginDrag={Keyboard.dismiss}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.94}
            style={[
              styles.balanceFlashCard,
              isDcHistoryExpanded ? styles.balanceFlashCardActive : null,
            ]}
            onPress={toggleDcHistory}
            accessibilityRole="button"
            accessibilityLabel="Показать историю начислений Dℂ">
            <View style={styles.balanceFlashHeader}>
              <View style={styles.balanceFlashIconCircle}>
                <Text style={styles.balanceFlashIconText}>Dℂ</Text>
              </View>
              <View style={styles.balanceFlashTextBlock}>
                <Text style={styles.balanceFlashCaption}>Ваш баланс</Text>
                <Text style={styles.balanceFlashValue}>{balanceValue}</Text>
              </View>
              <Text style={styles.balanceFlashChevron}>
                {isDcHistoryExpanded ? '▴' : '▾'}
              </Text>
            </View>

            <Animated.View style={[styles.balanceFlashHistoryWrap, historyAnimatedStyle]}>
              <View style={styles.balanceFlashHistory}>
                {dcHistory.length === 0 ? (
                  <Text style={styles.balanceFlashMuted}>Начислений пока нет</Text>
                ) : (
                  dcHistory.map(item => (
                    <View key={item.id} style={styles.balanceHistoryRow}>
                      <View style={styles.balanceHistoryTextBlock}>
                        <Text style={styles.balanceHistoryReason} numberOfLines={2}>
                          {item.reason || 'Начисление Dℂ'}
                        </Text>
                        <Text style={styles.balanceHistoryDate}>
                          {formatShortDateTime(item.date)}
                        </Text>
                      </View>
                      <Text style={styles.balanceHistoryPoints}>
                        {formatPoints(item.points)} Dℂ
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerAvatarButton}
            onPress={() => {
              collapseDcHistory()
              ;(onGoProfile ?? onBack)?.()
            }}
            accessibilityRole="button"
            accessibilityLabel="Открыть профиль">
            <Text style={styles.headerAvatarText}>{profileLetter}</Text>
          </TouchableOpacity>
        </View>

        {showHeaderActions ? (
          <View style={styles.greetingBlock}>
            <Text style={styles.subtitle}>Сотрудник: {displayName}</Text>
            {onBack ? (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={onBack}
                disabled={isSubmitting || isLoading}>
                <Text style={styles.buttonText}>Назад</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onLogout}
              disabled={isSubmitting || isLoading}>
              <Text style={styles.buttonText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!isScheduleLoading && scheduleItems.length > 0 ? (
          <View style={styles.scheduleSection}>
            <View style={styles.scheduleSectionHeader}>
              <Text style={styles.sectionTitle}>Ближайшие смены</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scheduleList}>
              {scheduleItems.map(item => {
                const open = normalizeClock(item.opening_time)
                const close = normalizeClock(item.closing_time)
                const timeRange = open && close ? `${open} - ${close}` : 'Время не указано'
                const dutyShift = isDutyShift(item.duty)
                const shopTitle = item.shop_name?.trim() || (item.duty?.trim() || 'Смена')
                const address = [item.address_street, item.address_number]
                  .map(part => String(part || '').trim())
                  .filter(Boolean)
                  .join(', ')

                return (
                  <View key={item.id} style={styles.scheduleCard}>
                    <View style={styles.scheduleCardTop}>
                      <View style={styles.scheduleCardHeader}>
                        <Text style={styles.scheduleDate}>{formatScheduleDate(item.date)}</Text>
                        <Text style={styles.scheduleWeekday}>{formatScheduleWeekday(item.date)}</Text>
                      </View>
                    </View>
                    <View style={styles.scheduleCardBody}>
                      {dutyShift ? (
                        <>
                          <View style={styles.scheduleTimeSpacer} />
                          <Text style={styles.scheduleDutyValue} numberOfLines={1}>
                            Дежурство
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.scheduleTime}>{timeRange}</Text>
                          <Text style={styles.scheduleShop} numberOfLines={1} ellipsizeMode="tail">
                            {shopTitle}
                          </Text>
                          <Text style={styles.scheduleAddress} numberOfLines={2}>
                            {address || 'Адрес не назначен'}
                          </Text>
                        </>
                      )}

                      {!dutyShift && item.duty?.trim() ? (
                        <View style={styles.scheduleDutyBadge}>
                          <Text style={styles.scheduleDutyText}>{item.duty.trim()}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )
              })
              }
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.card}>
          {mode === 'idle' ? (
            <>
              <Text style={styles.sectionTitle}>Информация о сменах</Text>

              <View style={status.openedShift ? styles.badgeOpen : styles.badgeClosed}>
                <Text style={styles.badgeText}>
                  {status.openedShift ? 'Смена открыта' : 'Смена закрыта'}
                </Text>
              </View>

              {status.openedShift ? (
                <>
                  <Text style={styles.subtitle}>Магазин: {shiftShopDisplay}</Text>
                  <Text style={styles.subtitle}>Открытие: {shiftOpenedAtDisplay}</Text>
                </>
              ) : null}

              {!status.openedShift ? (
                <Text style={styles.smallText}>
                  Сейчас смена закрыта. Нажмите Открыть смену для начала работы.
                </Text>
              ) : null}

              <View style={styles.row}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.rowButton,
                    !canStartOpening && styles.buttonSecondary,
                    !canStartOpening && styles.buttonDisabled,
                  ]}
                  onPress={actions.startOpening}
                  disabled={!canStartOpening || isSubmitting || isLoading}>
                  <Text style={styles.buttonText}>Открыть смену</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.rowButton,
                    !canStartClosing && styles.buttonSecondary,
                    !canStartClosing && styles.buttonDisabled,
                  ]}
                  onPress={actions.startClosing}
                  disabled={!canStartClosing || isSubmitting || isLoading}>
                  <Text style={styles.buttonText}>Закрыть смену</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {mode === 'opening' ? (
            <>
              <Text style={styles.sectionTitle}>Открытие смены</Text>

              {openStep === 'shop' ? (
                <View style={[styles.stack, styles.shopStepContainer]}>
                  <Text style={styles.subtitle}>С какого магазина отчёт?</Text>
                  <TouchableOpacity
                    style={[
                      styles.shopSelectTrigger,
                      isShopDropdownOpen && styles.shopSelectTriggerActive,
                    ]}
                    onPress={() => setIsShopDropdownOpen(prev => !prev)}
                    disabled={isSubmitting}>
                    <Text
                      style={[
                        styles.shopSelectTriggerText,
                        openDraft.shopId ? styles.shopSelectTriggerTextActive : null,
                      ]}>
                      {openDraft.shopName || 'Выберите магазин'}
                    </Text>
                    <Text style={styles.shopSelectChevron}>{isShopDropdownOpen ? '▴' : '▾'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {openStep === 'openingReceipt' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>Сфотографируйте чек открытия.</Text>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() =>
                      takePhoto(uri => {
                        actions.setOpeningReceiptAndGoToUniform(uri)
                      })
                    }
                    disabled={isSubmitting}>
                    <Text style={styles.buttonText}>Сфотографировать чек</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {openStep === 'uniformPhoto' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>Сфотографируйте форму.</Text>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() =>
                      takePhoto(uri => {
                        actions.setUniformPhotoAndGoToCash(uri)
                      }, 'front')
                    }
                    disabled={isSubmitting}>
                    <Text style={styles.buttonText}>Сфотографировать форму</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {openStep === 'cash' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>Введите сумму размена в кассе.</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'cashAtOpening' ? styles.inputFocused : null,
                    ]}
                    placeholder="0"
                    placeholderTextColor="#7A7A7A"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={Keyboard.dismiss}
                    inputAccessoryViewID={Platform.OS === 'ios' ? cashAccessoryId : undefined}
                    value={openDraft.cashAtOpening}
                    onFocus={() => setFocusedField('cashAtOpening')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={actions.setCashAtOpening}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity
                    style={[styles.button, isSubmitting && styles.buttonDisabled]}
                    onPress={actions.submitOpenShift}
                    disabled={isSubmitting}>
                    <Text style={styles.buttonText}>
                      {isSubmitting ? 'Отправка...' : 'Отправить отчёт'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {openStep === 'review' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>Проверьте данные перед отправкой.</Text>
                  <Text style={styles.smallText}>Магазин: {openDraft.shopName}</Text>
                  <Text style={styles.smallText}>Размен: {openDraft.cashAtOpening}</Text>
                  <Text style={styles.smallText}>Чек открытия:</Text>
                  {openDraft.openingReceiptPhotoId ? (
                    <Image
                      source={{ uri: openDraft.openingReceiptPhotoId }}
                      style={styles.photoPreview}
                    />
                  ) : (
                    <Text style={styles.smallText}>Фото не добавлено</Text>
                  )}
                  <Text style={styles.smallText}>Фото формы:</Text>
                  {openDraft.uniformPhotoId ? (
                    <Image source={{ uri: openDraft.uniformPhotoId }} style={styles.photoPreview} />
                  ) : (
                    <Text style={styles.smallText}>Фото не добавлено</Text>
                  )}

                  <TouchableOpacity
                    style={[styles.button, isSubmitting && styles.buttonDisabled]}
                    onPress={actions.submitOpenShift}
                    disabled={isSubmitting}>
                    <Text style={styles.buttonText}>
                      {isSubmitting ? 'Отправка...' : 'Открыть смену'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={actions.cancelFlow}
                disabled={isSubmitting}>
                <Text style={styles.buttonText}>Отменить</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {mode === 'closing' ? (
            <>
              <Text style={styles.sectionTitle}>Закрытие смены</Text>

              {closeStep === 'confirmShop' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>
                    Вы открывали магазин: {status.openedShift?.shopName ?? '-'}. Подтверждаете?
                  </Text>

                  <TouchableOpacity style={styles.button} onPress={() => actions.confirmCloseShop(true)}>
                    <Text style={styles.buttonText}>Подтверждаю</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.buttonDanger]}
                    onPress={actions.resetWrongOpenedShop}
                    disabled={isSubmitting}>
                    <Text style={styles.buttonText}>Неправильно открыл смену</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {closeStep === 'revenue' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>
                    Напишите общую сумму выручки для магазина {status.openedShift?.shopName ?? '-'}.
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'closeRevenueTotal' ? styles.inputFocused : null,
                    ]}
                    placeholder="0"
                    placeholderTextColor="#7A7A7A"
                    keyboardType="decimal-pad"
                    value={closeDraft.revenueTotal}
                    onFocus={() => setFocusedField('closeRevenueTotal')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={actions.setRevenueTotal}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity style={styles.button} onPress={actions.toChecksCountStep}>
                    <Text style={styles.buttonText}>
                      {closeEditTarget === 'revenue' ? 'Изменить' : 'Дальше'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {closeStep === 'checksCount' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>Введите количество чеков.</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'closeChecksCount' ? styles.inputFocused : null,
                    ]}
                    placeholder="0"
                    placeholderTextColor="#7A7A7A"
                    keyboardType="number-pad"
                    value={closeDraft.checksCount}
                    onFocus={() => setFocusedField('closeChecksCount')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={actions.setChecksCount}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity style={styles.button} onPress={actions.toCashlessPaymentStep}>
                    <Text style={styles.buttonText}>
                      {closeEditTarget === 'checksCount' ? 'Изменить' : 'Дальше'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {closeStep === 'cashlessPayment' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>Введите сумму по безналичному расчету.</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'closeCashlessPayment' ? styles.inputFocused : null,
                    ]}
                    placeholder="0"
                    placeholderTextColor="#7A7A7A"
                    keyboardType="decimal-pad"
                    value={closeDraft.cashlessPayment}
                    onFocus={() => setFocusedField('closeCashlessPayment')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={actions.setCashlessPayment}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity style={styles.button} onPress={actions.toSealNumberStep}>
                    <Text style={styles.buttonText}>
                      {closeEditTarget === 'cashlessPayment' ? 'Изменить' : 'Дальше'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {closeStep === 'sealNumber' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>
                    Пожалуйста, укажите этот номер пломбы на конверте.
                  </Text>
                  <Text style={styles.subtitle}>Номер пломбы:</Text>
                  <View style={styles.sealNumberBox}>
                    <Text style={styles.sealNumberValue}>{closeDraft.sealNumber}</Text>
                  </View>
                  <TouchableOpacity style={styles.button} onPress={actions.toCashDenominationStep}>
                    <Text style={styles.buttonText}>Дальше</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {closeStep === 'cashDenomination' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>Введите сумму размена в кассе.</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'closeCashDenomination' ? styles.inputFocused : null,
                    ]}
                    placeholder="0"
                    placeholderTextColor="#7A7A7A"
                    keyboardType="decimal-pad"
                    value={closeDraft.cashDenomination}
                    onFocus={() => setFocusedField('closeCashDenomination')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={actions.setCashDenomination}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity style={styles.button} onPress={actions.toCommentStep}>
                    <Text style={styles.buttonText}>
                      {closeEditTarget === 'cashDenomination' ? 'Изменить' : 'Дальше'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {closeStep === 'comment' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>Комментарий для сменщика (опционально).</Text>
                  <TextInput
                    style={[
                      styles.input,
                      focusedField === 'closeComment' ? styles.inputFocused : null,
                    ]}
                    placeholder="Комментарий"
                    placeholderTextColor="#7A7A7A"
                    value={closeDraft.comment}
                    onFocus={() => setFocusedField('closeComment')}
                    onBlur={() => setFocusedField(null)}
                    onChangeText={actions.setComment}
                    editable={!isSubmitting}
                  />
                  <TouchableOpacity style={styles.button} onPress={actions.toClosingReceiptStep}>
                    <Text style={styles.buttonText}>Дальше</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {closeStep === 'closingReceipt' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>Сфотографируйте чек закрытия смены.</Text>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={() =>
                      takePhoto(uri => {
                        actions.setClosingReceiptAndGoToReview(uri)
                      })
                    }
                    disabled={isSubmitting}>
                    <Text style={styles.buttonText}>Сфотографировать чек</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {closeStep === 'review' ? (
                <View style={styles.stack}>
                  <Text style={styles.subtitle}>Проверьте отчёт перед отправкой.</Text>
                  <Text style={styles.smallText}>Магазин: {status.openedShift?.shopName}</Text>
                  <View style={styles.reviewRow}>
                    <Text style={styles.smallText}>Выручка: {closeDraft.revenueTotal}</Text>
                    <TouchableOpacity
                      style={styles.reviewEditButton}
                      onPress={actions.editCloseRevenue}
                      disabled={isSubmitting}>
                      <Text style={styles.reviewEditButtonText}>Изменить</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.smallText}>Количество чеков: {closeDraft.checksCount}</Text>
                    <TouchableOpacity
                      style={styles.reviewEditButton}
                      onPress={actions.editCloseChecksCount}
                      disabled={isSubmitting}>
                      <Text style={styles.reviewEditButtonText}>Изменить</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.smallText}>Безналичный расчёт: {closeDraft.cashlessPayment}</Text>
                    <TouchableOpacity
                      style={styles.reviewEditButton}
                      onPress={actions.editCloseCashlessPayment}
                      disabled={isSubmitting}>
                      <Text style={styles.reviewEditButtonText}>Изменить</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.smallText}>Размен в кассе: {closeDraft.cashDenomination}</Text>
                    <TouchableOpacity
                      style={styles.reviewEditButton}
                      onPress={actions.editCloseCashDenomination}
                      disabled={isSubmitting}>
                      <Text style={styles.reviewEditButtonText}>Изменить</Text>
                    </TouchableOpacity>
                  </View>
                  {closeDraft.comment.trim().length > 0 ? (
                    <Text style={styles.smallText}>Комментарий: {closeDraft.comment}</Text>
                  ) : null}
                  {closeDraft.closingReceiptPhotoId ? (
                    <Image
                      source={{ uri: closeDraft.closingReceiptPhotoId }}
                      style={styles.photoPreview}
                    />
                  ) : (
                    <Text style={styles.smallText}>Фото не добавлено</Text>
                  )}

                  <TouchableOpacity
                    style={[styles.button, isSubmitting && styles.buttonDisabled]}
                    onPress={actions.submitCloseShift}
                    disabled={isSubmitting}>
                    <Text style={styles.buttonText}>
                      {isSubmitting ? 'Отправка...' : 'Закрыть смену'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={actions.cancelFlow}
                disabled={isSubmitting}>
                <Text style={styles.buttonText}>Отменить</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {isLoading ? (
          <View style={styles.card}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}

        {error ? (
          <Animated.View
            style={[
              styles.shiftFlashMessage,
              styles.shiftFlashMessageError,
              { opacity: shiftErrorOpacity },
            ]}>
            <View style={styles.shiftFlashMessageLeft}>
              <View style={[styles.shiftFlashIconCircle, styles.shiftFlashIconCircleError]}>
                <Text style={styles.shiftFlashIconText}>!</Text>
              </View>
              <Text style={styles.shiftFlashMessageText}>{error}</Text>
            </View>
            <TouchableOpacity
              style={styles.shiftFlashCloseButton}
              onPress={actions.clearError}
              accessibilityRole="button"
              accessibilityLabel="Закрыть сообщение об ошибке">
              <Text style={styles.shiftFlashCloseText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        {notice ? (
          <Animated.View
            style={[
              styles.shiftFlashMessage,
              styles.shiftFlashMessageSuccess,
              { opacity: shiftNoticeOpacity },
            ]}>
            <View style={styles.shiftFlashMessageLeft}>
              <View style={[styles.shiftFlashIconCircle, styles.shiftFlashIconCircleSuccess]}>
                <Text style={styles.shiftFlashIconText}>✓</Text>
              </View>
              <Text style={styles.shiftFlashMessageText}>{notice}</Text>
            </View>
            <TouchableOpacity
              style={styles.shiftFlashCloseButton}
              onPress={actions.clearNotice}
              accessibilityRole="button"
              accessibilityLabel="Закрыть сообщение">
              <Text style={styles.shiftFlashCloseText}>✕</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : null}

        </ScrollView>

        <Modal
          visible={isShopDropdownOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsShopDropdownOpen(false)}>
          <Pressable style={styles.shopModalOverlay} onPress={() => setIsShopDropdownOpen(false)}>
            <Pressable style={styles.shopModalCard} onPress={() => {}}>
              <Text style={styles.shopModalTitle}>Выберите магазин</Text>
              <ScrollView
                style={styles.shopDropdownScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator>
                {availableShops.length > 0 ? (
                  availableShops.map(shop => (
                    <TouchableOpacity
                      key={shop.id}
                      style={[
                        styles.shopOptionRow,
                        openDraft.shopId === shop.id && styles.shopOptionRowActive,
                      ]}
                      onPress={() => {
                        actions.selectShop(shop.id, shop.name)
                        setIsShopDropdownOpen(false)
                      }}>
                      <Text
                        style={[
                          styles.shopOptionText,
                          openDraft.shopId === shop.id && styles.shopOptionTextActive,
                        ]}>
                        {shop.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.shopEmptyWrap}>
                    <Text style={styles.shopEmptyText}>Список магазинов пока недоступен</Text>
                    <TouchableOpacity
                      style={[styles.button, styles.shopRefreshButton]}
                      onPress={() => actions.refresh({ silent: true })}>
                      <Text style={styles.buttonText}>Обновить список</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={cashAccessoryId}>
            <View style={styles.keyboardAccessory}>
              <TouchableOpacity onPress={Keyboard.dismiss} style={styles.keyboardAccessoryButton}>
                <Text style={styles.keyboardAccessoryText}>Готово</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        ) : null}
      </KeyboardAvoidingView>

      {showTabBar ? (
        <LiquidTabBar
          activeTab={activeTab}
          onTabChange={switchTab}
          homeIcon={homeIcon}
          profileIcon={profileIcon}
          profileLabel="Ещё"
          mailIcon={mailIcon}
          trashIcon={trashIcon}
        />
      ) : null}
      </View>
    </SafeAreaView>
  )
}
