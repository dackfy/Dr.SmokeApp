import React from 'react'
import {
  Animated,
  Alert,
  ActivityIndicator,
  Easing,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { launchCamera } from 'react-native-image-picker'
import type { AuthSession } from '../features/auth/types'
import { useShiftFlow } from '../features/shift/useShiftFlow'
import { styles as baseStyles } from './ShiftScreen.styles'
import {
  companyStyles as androidCompanyStyles,
  darkStyles as androidDarkStyles,
  lightStyles as androidLightStyles,
} from './ShiftScreen.styles.android'
import LiquidTabBar from '../components/LiquidTabBar'
import type { TabKey } from '../components/LiquidTabBar'
import { buildApiUrl } from '../config/api'
import { useAndroidThemeMode } from '../theme/androidAppTheme'
import {
  getAndroidCompanyPalette,
  getAndroidStatusBarStyle,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors'
import { checkEmployeeAccess } from '../features/auth/authApi'

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

type TodayOpenShiftItem = {
  shop_id?: number | null
  shop_name?: string | null
  opening_time?: string | null
  closing_time?: string | null
  employee_id?: number | null
  first_name?: string | null
  phone_number?: string | null
}

type TodayShiftEmployee = {
  id: string
  name: string
  phoneNumber: string | null
}

type TodayShiftStoreCard = {
  id: string
  shopId: number | null
  shopName: string
  openingTime: string | null
  closingTime: string | null
  employees: TodayShiftEmployee[]
}

type SalaryZoneBreakdown = {
  total_salary?: number
  shift_count?: number
  final_salary?: number
  shift_salaries?: Array<{
    shop_name?: string
    date?: string | null
    salary?: number
  }>
}

type SalarySummaryResponse = {
  employee_zone?: 'green' | 'blue' | 'red' | string
  preview_salary?: number
  bonuses?: number
  penalties?: number
  final_salary?: number
  period?: {
    start_date?: string | null
    end_date?: string | null
    label?: string | null
  }
  fines_and_bonuses?: Array<{
    date?: string | null
    name?: string | null
    comment?: string | null
    amount?: number
  }>
  zones?: {
    green?: SalaryZoneBreakdown
    blue?: SalaryZoneBreakdown
    red?: SalaryZoneBreakdown
  }
}

type SalaryShiftComparisonItem = {
  id: string
  shop_name: string
  date: string | null
  green: number
  blue: number
  red: number
}

type SalaryPeriodKey = 'current' | 'previous'

const homeIcon = require('../assets/icons/home.png')
const profileIcon = require('../assets/icons/more.png')
const mailIcon = require('../assets/icons/mail.png')
const trashIcon = require('../assets/icons/trash.png')
const shopIcon = require('../assets/icons/shop.png')
const rubleIcon = require('../assets/icons/ruble.png')

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

function formatCurrency(value?: number | null) {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return '0 ₽'

  return `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ₽`
}

function toSafeNumber(value?: number | null) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function getZoneLabel(zone?: string | null) {
  if (zone === 'green') return 'Зеленая зона'
  if (zone === 'blue') return 'Синяя зона'
  if (zone === 'red') return 'Красная зона'
  return 'Ваша зона'
}

function getZoneColor(zone?: string | null) {
  if (zone === 'green') return '#45C46B'
  if (zone === 'blue') return '#58A6FF'
  if (zone === 'red') return '#FF5A5F'
  return '#FF6A00'
}

function getZoneBadgeStyle(zone?: string | null) {
  if (zone === 'green') {
    return {
      textColor: '#45C46B',
      backgroundColor: 'rgba(69, 196, 107, 0.14)',
      borderColor: 'rgba(69, 196, 107, 0.34)',
    }
  }

  if (zone === 'blue') {
    return {
      textColor: '#58A6FF',
      backgroundColor: 'rgba(88, 166, 255, 0.14)',
      borderColor: 'rgba(88, 166, 255, 0.32)',
    }
  }

  if (zone === 'red') {
    return {
      textColor: '#FF5A5F',
      backgroundColor: 'rgba(255, 90, 95, 0.14)',
      borderColor: 'rgba(255, 90, 95, 0.3)',
    }
  }

  return {
    textColor: '#FF6A00',
    backgroundColor: 'rgba(255, 106, 0, 0.14)',
    borderColor: 'rgba(255, 106, 0, 0.28)',
  }
}

function formatSalaryPeriodLabel(start: Date, end: Date) {
  const months = [
    'января',
    'февраля',
    'марта',
    'апреля',
    'мая',
    'июня',
    'июля',
    'августа',
    'сентября',
    'октября',
    'ноября',
    'декабря',
  ]

  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()

  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${months[end.getMonth()]}`
  }

  return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]}`
}

function getCurrentSalaryPeriodRange(now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth()

  if (now.getDate() <= 14) {
    return {
      startDate: new Date(year, month, 1),
      endDate: new Date(year, month, 14),
    }
  }

  const lastDay = new Date(year, month + 1, 0).getDate()
  return {
    startDate: new Date(year, month, 15),
    endDate: new Date(year, month, lastDay),
  }
}

function getPreviousSalaryPeriodRange(now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth()

  if (now.getDate() >= 15) {
    return {
      startDate: new Date(year, month, 1),
      endDate: new Date(year, month, 14),
    }
  }

  const prevMonth = new Date(year, month - 1, 1)
  const prevMonthLastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate()

  return {
    startDate: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 15),
    endDate: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonthLastDay),
  }
}

function getSalaryPeriodOptionLabels(now = new Date()) {
  const current = getCurrentSalaryPeriodRange(now)
  const previous = getPreviousSalaryPeriodRange(now)

  return {
    current: formatSalaryPeriodLabel(current.startDate, current.endDate),
    previous: formatSalaryPeriodLabel(previous.startDate, previous.endDate),
  }
}

function buildSalaryShiftComparisons(summary?: SalarySummaryResponse | null): SalaryShiftComparisonItem[] {
  const comparisons = new Map<string, SalaryShiftComparisonItem>()

  const appendZoneShifts = (
    zoneKey: 'green' | 'blue' | 'red',
    shifts?: Array<{ shop_name?: string; date?: string | null; salary?: number }>,
  ) => {
    if (!Array.isArray(shifts)) return

    for (const shift of shifts) {
      const shopName = shift.shop_name || 'Магазин'
      const date = shift.date || null
      const key = `${shopName}::${date || 'unknown'}`
      const existing =
        comparisons.get(key) ||
        {
          id: key,
          shop_name: shopName,
          date,
          green: 0,
          blue: 0,
          red: 0,
        }

      existing[zoneKey] = toSafeNumber(shift.salary)
      comparisons.set(key, existing)
    }
  }

  appendZoneShifts('green', summary?.zones?.green?.shift_salaries)
  appendZoneShifts('blue', summary?.zones?.blue?.shift_salaries)
  appendZoneShifts('red', summary?.zones?.red?.shift_salaries)

  return Array.from(comparisons.values()).sort((a, b) => {
    const aTime = a.date ? new Date(`${a.date}T00:00:00`).getTime() : 0
    const bTime = b.date ? new Date(`${b.date}T00:00:00`).getTime() : 0
    return aTime - bTime
  })
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

function formatShortNumericDate(dateValue: string) {
  const raw = String(dateValue || '').trim()
  if (!raw) return raw
  const parsed = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return raw
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(parsed)
}

function normalizeDatesInText(value: string) {
  return String(value || '').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match) =>
    formatShortNumericDate(match),
  )
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

function formatPhoneDisplay(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '')
  const normalized =
    digits.length === 11 && digits.startsWith('8')
      ? `7${digits.slice(1)}`
      : digits.slice(0, 11)

  if (normalized.length !== 11 || !normalized.startsWith('7')) {
    return String(value || '').trim() || 'Телефон не указан'
  }

  const p1 = normalized.slice(1, 4)
  const p2 = normalized.slice(4, 7)
  const p3 = normalized.slice(7, 9)
  const p4 = normalized.slice(9, 11)
  return `+7 ${p1} ${p2}-${p3}-${p4}`
}

function getDialablePhone(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`
  }
  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`
  }
  return null
}

function formatTodayLabel(timezone?: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: timezone || undefined,
  }).format(new Date())
}

function isDutyShift(value?: string | null) {
  return String(value || '').trim().toLowerCase() === 'дежурный'
}

function groupTodayOpenShiftItems(items: TodayOpenShiftItem[]): TodayShiftStoreCard[] {
  const grouped = new Map<string, TodayShiftStoreCard>()

  for (const item of items) {
    const shopId = Number.isFinite(Number(item.shop_id)) ? Number(item.shop_id) : null
    const shopName = String(item.shop_name || '').trim() || 'Магазин не указан'
    const key = shopId !== null ? String(shopId) : `shop:${shopName}`

    const existing = grouped.get(key)
    const employeeName = String(item.first_name || '').trim()
    const employeeId = Number.isFinite(Number(item.employee_id)) ? String(item.employee_id) : employeeName
    const nextEmployee =
      employeeName
        ? {
            id: employeeId,
            name: employeeName,
            phoneNumber: String(item.phone_number || '').trim() || null,
          }
        : null

    if (!existing) {
      grouped.set(key, {
        id: key,
        shopId,
        shopName,
        openingTime: item.opening_time || null,
        closingTime: item.closing_time || null,
        employees: nextEmployee ? [nextEmployee] : [],
      })
      continue
    }

    if (!existing.openingTime && item.opening_time) {
      existing.openingTime = item.opening_time
    }

    if (!existing.closingTime && item.closing_time) {
      existing.closingTime = item.closing_time
    }

    if (nextEmployee && !existing.employees.some(employee => employee.id === nextEmployee.id)) {
      existing.employees.push(nextEmployee)
    }
  }

  return Array.from(grouped.values())
    .filter(item => item.employees.length > 0)
    .sort((a, b) => a.shopName.localeCompare(b.shopName, 'ru'))
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
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const androidPalette =
    Platform.OS === 'android'
      ? androidTheme.mode === 'company'
        ? getAndroidCompanyPalette()
        : getAndroidThemePalette(colorScheme === 'dark')
      : null
  const androidStatusBarColor =
    Platform.OS === 'android' && androidPalette
      ? String(androidPalette.background)
      : undefined
  const androidStatusBarStyle =
    Platform.OS === 'android' && androidStatusBarColor
      ? getAndroidStatusBarStyle(androidStatusBarColor)
      : 'light-content'
  const styles = React.useMemo(() => {
    if (Platform.OS !== 'android') {
      return baseStyles
    }

    return {
      ...baseStyles,
      ...(androidTheme.mode === 'company'
        ? androidCompanyStyles
        : colorScheme === 'dark'
          ? androidDarkStyles
          : androidLightStyles),
    }
  }, [androidTheme.mode, colorScheme])

  const [isShopDropdownOpen, setIsShopDropdownOpen] = React.useState(false)
  const [focusedField, setFocusedField] = React.useState<string | null>(null)
  const [dcBalance, setDcBalance] = React.useState<number | null>(null)
  const [dcHistory, setDcHistory] = React.useState<DcHistoryItem[]>([])
  const [scheduleItems, setScheduleItems] = React.useState<ScheduleItem[]>([])
  const [todayShiftStores, setTodayShiftStores] = React.useState<TodayShiftStoreCard[]>([])
  const [salarySummaries, setSalarySummaries] = React.useState<
    Partial<Record<SalaryPeriodKey, SalarySummaryResponse | null>>
  >({})
  const [isScheduleLoading, setIsScheduleLoading] = React.useState(true)
  const [isTodayShiftsLoading, setIsTodayShiftsLoading] = React.useState(true)
  const [isSalaryLoading, setIsSalaryLoading] = React.useState(true)
  const [selectedSalaryPeriod, setSelectedSalaryPeriod] = React.useState<SalaryPeriodKey>('current')
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isDcHistoryExpanded, setIsDcHistoryExpanded] = React.useState(false)
  const [isSalaryExpanded, setIsSalaryExpanded] = React.useState(false)
  const [isSalaryClosing, setIsSalaryClosing] = React.useState(false)
  const scrollViewRef = React.useRef<ScrollView | null>(null)
  const scrollOffsetYRef = React.useRef(0)
  const salarySectionYRef = React.useRef(0)
  const dcHistoryAnim = React.useRef(new Animated.Value(0)).current
  const salaryAnim = React.useRef(new Animated.Value(0)).current
  const salaryContentOpacity = React.useRef(new Animated.Value(1)).current
  const salaryCacheRef = React.useRef<Partial<Record<SalaryPeriodKey, SalarySummaryResponse | null>>>({})
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
  const todayShiftBadgeLabel = `Сегодня, ${formatTodayLabel(session.user.timezone)}`

  const handlePhonePress = React.useCallback(async (phoneNumber?: string | null) => {
    const dialablePhone = getDialablePhone(phoneNumber)
    if (!dialablePhone) {
      return
    }

    const phoneUrl = `tel:${dialablePhone}`

    try {
      const canOpen = await Linking.canOpenURL(phoneUrl)
      if (!canOpen) {
        return
      }

      await Linking.openURL(phoneUrl)
    } catch {
      // ignore linking failures for now
    }
  }, [])

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

  const loadTodayOpenShiftsData = React.useCallback(async () => {
    try {
      const res = await fetch(
        buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/open-shifts-today`),
      )

      if (!res.ok) {
        throw new Error(`Open shifts HTTP ${res.status}`)
      }

      const data = (await res.json()) as { shifts?: TodayOpenShiftItem[] }
      const shifts = Array.isArray(data.shifts) ? data.shifts : []
      const currentEmployeeId = Number(session.user.id)
      const filteredShifts = shifts.filter(
        item => Number(item.employee_id) !== currentEmployeeId,
      )
      setTodayShiftStores(groupTodayOpenShiftItems(filteredShifts))
    } catch {
      setTodayShiftStores([])
    } finally {
      setIsTodayShiftsLoading(false)
    }
  }, [session.user.id])

  const fetchSalaryData = React.useCallback(async (period: SalaryPeriodKey) => {
    const res = await fetch(
      buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/salary/${period}`),
    )

    if (!res.ok) {
      throw new Error(`Salary HTTP ${res.status}`)
    }

    return (await res.json()) as SalarySummaryResponse
  }, [session.user.id])

  const loadSalaryPeriods = React.useCallback(async (
    options?: { force?: boolean; preferredPeriod?: SalaryPeriodKey },
  ) => {
    const preferredPeriod = options?.preferredPeriod || 'current'
    const hasCurrent = salaryCacheRef.current.current !== undefined
    const hasPrevious = salaryCacheRef.current.previous !== undefined
    const shouldUseCache = !options?.force && hasCurrent && hasPrevious

    if (shouldUseCache) {
      setSalarySummaries({
        current: salaryCacheRef.current.current ?? null,
        previous: salaryCacheRef.current.previous ?? null,
      })
      setIsSalaryLoading(false)
      return
    }

    if (!salarySummaries.current && !salarySummaries.previous) {
      setIsSalaryLoading(true)
    }

    try {
      const [currentData, previousData] = await Promise.all([
        fetchSalaryData('current'),
        fetchSalaryData('previous'),
      ])

      salaryCacheRef.current.current = currentData
      salaryCacheRef.current.previous = previousData
      setSalarySummaries({
        current: currentData,
        previous: previousData,
      })
      Animated.timing(salaryContentOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    } catch {
      if (!shouldUseCache) {
        salaryCacheRef.current.current = null
        salaryCacheRef.current.previous = null
        setSalarySummaries({
          current: null,
          previous: null,
        })
      }
      Animated.timing(salaryContentOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start()
    } finally {
      setIsSalaryLoading(false)
    }
  }, [fetchSalaryData, salaryContentOpacity, salarySummaries.current, salarySummaries.previous])

  React.useEffect(() => {
    loadDcData()
  }, [loadDcData])

  React.useEffect(() => {
    loadScheduleData()
  }, [loadScheduleData])

  React.useEffect(() => {
    loadTodayOpenShiftsData()
  }, [loadTodayOpenShiftsData])

  React.useEffect(() => {
    loadSalaryPeriods({ preferredPeriod: 'current' })
  }, [loadSalaryPeriods])

  const handleSalaryPeriodChange = React.useCallback(async (period: SalaryPeriodKey) => {
    if (period === selectedSalaryPeriod) {
      return
    }

    const cached = salaryCacheRef.current[period]
    if (cached !== undefined) {
      setSelectedSalaryPeriod(period)
      return
    }

    try {
      await loadSalaryPeriods({ force: true, preferredPeriod: period })
      setSelectedSalaryPeriod(period)
    } catch {
      // keep current period and current data on fetch failure
    }
  }, [loadSalaryPeriods, selectedSalaryPeriod])

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      await checkEmployeeAccess(session.user.id)
      setSelectedSalaryPeriod('current')
      setIsSalaryExpanded(false)
      setIsSalaryClosing(false)
      salaryAnim.setValue(0)
      await Promise.all([
        actions.refresh({ silent: true }),
        loadDcData(),
        loadScheduleData(),
        loadTodayOpenShiftsData(),
        loadSalaryPeriods({ force: true, preferredPeriod: 'current' }),
      ])
    } catch (refreshError) {
      if (
        refreshError instanceof Error &&
        refreshError.message === 'Доступ к вашему аккаунту ограничен'
      ) {
        onLogout()
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [actions, loadDcData, loadScheduleData, loadTodayOpenShiftsData, loadSalaryPeriods, onLogout, salaryAnim, selectedSalaryPeriod, session.user.id])

  const salarySummary = salarySummaries[selectedSalaryPeriod] ?? null

  const balanceValue =
    dcBalance === null
      ? '— Dℂ'
      : `${new Intl.NumberFormat('ru-RU').format(dcBalance)} Dℂ`
  const salaryPeriodOptions = React.useMemo(() => getSalaryPeriodOptionLabels(new Date()), [])
  const salaryZoneLabel = getZoneLabel(salarySummary?.employee_zone)
  const salaryZoneColor = getZoneColor(salarySummary?.employee_zone)
  const salaryZoneBadgeStyle = getZoneBadgeStyle(salarySummary?.employee_zone)
  const isSalaryCardActive = isSalaryExpanded || isSalaryClosing
  const salaryPreviewValue = formatCurrency(salarySummary?.preview_salary ?? salarySummary?.final_salary ?? 0)
  const salaryShiftCount =
    toSafeNumber(salarySummary?.zones?.green?.shift_count) +
    toSafeNumber(salarySummary?.zones?.blue?.shift_count) +
    toSafeNumber(salarySummary?.zones?.red?.shift_count)
  const hasSalaryAccruals =
    salaryShiftCount > 0 ||
    toSafeNumber(salarySummary?.bonuses) > 0 ||
    toSafeNumber(salarySummary?.penalties) > 0 ||
    toSafeNumber(salarySummary?.preview_salary ?? salarySummary?.final_salary) > 0
  const salaryZoneBreakdowns = [
    { key: 'green', label: 'Зеленая зона', value: salarySummary?.zones?.green?.final_salary ?? 0 },
    { key: 'blue', label: 'Синяя зона', value: salarySummary?.zones?.blue?.final_salary ?? 0 },
    { key: 'red', label: 'Красная зона', value: salarySummary?.zones?.red?.final_salary ?? 0 },
  ]
  const salaryShiftComparisons = React.useMemo(
    () => buildSalaryShiftComparisons(salarySummary),
    [salarySummary],
  )

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
  const salaryAnimatedStyle = React.useMemo(
    () => ({
      maxHeight: salaryAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 2400],
      }),
      opacity: salaryAnim.interpolate({
        inputRange: [0, 0.25, 1],
        outputRange: [0, 0.45, 1],
      }),
      transform: [
        {
          translateY: salaryAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-4, 0],
          }),
        },
      ],
    }),
    [salaryAnim],
  )
  const toggleSalary = React.useCallback(() => {
    if (isSalaryExpanded) {
      const targetY = Math.max(0, salarySectionYRef.current - 16)
      setIsSalaryClosing(true)
      Animated.timing(salaryAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setIsSalaryExpanded(false)
        setIsSalaryClosing(false)
        if (scrollOffsetYRef.current > targetY + 24) {
          requestAnimationFrame(() => {
            scrollViewRef.current?.scrollTo({ y: targetY, animated: true })
          })
        }
      })
      return
    }

    setIsSalaryExpanded(true)
    Animated.timing(salaryAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [isSalaryExpanded, salaryAnim])
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
      <StatusBar
        barStyle={androidStatusBarStyle}
        backgroundColor={androidStatusBarColor}
      />

      <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollViewRef}
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
          onScroll={event => {
            scrollOffsetYRef.current = event.nativeEvent.contentOffset.y
          }}
          scrollEventThrottle={16}
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
              <Text style={styles.sectionTitle}>Информация о смене</Text>

              {isLoading && !isRefreshing ? (
                <View style={styles.shiftInlineLoading}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.shiftInlineLoadingText}>Обновляем статус смены...</Text>
                </View>
              ) : (
                <>
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
                </>
              )}

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

        {!isSalaryLoading ? (
          <View
            style={styles.salarySection}
            onLayout={event => {
              salarySectionYRef.current = event.nativeEvent.layout.y
            }}>
            <View style={styles.scheduleSectionHeader}>
              <Text style={styles.sectionTitle}>Информация о зарплате</Text>
            </View>

            <View
              style={[
                styles.salaryCard,
                isSalaryCardActive && {
                  borderColor: salaryZoneColor,
                  shadowColor: salaryZoneColor,
                  shadowOpacity: Platform.OS === 'ios' ? 0.16 : 0,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 0 },
                },
              ]}>
              <View style={styles.salaryCardHeader}>
                <View style={styles.salaryPeriodSwitch}>
                  <TouchableOpacity
                    style={[
                      styles.salaryPeriodTab,
                      selectedSalaryPeriod === 'current' && styles.salaryPeriodTabActive,
                    ]}
                    onPress={() => handleSalaryPeriodChange('current')}
                    disabled={selectedSalaryPeriod === 'current'}
                    accessibilityRole="button"
                    accessibilityLabel="Показать зарплату за текущий период">
                    <Text
                      style={[
                        styles.salaryPeriodTabText,
                        selectedSalaryPeriod === 'current'
                          ? styles.salaryPeriodTabTextActive
                          : styles.salaryPeriodTabTextInactive,
                      ]}>
                      {salaryPeriodOptions.current}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.salaryPeriodTab,
                      selectedSalaryPeriod === 'previous' && styles.salaryPeriodTabActive,
                    ]}
                    onPress={() => handleSalaryPeriodChange('previous')}
                    disabled={selectedSalaryPeriod === 'previous'}
                    accessibilityRole="button"
                    accessibilityLabel="Показать зарплату за прошлый период">
                    <Text
                      style={[
                        styles.salaryPeriodTabText,
                        selectedSalaryPeriod === 'previous'
                          ? styles.salaryPeriodTabTextActive
                          : styles.salaryPeriodTabTextInactive,
                      ]}>
                      {salaryPeriodOptions.previous}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={[
                    styles.salaryZoneBadge,
                    {
                      backgroundColor: salaryZoneBadgeStyle.backgroundColor,
                      borderColor: salaryZoneBadgeStyle.borderColor,
                    },
                  ]}>
                  <Text style={[styles.salaryZoneText, { color: salaryZoneColor }]}>
                    {salaryZoneLabel}
                  </Text>
                </View>
              </View>

              {hasSalaryAccruals ? (
                <>
                  <Text style={styles.salaryValue}>{salaryPreviewValue}</Text>
                  <Text style={styles.salaryCaption}>
                    Сумма за расчетный период
                  </Text>

                  <View style={styles.salaryMetaRow}>
                    <View style={styles.salaryMetaInfo}>
                      <Text style={styles.salaryMetaText}>
                        Премии: {formatCurrency(salarySummary?.bonuses ?? 0)}
                      </Text>
                      <Text style={styles.salaryMetaText}>
                        Депремирование: {formatCurrency(salarySummary?.penalties ?? 0)}
                      </Text>
                    </View>

                    {!isSalaryExpanded && !isSalaryClosing ? (
                      <TouchableOpacity
                        style={styles.salaryExpandButton}
                        onPress={toggleSalary}
                        accessibilityRole="button"
                        accessibilityLabel="Показать детали зарплаты">
                        <Text style={styles.salaryExpandIcon}>›</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {isSalaryExpanded || isSalaryClosing ? (
                    <Animated.View style={[styles.salaryDetailsWrap, salaryAnimatedStyle]}>
                      <View style={styles.salaryDetails}>
                      <View style={styles.salaryZoneList}>
                        {salaryZoneBreakdowns.map(zone => (
                          <View key={zone.key} style={styles.salaryZoneRow}>
                            <Text style={styles.salaryZoneRowLabel}>{zone.label}</Text>
                            <Text style={styles.salaryZoneRowValue}>{formatCurrency(zone.value)}</Text>
                          </View>
                        ))}
                      </View>

                      {salaryShiftComparisons.length > 0 ? (
                        <View style={styles.salaryDetailsSection}>
                          <Text style={styles.salaryDetailsTitle}>Смены и сравнение по зонам</Text>
                          {salaryShiftComparisons.map(shift => (
                            <View key={shift.id} style={styles.salaryShiftComparisonCard}>
                              <Text style={styles.salaryShiftSummaryLine}>
                                {shift.date ? formatScheduleDate(shift.date) : 'Дата не указана'}{' '}
                                {shift.shop_name || 'Магазин'}
                              </Text>
                              <Text style={styles.salaryShiftSummaryCaption}>
                                Зарплата за эту смену по каждой зоне
                              </Text>

                              <View style={styles.salaryShiftComparisonList}>
                                <View style={styles.salaryShiftComparisonRow}>
                                  <Text style={[styles.salaryShiftComparisonLabel, styles.salaryShiftComparisonLabelGreen]}>
                                    Зеленая
                                  </Text>
                                  <Text style={styles.salaryShiftValue}>{formatCurrency(shift.green)}</Text>
                                </View>
                                <View style={styles.salaryShiftComparisonRow}>
                                  <Text style={[styles.salaryShiftComparisonLabel, styles.salaryShiftComparisonLabelBlue]}>
                                    Синяя
                                  </Text>
                                  <Text style={styles.salaryShiftValue}>{formatCurrency(shift.blue)}</Text>
                                </View>
                                <View style={styles.salaryShiftComparisonRow}>
                                  <Text style={[styles.salaryShiftComparisonLabel, styles.salaryShiftComparisonLabelRed]}>
                                    Красная
                                  </Text>
                                  <Text style={styles.salaryShiftValue}>{formatCurrency(shift.red)}</Text>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {Array.isArray(salarySummary?.fines_and_bonuses) && salarySummary.fines_and_bonuses.length > 0 ? (
                        <View style={styles.salaryDetailsSection}>
                          {salarySummary.fines_and_bonuses.map((item, index) => {
                            const amount = toSafeNumber(item.amount)
                            const isBonus = amount > 0
                            const itemDateLabel = item.date ? formatScheduleDate(item.date) : 'Дата не указана'
                            const itemReason = normalizeDatesInText(String(item.comment || '').trim()) || 'Причина не указана'
                            return (
                              <View key={`${item.name || 'salary-item'}:${item.date || index}:${index}`} style={styles.salaryShiftRow}>
                                <View style={styles.salaryFineTextBlock}>
                                  <Text style={styles.salaryFineTitle}>
                                    {itemDateLabel} {isBonus ? 'Премия' : 'Депремирование'}
                                  </Text>
                                  <Text style={styles.salaryFineReason}>
                                    За что: {itemReason}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.salaryShiftValue,
                                    isBonus ? styles.salaryShiftValueBonus : styles.salaryShiftValuePenalty,
                                  ]}>
                                  {isBonus ? '+' : '-'}{formatCurrency(Math.abs(amount))}
                                </Text>
                              </View>
                            )
                          })}
                        </View>
                      ) : null}

                        <View style={styles.salaryExpandFooter}>
                          <TouchableOpacity
                            style={styles.salaryExpandButton}
                            onPress={toggleSalary}
                            accessibilityRole="button"
                            accessibilityLabel="Скрыть детали зарплаты">
                            <Text style={[styles.salaryExpandIcon, styles.salaryExpandIconOpen]}>›</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Animated.View>
                  ) : null}
                  </>
                ) : (
                <View style={styles.salaryEmptyState}>
                  <View style={styles.salaryEmptyIcon}>
                    <Image source={rubleIcon} style={styles.salaryEmptyIconImage} />
                  </View>
                  <Text style={styles.salaryEmptyTitle}>
                    За этот период вы не отработали ни одной смены
                  </Text>
                  <Text style={styles.salaryEmptyText}>
                    Начислений по зарплате пока нет
                  </Text>
                </View>
              )}

            </View>
          </View>
        ) : null}

        {!isTodayShiftsLoading ? (
          <View style={styles.todayShiftSection}>
            <View style={styles.scheduleSectionHeader}>
              <Text style={styles.sectionTitle}>Сегодня на смене</Text>
            </View>

            <View style={styles.todayShiftList}>
              {todayShiftStores.length > 0 ? (
                todayShiftStores.map(item => {
                  const open = normalizeClock(item.openingTime)
                  const close = normalizeClock(item.closingTime)
                  const timeRange = open && close ? `${open} - ${close}` : 'Время не указано'

                  return (
                    <View key={item.id} style={styles.todayShiftCard}>
                      <View style={styles.todayShiftTopRow}>
                        <View style={styles.todayShiftBadge}>
                          <Text style={styles.todayShiftBadgeText}>{todayShiftBadgeLabel}</Text>
                        </View>
                        <Text style={styles.todayShiftHours}>{timeRange}</Text>
                      </View>

                      <Text
                        style={styles.todayShiftShop}
                        numberOfLines={1}
                        ellipsizeMode="tail">
                        {item.shopName}
                      </Text>

                      <View style={styles.todayShiftEmployeeBlock}>
                        <View style={styles.todayShiftEmployeeList}>
                          {item.employees.map(employee => (
                            <View key={`${item.id}:${employee.id}`} style={styles.todayShiftEmployeeRow}>
                              <View style={styles.todayShiftEmployeePill}>
                                <Text style={styles.todayShiftEmployeeName}>{employee.name}</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.todayShiftCallButton}
                                onPress={() => handlePhonePress(employee.phoneNumber)}
                                disabled={!getDialablePhone(employee.phoneNumber)}
                                accessibilityRole="button"
                                accessibilityLabel={`Позвонить ${employee.name}`}>
                                <Text style={styles.todayShiftCallButtonText}>Позвонить</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  )
                })
              ) : (
                <View style={styles.todayShiftCard}>
                  <View style={styles.todayShiftEmptyState}>
                    <View style={styles.todayShiftEmptyIcon}>
                      <Image source={shopIcon} style={styles.todayShiftEmptyIconImage} />
                    </View>
                    <Text style={styles.todayShiftEmptyTitle}>
                      Сейчас в регионе нет открытых магазинов
                    </Text>
                    <Text style={styles.todayShiftEmptyText}>
                      Как только сотрудники откроют смены, они появятся здесь
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
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
