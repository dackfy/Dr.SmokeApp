import React from 'react'
import {
  ActivityIndicator,
  Linking,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { AuthSession } from '../features/auth/types'
import { buildApiUrl } from '../config/api'
import { checkEmployeeAccess } from '../features/auth/authApi'
import { notificationsApi } from '../features/notifications/notificationsApi'
import { subscribeToNotificationsUnreadCount } from '../features/notifications/notificationsEvents'
import { subscribeToForegroundPushMessages } from '../features/push/pushApi'

type ManagementDashboardScreenProps = {
  variant: 'superHr' | 'director' | 'manager'
  session: AuthSession
  onLogout: () => void
  onRefreshSession?: () => Promise<void>
  onGoProfile?: () => void
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

type RegionCard = {
  id: string
  regionId: number | null
  regionName: string
  employeeCount: number
  shopCount: number
}

type StoreCard = {
  id: string
  shopId: number | null
  shopName: string
  openingTime: string | null
  closingTime: string | null
  employees: Array<{
    id: string
    name: string
    phoneNumber: string | null
  }>
}

type HrRegionSummaryResponse = {
  regions?: Array<{
    region_id?: number | null
    region_name?: string | null
    employee_count?: number | null
    shop_count?: number | null
  }>
}

type HrRegionOpenShiftsResponse = {
  region_id?: number | null
  region_name?: string | null
  shifts?: TodayOpenShiftItem[]
}

type HrScheduleRegionSummaryResponse = {
  regions?: Array<{
    region_id?: number | null
    region_name?: string | null
    employee_count?: number | null
  }>
}

type HrScheduleRegionItem = {
  id: string
  regionId: number | null
  regionName: string
  employeeCount: number
}

type HrScheduleEntry = {
  id: string
  date: string
  shopId: number | null
  shopName: string | null
  addressStreet: string | null
  addressNumber: string | null
  employeeId: number | null
  employeeName: string | null
  duty: string | null
  openingTime: string | null
  closingTime: string | null
}

type HrScheduleRegionDetailResponse = {
  region_id?: number | null
  region_name?: string | null
  schedule?: Array<{
    id?: number | null
    data?: string | null
    date?: string | null
    shop_id?: number | null
    shop_name?: string | null
    address_street?: string | null
    address_number?: string | null
    employee_id?: number | null
    employee_name?: string | null
    first_name?: string | null
    duty?: string | null
    opening_time?: string | null
    closing_time?: string | null
  }>
}

type HrUnopenedRegionSummaryResponse = {
  regions?: Array<{
    region_id?: number | null
    region_name?: string | null
    unopened_shop_count?: number | null
  }>
}

type HrUnopenedRegionItem = {
  id: string
  regionId: number | null
  regionName: string
  unopenedShopCount: number
}

type HrUnopenedShopItem = {
  id: string
  shopId: number | null
  shopName: string
  openingTime: string | null
  closingTime: string | null
  addressStreet: string | null
  addressNumber: string | null
}

type HrUnopenedRegionDetailResponse = {
  region_id?: number | null
  region_name?: string | null
  shops?: Array<{
    shop_id?: number | null
    shop_name?: string | null
    opening_time?: string | null
    closing_time?: string | null
    address_street?: string | null
    address_number?: string | null
  }>
}

type HrRevenueYesterdayRegionItem = {
  region_id?: number | null
  region_name?: string | null
  report_date?: string | null
  total_revenue?: number | null
  total_invoices?: number | null
  shop_count?: number | null
}

type HrRevenueYesterdayTopShopItem = {
  region_id?: number | null
  region_name?: string | null
  report_date?: string | null
  shop_id?: number | null
  shop_name?: string | null
  total_revenue?: number | null
  total_invoices?: number | null
}

type HrRevenueYesterdayResponse = {
  total_revenue?: number | null
  total_invoices?: number | null
  shop_count?: number | null
  previous_day_total_revenue?: number | null
  previous_total_revenue?: number | null
  previous_report_date?: string | null
  revenue_change_percent?: number | null
  regions?: HrRevenueYesterdayRegionItem[]
  top_shops?: HrRevenueYesterdayTopShopItem[]
}

type DirectorRevenueRegion = {
  id: string
  regionId: number | null
  regionName: string
  reportDate: string | null
  totalRevenue: number
  totalInvoices: number
  shopCount: number
}

type DirectorRevenueTopShop = {
  id: string
  shopId: number | null
  shopName: string
  regionId: number | null
  regionName: string
  reportDate: string | null
  totalRevenue: number
  totalInvoices: number
}

type DirectorRevenueSummary = {
  totalRevenue: number
  totalInvoices: number
  shopCount: number
  previousDayTotalRevenue: number | null
  previousReportDate: string | null
  revenueChangePercent: number | null
  regions: DirectorRevenueRegion[]
  topShops: DirectorRevenueTopShop[]
}

function formatTodayLabel(timezone?: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: timezone || undefined,
  }).format(new Date())
}

function formatDateLabel(dateKey?: string | null) {
  if (!dateKey) return ''

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(dateFromDateKey(dateKey))
}

function formatTimeRange(openingTime?: string | null, closingTime?: string | null) {
  const start = String(openingTime || '').slice(0, 5)
  const end = String(closingTime || '').slice(0, 5)
  if (!start && !end) return 'Время не указано'
  if (start && end) return `${start} - ${end}`
  return start || end
}

function capitalizeFirstLetter(value: string) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function getPresentWorkVerb(count: number) {
  return Math.abs(Number(count)) === 1 ? 'работает' : 'работают'
}

function formatRevenueChangeLabel(changePercent?: number | null) {
  if (!Number.isFinite(changePercent)) {
    return null
  }

  const normalizedChange = Number(changePercent)
  const roundedChange = Math.round(Math.abs(normalizedChange))

  if (roundedChange === 0) {
    return 'На уровне предыдущего дня'
  }

  return normalizedChange > 0
    ? `На ${roundedChange}% выше, чем днём ранее`
    : `На ${roundedChange}% ниже, чем днём ранее`
}

function getRevenueChangeTone(changePercent?: number | null) {
  if (!Number.isFinite(changePercent)) {
    return 'neutral'
  }

  const normalizedChange = Number(changePercent)

  if (normalizedChange > 0) {
    return 'positive'
  }

  if (normalizedChange < 0) {
    return 'negative'
  }

  return 'neutral'
}

function formatCompactNumber(value?: number | null) {
  return new Intl.NumberFormat('ru-RU').format(Number(value || 0))
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTodayDateKeyInTimeZone(timezone?: string | null) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const map: Record<string, string> = {}
  parts.forEach(part => {
    if (part.type !== 'literal') {
      map[part.type] = part.value
    }
  })

  return `${map.year}-${map.month}-${map.day}`
}

function dateFromDateKey(dateKey: string) {
  const [year, month, day] = String(dateKey).split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function toMonthKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function normalizeScheduleDateKey(value?: string | null) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : raw
}

function normalizeNullableText(value: unknown) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized || null
}

function isDutySchedule(value?: string | null) {
  return String(value || '').trim().toLowerCase() === 'дежурный'
}

function shouldDisplayScheduleEntry(entry: HrScheduleEntry) {
  if (isDutySchedule(entry.duty)) {
    return true
  }

  return Boolean(entry.shopId && entry.shopId > 0 && entry.shopName?.trim())
}

async function fetchWithTimeout(input: string, timeoutMs = 7000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function withCacheBust(url: string) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}_ts=${Date.now()}`
}

function pluralizeRu(count: number, one: string, few: string, many: string) {
  const abs = Math.abs(Number(count) || 0)
  const mod100 = abs % 100
  const mod10 = abs % 10

  if (mod100 >= 11 && mod100 <= 14) return many
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

function getDialablePhone(phoneNumber?: string | null) {
  const digits = String(phoneNumber || '').replace(/\D/g, '')
  if (!digits) {
    return null
  }

  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`
  }

  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`
  }

  if (digits.startsWith('+' )) {
    return digits
  }

  return digits.startsWith('7') ? `+${digits}` : `+${digits}`
}

function buildStoreCards(items: TodayOpenShiftItem[]): StoreCard[] {
  const groups = new Map<string, StoreCard>()

  items.forEach(item => {
    const shopKey = String(item.shop_id ?? item.shop_name ?? 'unknown')
    const existing = groups.get(shopKey)
    const employee = {
      id: String(item.employee_id ?? `${shopKey}:${item.first_name ?? 'employee'}`),
      name: item.first_name?.trim() || 'Сотрудник',
      phoneNumber: item.phone_number ?? null,
    }

    if (!existing) {
      groups.set(shopKey, {
        id: shopKey,
        shopId: item.shop_id ?? null,
        shopName: item.shop_name?.trim() || 'Магазин',
        openingTime: item.opening_time ?? null,
        closingTime: item.closing_time ?? null,
        employees: [employee],
      })
      return
    }

    existing.employees.push(employee)
  })

  return Array.from(groups.values()).sort((a, b) => a.shopName.localeCompare(b.shopName, 'ru'))
}

function buildFallbackRegionCards(
  items: TodayOpenShiftItem[],
  session: AuthSession,
): RegionCard[] {
  if (items.length === 0) {
    return []
  }

  const stores = buildStoreCards(items)
  const regionName = session.user.regionName?.trim() || 'Мой регион'
  const regionId = Number.isFinite(Number(session.user.regionId))
    ? Number(session.user.regionId)
    : null

  return [
    {
      id: String(regionId ?? regionName),
      regionId,
      regionName,
      employeeCount: items.length,
      shopCount: stores.length,
    },
  ]
}

function buildFallbackScheduleRegionCards(items: RegionCard[]): HrScheduleRegionItem[] {
  return items.map(region => ({
    id: region.id,
    regionId: region.regionId,
    regionName: region.regionName,
    employeeCount: region.employeeCount,
  }))
}

function buildFallbackUnopenedRegionCards(items: RegionCard[]): HrUnopenedRegionItem[] {
  return items.map(region => ({
    id: region.id,
    regionId: region.regionId,
    regionName: region.regionName,
    unopenedShopCount: 0,
  }))
}

function DashboardGradientTitle({ variant }: { variant: 'hr' | 'director' }) {
  return (
    <View pointerEvents="none" style={styles.titleSvgWrap}>
      <Svg
        style={styles.titleSvg}
        viewBox="0 0 364 84"
        preserveAspectRatio="xMinYMin meet">
        <Defs>
          <SvgLinearGradient
            id="hrTitleGradient"
            x1="0"
            y1="0"
            x2="364"
            y2="84"
            gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#FFF4DE" />
            <Stop offset="0.2" stopColor="#FFECCD" />
            <Stop offset="0.44" stopColor="#FFDCA6" />
            <Stop offset="0.72" stopColor="#FFAA3A" />
            <Stop offset="1" stopColor="#FF6A00" />
          </SvgLinearGradient>
        </Defs>

        {variant === 'director' ? (
          <SvgText
            x="0"
            y="31"
            fontSize="25"
            textLength="202"
            lengthAdjust="spacingAndGlyphs"
            fontFamily={Platform.OS === 'ios' ? 'Izambane 3D' : 'Izambane3D'}
            fill="url(#hrTitleGradient)"
            stroke="#F2C56F"
            strokeWidth="1.05">
            DIRECTOR
          </SvgText>
        ) : (
          <SvgText
            x="0"
            y="34"
            fontSize="41"
            fontFamily={Platform.OS === 'ios' ? 'Izambane 3D' : 'Izambane3D'}
            fill="url(#hrTitleGradient)"
            stroke="#F2C56F"
            strokeWidth="1.05">
            HR
          </SvgText>
        )}

        {variant === 'director' ? (
          <SvgText
            x="0"
            y="75"
            fontSize="41"
            textLength="248"
            lengthAdjust="spacingAndGlyphs"
            fontFamily={Platform.OS === 'ios' ? 'Izambane 3D' : 'Izambane3D'}
            fill="url(#hrTitleGradient)"
            stroke="#F1B34D"
            strokeWidth="1.05">
            CONTROL
          </SvgText>
        ) : (
          <SvgText
            x="0"
            y="75"
            fontSize="43"
            textLength="334"
            lengthAdjust="spacingAndGlyphs"
            fontFamily={Platform.OS === 'ios' ? 'Izambane 3D' : 'Izambane3D'}
            fill="url(#hrTitleGradient)"
            stroke="#F1B34D"
            strokeWidth="1.05">
            DASHBOARD
          </SvgText>
        )}
      </Svg>
    </View>
  )
}

function ManagementHeaderBrand({
  variant,
  todayLabel,
  isRevenueExpanded,
  onToggleRevenue,
  onOpenRevenueDetails,
  showRevenueCard = true,
  directorRevenueSummary,
  isDirectorRevenueLoading,
  directorRevenueError,
}: {
  variant: 'superHr' | 'director' | 'manager'
  todayLabel: string
  isRevenueExpanded: boolean
  onToggleRevenue: () => void
  onOpenRevenueDetails: () => void
  showRevenueCard?: boolean
  directorRevenueSummary: DirectorRevenueSummary | null
  isDirectorRevenueLoading: boolean
  directorRevenueError: string | null
}) {
  if (variant === 'director') {
    const hasDirectorRevenueData = Boolean(directorRevenueSummary)
    const visibleRevenueRegions = directorRevenueSummary?.regions.slice(0, 3) ?? []
    const visibleRevenueTopShops = directorRevenueSummary?.topShops.slice(0, 3) ?? []
    const directorRevenueChangeLabel = directorRevenueSummary
      ? formatRevenueChangeLabel(directorRevenueSummary.revenueChangePercent)
      : null
    const directorRevenueChangeTone = directorRevenueSummary
      ? getRevenueChangeTone(directorRevenueSummary.revenueChangePercent)
      : 'neutral'

    return (
      <View style={styles.directorHeaderContent}>
        <View style={styles.directorHeaderIntro}>
          <Text style={styles.headerEyebrow}>Управление компанией</Text>
          <View style={styles.directorHeaderTitleBlock}>
            <Text style={styles.directorHeaderTitle}>Панель управления</Text>
          </View>
          <View style={styles.headerMetaRowDirector}>
            <View style={styles.headerMetaAccentDirector} />
            <Text style={styles.headerCaptionText}>{todayLabel}</Text>
          </View>
        </View>
        {showRevenueCard ? (
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.directorHeaderRevenueCard}
            onPress={onToggleRevenue}
            accessibilityRole="button"
            accessibilityLabel="Открыть сводку по выручке">
            <View style={styles.directorHeaderRevenueTopRow}>
              <View style={styles.directorHeaderRevenueTextBlock}>
                <Text style={styles.directorHeaderRevenueEyebrow}>Финансовая сводка за вчерашний день</Text>
                <Text style={styles.directorHeaderRevenueHint}>
                  {hasDirectorRevenueData
                    ? formatCurrency(directorRevenueSummary?.totalRevenue)
                    : isDirectorRevenueLoading
                      ? 'Подтягиваем сводку по регионам и магазинам'
                      : directorRevenueError
                        ? 'Не удалось загрузить сводку за вчера'
                        : 'Общий результат по сети с детализацией по регионам'}
                </Text>
                {hasDirectorRevenueData && directorRevenueChangeLabel ? (
                  <Text
                    style={[
                      styles.directorHeaderRevenueDelta,
                      directorRevenueChangeTone === 'positive'
                        ? styles.directorHeaderRevenueDeltaPositive
                        : null,
                      directorRevenueChangeTone === 'negative'
                        ? styles.directorHeaderRevenueDeltaNegative
                        : null,
                    ]}>
                    {directorRevenueChangeLabel}
                  </Text>
                ) : null}
              </View>
              <Text
                style={[
                  styles.directorHeaderRevenueArrow,
                  isRevenueExpanded
                    ? styles.directorHeaderRevenueArrowExpanded
                    : styles.directorHeaderRevenueArrowCollapsed,
                ]}>
                ›
              </Text>
            </View>
            {isRevenueExpanded ? (
              isDirectorRevenueLoading ? (
                <View style={styles.directorHeaderRevenueExpandedLoading}>
                  <ActivityIndicator size="small" color="#FF6A00" />
                  <Text style={styles.directorHeaderRevenueExpandedText}>
                    Загружаем выручку, чеки и лучшие магазины за вчерашний день.
                  </Text>
                </View>
              ) : directorRevenueError ? (
                <View style={styles.directorHeaderRevenueExpandedLoading}>
                  <Text style={styles.directorHeaderRevenueExpandedText}>{directorRevenueError}</Text>
                </View>
              ) : directorRevenueSummary ? (
                <View style={styles.directorRevenueDetails}>
                <View style={styles.directorRevenueMetricsRow}>
                  <View style={styles.directorRevenueMetricCard}>
                    <Text style={styles.directorRevenueMetricLabel}>Магазины в отчёте</Text>
                    <Text style={styles.directorRevenueMetricValue}>
                      {formatCompactNumber(directorRevenueSummary.shopCount)}
                    </Text>
                  </View>
                  <View style={styles.directorRevenueMetricCard}>
                    <Text style={styles.directorRevenueMetricLabel}>Чеки за день</Text>
                      <Text style={styles.directorRevenueMetricValue}>
                        {formatCompactNumber(directorRevenueSummary.totalInvoices)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.directorRevenueSection}>
                    <Text style={styles.directorRevenueSectionTitle}>По регионам</Text>
                    {visibleRevenueRegions.length > 0 ? (
                      <View style={styles.directorRevenueRegionList}>
                        {visibleRevenueRegions.map(region => (
                          <View key={region.id} style={styles.directorRevenueRegionRow}>
                            <View style={styles.directorRevenueRegionTextBlock}>
                              <Text style={styles.directorRevenueRegionName}>{region.regionName}</Text>
                              <Text style={styles.directorRevenueRegionMeta}>
                                {`${formatCompactNumber(region.totalInvoices)} ${pluralizeRu(
                                  region.totalInvoices,
                                  'чек',
                                  'чека',
                                  'чеков',
                                )} • ${formatCompactNumber(region.shopCount)} ${pluralizeRu(
                                  region.shopCount,
                                  'магазин',
                                  'магазина',
                                  'магазинов',
                                )}`}
                              </Text>
                            </View>
                            <Text style={styles.directorRevenueRegionValue}>
                              {formatCurrency(region.totalRevenue)}
                            </Text>
                          </View>
                        ))}
                        {directorRevenueSummary.regions.length > visibleRevenueRegions.length ? (
                          <Text style={styles.directorRevenueFootnote}>
                            {`И ещё ${directorRevenueSummary.regions.length - visibleRevenueRegions.length} ${pluralizeRu(
                              directorRevenueSummary.regions.length - visibleRevenueRegions.length,
                              'регион',
                              'региона',
                              'регионов',
                            )} в общей сводке`}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.directorRevenueSectionEmpty}>
                        За вчерашний день по регионам пока нет закрытых смен.
                      </Text>
                    )}
                  </View>

                  <View style={styles.directorRevenueSection}>
                    <Text style={styles.directorRevenueSectionTitle}>Топ-5 магазинов за день</Text>
                    {visibleRevenueTopShops.length > 0 ? (
                      <View style={styles.directorRevenueTopList}>
                        {visibleRevenueTopShops.map((shop, index) => (
                          <View key={shop.id} style={styles.directorRevenueTopRow}>
                            <View style={styles.directorRevenueTopRank}>
                              <Text style={styles.directorRevenueTopRankText}>{index + 1}</Text>
                            </View>
                            <View style={styles.directorRevenueTopTextBlock}>
                              <Text style={styles.directorRevenueTopName}>{shop.shopName}</Text>
                              <Text style={styles.directorRevenueTopMeta}>
                                {`${shop.regionName} • ${formatCompactNumber(shop.totalInvoices)} ${pluralizeRu(
                                  shop.totalInvoices,
                                  'чек',
                                  'чека',
                                  'чеков',
                                )}`}
                              </Text>
                            </View>
                            <Text style={styles.directorRevenueTopValue}>
                              {formatCurrency(shop.totalRevenue)}
                            </Text>
                          </View>
                        ))}
                        {directorRevenueSummary.topShops.length > visibleRevenueTopShops.length ? (
                          <Text style={styles.directorRevenueFootnote}>
                            {`Показаны первые ${visibleRevenueTopShops.length} из ${directorRevenueSummary.topShops.length}`}
                          </Text>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.directorRevenueSectionEmpty}>
                        Топ магазинов появится, когда будут закрытые смены за вчера.
                      </Text>
                    )}
                  </View>
                  {(directorRevenueSummary.regions.length > visibleRevenueRegions.length ||
                    directorRevenueSummary.topShops.length > visibleRevenueTopShops.length) ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.directorRevenueDetailsButton}
                      onPress={onOpenRevenueDetails}
                      accessibilityRole="button"
                      accessibilityLabel="Открыть полную финансовую сводку">
                      <Text style={styles.directorRevenueDetailsButtonText}>Смотреть полностью</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <View style={styles.directorHeaderRevenueExpandedBlock}>
                  <View style={styles.directorHeaderRevenueExpandedAccent} />
                  <Text style={styles.directorHeaderRevenueExpandedText}>
                    Здесь появится общая выручка по закрытым сменам за вчерашний день. Ниже можно будет
                    открыть детализацию по каждому региону отдельно.
                  </Text>
                </View>
              )
            ) : null}
          </TouchableOpacity>
        ) : null}
      </View>
    )
  }

  if (variant === 'manager') {
    return (
      <View style={styles.directorHeaderContent}>
        <View style={styles.directorHeaderIntro}>
          <Text style={styles.headerEyebrow}>Управление регионами</Text>
          <View style={styles.directorHeaderTitleBlock}>
            <Text style={styles.directorHeaderTitle}>Панель управления</Text>
          </View>
          <View style={styles.headerMetaRowDirector}>
            <View style={styles.headerMetaAccentDirector} />
            <Text style={styles.headerCaptionText}>{todayLabel}</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.headerTextBlock}>
      <Text style={styles.headerEyebrow}>Управление регионами</Text>
      <DashboardGradientTitle variant="hr" />
      <View style={styles.headerMetaRow}>
        <View style={styles.headerMetaAccent} />
        <Text style={styles.headerCaptionText}>{todayLabel}</Text>
      </View>
    </View>
  )
}

export default function ManagementDashboardScreen({
  variant,
  session,
  onLogout,
  onRefreshSession,
  onGoProfile,
}: ManagementDashboardScreenProps) {
  const regionsScrollRef = React.useRef<ScrollView | null>(null)
  const detailScrollRef = React.useRef<ScrollView | null>(null)
  const regionCardsRef = React.useRef<RegionCard[]>([])
  const unopenedRegionsRequestRef = React.useRef<Promise<HrUnopenedRegionItem[]> | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [regionCards, setRegionCards] = React.useState<RegionCard[]>([])
  const [regionShiftsMap, setRegionShiftsMap] = React.useState<Record<string, TodayOpenShiftItem[]>>({})
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isRegionsOpen, setIsRegionsOpen] = React.useState(false)
  const [isShiftChartOpen, setIsShiftChartOpen] = React.useState(false)
  const [isUnopenedShopsOpen, setIsUnopenedShopsOpen] = React.useState(false)
  const [isScheduleLoading, setIsScheduleLoading] = React.useState(false)
  const [isUnopenedShopsLoading, setIsUnopenedShopsLoading] = React.useState(false)
  const [isDirectorRevenueExpanded, setIsDirectorRevenueExpanded] = React.useState(false)
  const [isDirectorRevenueDetailsOpen, setIsDirectorRevenueDetailsOpen] = React.useState(false)
  const [isDirectorRevenueLoading, setIsDirectorRevenueLoading] = React.useState(false)
  const [directorRevenueError, setDirectorRevenueError] = React.useState<string | null>(null)
  const [directorRevenueSummary, setDirectorRevenueSummary] =
    React.useState<DirectorRevenueSummary | null>(null)
  const [selectedRegionId, setSelectedRegionId] = React.useState<string | null>(null)
  const [selectedScheduleRegionId, setSelectedScheduleRegionId] = React.useState<string | null>(null)
  const [selectedUnopenedRegionId, setSelectedUnopenedRegionId] = React.useState<string | null>(null)
  const [selectedScheduleMonthKey, setSelectedScheduleMonthKey] = React.useState<string | null>(null)
  const [selectedScheduleDateKey, setSelectedScheduleDateKey] = React.useState<string | null>(null)
  const [selectedScheduleDateByMonth, setSelectedScheduleDateByMonth] = React.useState<
    Record<string, string>
  >({})
  const [loadingRegionId, setLoadingRegionId] = React.useState<string | null>(null)
  const [loadingScheduleRegionId, setLoadingScheduleRegionId] = React.useState<string | null>(null)
  const [loadingUnopenedRegionId, setLoadingUnopenedRegionId] = React.useState<string | null>(null)
  const [loadedRegionIds, setLoadedRegionIds] = React.useState<Record<string, true>>({})
  const [loadedScheduleRegionIds, setLoadedScheduleRegionIds] = React.useState<Record<string, true>>({})
  const [loadedUnopenedRegionIds, setLoadedUnopenedRegionIds] = React.useState<Record<string, true>>({})
  const [scheduleRegionCards, setScheduleRegionCards] = React.useState<HrScheduleRegionItem[]>([])
  const [scheduleEntriesMap, setScheduleEntriesMap] = React.useState<Record<string, HrScheduleEntry[]>>({})
  const [hasLoadedScheduleRegions, setHasLoadedScheduleRegions] = React.useState(false)
  const [unopenedRegionCards, setUnopenedRegionCards] = React.useState<HrUnopenedRegionItem[]>([])
  const [unopenedShopsMap, setUnopenedShopsMap] = React.useState<Record<string, HrUnopenedShopItem[]>>({})
  const [hasLoadedUnopenedRegions, setHasLoadedUnopenedRegions] = React.useState(false)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState(0)

  const profileLetter = (session.user.email?.trim()?.charAt(0) || 'П').toUpperCase()
  const todayLabel = `Сегодня, ${formatTodayLabel(session.user.timezone)}`

  const loadUnreadNotificationsCount = React.useCallback(async () => {
    try {
      const notifications = await notificationsApi.list(session.user.id)
      setUnreadNotificationsCount(
        notifications.filter(notification => !notification.is_read).length,
      )
    } catch {
      setUnreadNotificationsCount(0)
    }
  }, [session.user.id])

  React.useEffect(() => {
    let isMounted = true

    const syncUnreadNotifications = async () => {
      if (!isMounted) {
        return
      }

      await loadUnreadNotificationsCount()
    }

    void syncUnreadNotifications()

    const intervalId = setInterval(() => {
      void syncUnreadNotifications()
    }, 30000)

    const unsubscribeForegroundMessages = subscribeToForegroundPushMessages(() => {
      void syncUnreadNotifications()
    })

    const unsubscribeUnreadCount = subscribeToNotificationsUnreadCount(
      ({ employeeId, unreadCount }) => {
        if (employeeId !== session.user.id) {
          return
        }

        setTimeout(() => {
          if (!isMounted) {
            return
          }

          setUnreadNotificationsCount(unreadCount)
        }, 0)
      },
    )

    return () => {
      isMounted = false
      clearInterval(intervalId)
      unsubscribeForegroundMessages()
      unsubscribeUnreadCount()
    }
  }, [loadUnreadNotificationsCount, session.user.id])

  const handleBackNavigation = React.useCallback(() => {
    if (isDirectorRevenueDetailsOpen) {
      setIsDirectorRevenueDetailsOpen(false)
      return
    }

    if (selectedRegionId) {
      setSelectedRegionId(null)
      return
    }

    if (selectedScheduleRegionId) {
      setSelectedScheduleRegionId(null)
      return
    }

    if (selectedUnopenedRegionId) {
      setSelectedUnopenedRegionId(null)
      return
    }

    if (isShiftChartOpen) {
      setIsShiftChartOpen(false)
      return
    }

    if (isUnopenedShopsOpen) {
      setIsUnopenedShopsOpen(false)
      return
    }

    if (isRegionsOpen) {
      setIsRegionsOpen(false)
    }
  }, [
    isDirectorRevenueDetailsOpen,
    isRegionsOpen,
    isShiftChartOpen,
    isUnopenedShopsOpen,
    selectedRegionId,
    selectedScheduleRegionId,
    selectedUnopenedRegionId,
  ])

  const loadFallbackRegionData = React.useCallback(async () => {
    const todayRes = await fetch(
      withCacheBust(buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/open-shifts-today`)),
    )

    if (!todayRes.ok) {
      throw new Error(`Open shifts HTTP ${todayRes.status}`)
    }

    const todayData = (await todayRes.json()) as { shifts?: TodayOpenShiftItem[] }
    const shifts = Array.isArray(todayData.shifts) ? todayData.shifts : []
    const fallbackRegions = buildFallbackRegionCards(shifts, session)

    setRegionCards(fallbackRegions)
    setRegionShiftsMap(
      fallbackRegions.reduce<Record<string, TodayOpenShiftItem[]>>((acc, region) => {
        acc[region.id] = shifts
        return acc
      }, {}),
    )
  }, [session])

  const loadRegions = React.useCallback(async () => {
    const regionsRes = await fetch(
      withCacheBust(buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/hr/regions`)),
    )

    if (regionsRes.status === 404 || regionsRes.status === 501) {
      await loadFallbackRegionData()
      return []
    }

    if (!regionsRes.ok) {
      throw new Error(`HR regions HTTP ${regionsRes.status}`)
    }

    const regionsData = (await regionsRes.json()) as HrRegionSummaryResponse
    const nextRegionCards = Array.isArray(regionsData.regions)
      ? regionsData.regions
          .map(region => ({
          id: String(region.region_id ?? region.region_name ?? `region-${Math.random()}`),
          regionId: Number.isFinite(Number(region.region_id)) ? Number(region.region_id) : null,
          regionName: String(region.region_name || 'Регион'),
          employeeCount: Number(region.employee_count ?? 0),
          shopCount: Number(region.shop_count ?? 0),
          }))
          .filter(region => region.employeeCount > 0 || region.shopCount > 0)
      : []

    setRegionCards(nextRegionCards)
    setRegionShiftsMap(prev => {
      const next = { ...prev }
      for (const region of nextRegionCards) {
        if (!next[region.id]) {
          next[region.id] = []
        }
      }
      return next
    })
    return nextRegionCards
  }, [loadFallbackRegionData, session.user.id])

  const loadRegionDetails = React.useCallback(async (region: RegionCard) => {
    if (!region.id) return

    setLoadingRegionId(region.id)

    try {
      const res = await fetch(
        withCacheBust(buildApiUrl(
          `/employees/${encodeURIComponent(session.user.id)}/hr/regions/${encodeURIComponent(
            String(region.regionId ?? region.id),
          )}/open-shifts`,
        )),
      )

      if (res.status === 404 || res.status === 501) {
        if (region.regionId === session.user.regionId || region.regionName === session.user.regionName) {
          await loadFallbackRegionData()
        }
        setLoadedRegionIds(prev => ({ ...prev, [region.id]: true }))
        return
      }

      if (!res.ok) {
        throw new Error(`HR region details HTTP ${res.status}`)
      }

      const data = (await res.json()) as HrRegionOpenShiftsResponse
      const shifts = Array.isArray(data.shifts) ? data.shifts : []
      setRegionShiftsMap(prev => ({
        ...prev,
        [region.id]: shifts,
      }))
      setLoadedRegionIds(prev => ({ ...prev, [region.id]: true }))
    } finally {
      setLoadingRegionId(current => (current === region.id ? null : current))
    }
  }, [loadFallbackRegionData, session.user.id, session.user.regionId, session.user.regionName])

  const loadScheduleRegions = React.useCallback(async (sourceRegions?: RegionCard[]) => {
    setIsScheduleLoading(true)

    try {
      const res = await fetchWithTimeout(
        withCacheBust(
          buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/hr/schedule/regions?days=30`),
        ),
      )

      if (res.status === 404 || res.status === 501) {
        const fallbackScheduleRegions = buildFallbackScheduleRegionCards(
          sourceRegions ?? regionCardsRef.current,
        )
        setScheduleRegionCards(fallbackScheduleRegions)
        setHasLoadedScheduleRegions(true)
        return fallbackScheduleRegions
      }

      if (!res.ok) {
        throw new Error(`HR schedule regions HTTP ${res.status}`)
      }

      const data = (await res.json()) as HrScheduleRegionSummaryResponse
      const nextScheduleRegions = Array.isArray(data.regions)
        ? data.regions.map(region => ({
            id: String(region.region_id ?? region.region_name ?? `schedule-region-${Math.random()}`),
            regionId: Number.isFinite(Number(region.region_id)) ? Number(region.region_id) : null,
            regionName: String(region.region_name || 'Регион'),
            employeeCount: Number(region.employee_count ?? 0),
          }))
        : []

      setScheduleRegionCards(nextScheduleRegions)
      setHasLoadedScheduleRegions(true)
      return nextScheduleRegions
    } catch {
      const fallbackScheduleRegions = buildFallbackScheduleRegionCards(
        sourceRegions ?? regionCardsRef.current,
      )
      setScheduleRegionCards(fallbackScheduleRegions)
      setHasLoadedScheduleRegions(true)
      return fallbackScheduleRegions
    } finally {
      setIsScheduleLoading(false)
    }
  }, [session.user.id])

  const loadScheduleRegionDetails = React.useCallback(async (region: HrScheduleRegionItem) => {
    if (!region.id) return

    setLoadingScheduleRegionId(region.id)

    try {
      const res = await fetchWithTimeout(
        withCacheBust(buildApiUrl(
          `/employees/${encodeURIComponent(session.user.id)}/hr/schedule/regions/${encodeURIComponent(
            String(region.regionId ?? region.id),
          )}?days=30`,
        )),
      )

      if (res.status === 404 || res.status === 501) {
        setScheduleEntriesMap(prev => ({
          ...prev,
          [region.id]: [],
        }))
        setLoadedScheduleRegionIds(prev => ({ ...prev, [region.id]: true }))
        return
      }

      if (!res.ok) {
        throw new Error(`HR schedule details HTTP ${res.status}`)
      }

      const data = (await res.json()) as HrScheduleRegionDetailResponse
      const nextEntries = Array.isArray(data.schedule)
        ? data.schedule
            .map((item, index) => {
              const date = normalizeScheduleDateKey(item.date || item.data)
              if (!date) return null

              return {
                id: String(
                  item.id ??
                    [
                      region.id,
                      date,
                      item.employee_id ?? 'employee',
                      item.shop_id ?? item.shop_name ?? 'shop',
                      item.duty ?? 'duty',
                      item.opening_time ?? 'open',
                      item.closing_time ?? 'close',
                      index,
                    ].join(':'),
                ),
                date,
                shopId: Number.isFinite(Number(item.shop_id)) ? Number(item.shop_id) : null,
                shopName: normalizeNullableText(item.shop_name),
                addressStreet: normalizeNullableText(item.address_street),
                addressNumber: normalizeNullableText(item.address_number),
                employeeId: Number.isFinite(Number(item.employee_id)) ? Number(item.employee_id) : null,
                employeeName:
                  normalizeNullableText(item.employee_name) ??
                  normalizeNullableText(item.first_name),
                duty: normalizeNullableText(item.duty),
                openingTime: normalizeNullableText(item.opening_time),
                closingTime: normalizeNullableText(item.closing_time),
              } satisfies HrScheduleEntry
            })
            .filter((item): item is HrScheduleEntry => item !== null)
        : []

      setScheduleEntriesMap(prev => ({
        ...prev,
        [region.id]: nextEntries,
      }))
      setLoadedScheduleRegionIds(prev => ({ ...prev, [region.id]: true }))
    } catch {
      setScheduleEntriesMap(prev => ({
        ...prev,
        [region.id]: [],
      }))
      setLoadedScheduleRegionIds(prev => ({ ...prev, [region.id]: true }))
    } finally {
      setLoadingScheduleRegionId(current => (current === region.id ? null : current))
    }
  }, [session.user.id])

  const loadUnopenedRegions = React.useCallback(async () => {
    if (unopenedRegionsRequestRef.current) {
      return unopenedRegionsRequestRef.current
    }

    const request = (async () => {
      setIsUnopenedShopsLoading(true)

      try {
        const res = await fetchWithTimeout(
          withCacheBust(buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/hr/unopened-shops/regions`)),
        )

        if (res.status === 404 || res.status === 501) {
          setUnopenedRegionCards([])
          setHasLoadedUnopenedRegions(true)
          return []
        }

        if (!res.ok) {
          throw new Error(`HR unopened regions HTTP ${res.status}`)
        }

        const data = (await res.json()) as HrUnopenedRegionSummaryResponse
        const nextUnopenedRegions = Array.isArray(data.regions)
          ? data.regions
              .map(region => ({
                id: String(region.region_id ?? region.region_name ?? `unopened-region-${Math.random()}`),
                regionId: Number.isFinite(Number(region.region_id)) ? Number(region.region_id) : null,
                regionName: String(region.region_name || 'Регион'),
                unopenedShopCount: Number(region.unopened_shop_count ?? 0),
              }))
              .filter(region => region.unopenedShopCount > 0)
          : []

        setUnopenedRegionCards(nextUnopenedRegions)
        setHasLoadedUnopenedRegions(true)
        return nextUnopenedRegions
      } catch {
        setUnopenedRegionCards([])
        setHasLoadedUnopenedRegions(true)
        return []
      } finally {
        setIsUnopenedShopsLoading(false)
        unopenedRegionsRequestRef.current = null
      }
    })()

    unopenedRegionsRequestRef.current = request
    return request
  }, [session.user.id])

  const loadUnopenedRegionDetails = React.useCallback(async (region: HrUnopenedRegionItem) => {
    if (!region.id) return

    setLoadingUnopenedRegionId(region.id)

    try {
      const res = await fetchWithTimeout(
        withCacheBust(
          buildApiUrl(
            `/employees/${encodeURIComponent(session.user.id)}/hr/unopened-shops/regions/${encodeURIComponent(
              String(region.regionId ?? region.id),
            )}`,
          ),
        ),
      )

      if (res.status === 404 || res.status === 501) {
        setUnopenedShopsMap(prev => ({
          ...prev,
          [region.id]: [],
        }))
        setLoadedUnopenedRegionIds(prev => ({ ...prev, [region.id]: true }))
        return
      }

      if (!res.ok) {
        throw new Error(`HR unopened region details HTTP ${res.status}`)
      }

      const data = (await res.json()) as HrUnopenedRegionDetailResponse
      const nextShops = Array.isArray(data.shops)
        ? data.shops.map((shop, index) => ({
            id: String(
              shop.shop_id ??
                [region.id, shop.shop_name ?? 'shop', shop.address_street ?? 'street', index].join(':'),
            ),
            shopId: Number.isFinite(Number(shop.shop_id)) ? Number(shop.shop_id) : null,
            shopName: String(shop.shop_name || 'Магазин'),
            openingTime: normalizeNullableText(shop.opening_time),
            closingTime: normalizeNullableText(shop.closing_time),
            addressStreet: normalizeNullableText(shop.address_street),
            addressNumber: normalizeNullableText(shop.address_number),
          }))
        : []

      setUnopenedShopsMap(prev => ({
        ...prev,
        [region.id]: nextShops,
      }))
      setLoadedUnopenedRegionIds(prev => ({ ...prev, [region.id]: true }))
    } catch {
      setUnopenedShopsMap(prev => ({
        ...prev,
        [region.id]: [],
      }))
      setLoadedUnopenedRegionIds(prev => ({ ...prev, [region.id]: true }))
    } finally {
      setLoadingUnopenedRegionId(current => (current === region.id ? null : current))
    }
  }, [session.user.id])

  const loadDirectorRevenueSummary = React.useCallback(async () => {
    if (variant !== 'director') {
      return null
    }

    setIsDirectorRevenueLoading(true)

    try {
      const res = await fetchWithTimeout(
        withCacheBust(buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/hr/revenue/yesterday`)),
      )

      if (res.status === 404 || res.status === 501) {
        setDirectorRevenueSummary(null)
        setDirectorRevenueError(null)
        return null
      }

      if (!res.ok) {
        throw new Error(`HR revenue yesterday HTTP ${res.status}`)
      }

      const data = (await res.json()) as HrRevenueYesterdayResponse
      const previousDayTotalRevenueRaw = Number(
        data.previous_day_total_revenue ?? data.previous_total_revenue ?? Number.NaN,
      )
      const previousDayTotalRevenue = Number.isFinite(previousDayTotalRevenueRaw)
        ? previousDayTotalRevenueRaw
        : null
      const revenueChangePercentRaw = Number(data.revenue_change_percent ?? Number.NaN)
      const revenueChangePercent = Number.isFinite(revenueChangePercentRaw)
        ? revenueChangePercentRaw
        : previousDayTotalRevenue && previousDayTotalRevenue > 0
          ? ((Number(data.total_revenue ?? 0) - previousDayTotalRevenue) / previousDayTotalRevenue) * 100
          : null
      const nextSummary: DirectorRevenueSummary = {
        totalRevenue: Number(data.total_revenue ?? 0),
        totalInvoices: Number(data.total_invoices ?? 0),
        shopCount: Number(data.shop_count ?? 0),
        previousDayTotalRevenue,
        previousReportDate: normalizeNullableText(data.previous_report_date),
        revenueChangePercent,
        regions: Array.isArray(data.regions)
          ? data.regions
              .map(region => ({
                id: String(region.region_id ?? region.region_name ?? `revenue-region-${Math.random()}`),
                regionId: Number.isFinite(Number(region.region_id)) ? Number(region.region_id) : null,
                regionName: String(region.region_name || 'Регион'),
                reportDate: normalizeNullableText(region.report_date),
                totalRevenue: Number(region.total_revenue ?? 0),
                totalInvoices: Number(region.total_invoices ?? 0),
                shopCount: Number(region.shop_count ?? 0),
              }))
              .sort((a, b) => b.totalRevenue - a.totalRevenue)
          : [],
        topShops: Array.isArray(data.top_shops)
          ? data.top_shops.map((shop, index) => ({
              id: String(
                shop.shop_id ??
                  [shop.region_id ?? 'region', shop.shop_name ?? 'shop', shop.report_date ?? 'date', index].join(':'),
              ),
              shopId: Number.isFinite(Number(shop.shop_id)) ? Number(shop.shop_id) : null,
              shopName: String(shop.shop_name || 'Магазин'),
              regionId: Number.isFinite(Number(shop.region_id)) ? Number(shop.region_id) : null,
              regionName: String(shop.region_name || 'Регион'),
              reportDate: normalizeNullableText(shop.report_date),
              totalRevenue: Number(shop.total_revenue ?? 0),
              totalInvoices: Number(shop.total_invoices ?? 0),
            }))
          : [],
      }

      setDirectorRevenueSummary(nextSummary)
      setDirectorRevenueError(null)
      return nextSummary
    } catch {
      setDirectorRevenueError('Не удалось загрузить сводку по выручке за вчера')
      return null
    } finally {
      setIsDirectorRevenueLoading(false)
    }
  }, [session.user.id, variant])

  const loadData = React.useCallback(async () => {
    const nextRegionCards = await loadRegions()
    void loadScheduleRegions(nextRegionCards)
    if (variant === 'director') {
      void loadDirectorRevenueSummary()
    }
    setSelectedRegionId(current => {
      if (!current) return current
      return nextRegionCards.some(region => region.id === current) ? current : null
    })
  }, [loadDirectorRevenueSummary, loadRegions, loadScheduleRegions, variant])

  React.useEffect(() => {
    regionCardsRef.current = regionCards
  }, [regionCards])

  React.useEffect(() => {
    let isMounted = true

    async function bootstrap() {
      try {
        setLoadError(null)
        await loadData()
      } catch {
        if (isMounted) {
          setLoadError('Не удалось загрузить данные по сменам')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      isMounted = false
    }
  }, [loadData])

  React.useEffect(() => {
    if (!isRegionsOpen || selectedRegionId) {
      return
    }

    requestAnimationFrame(() => {
      regionsScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false })
    })
  }, [isRegionsOpen, selectedRegionId])

  React.useEffect(() => {
    if (!selectedRegionId) {
      return
    }

    requestAnimationFrame(() => {
      detailScrollRef.current?.scrollTo({ x: 0, y: 0, animated: false })
    })
  }, [selectedRegionId])

  React.useEffect(() => {
    if (!isShiftChartOpen) {
      return
    }

    if (!hasLoadedScheduleRegions && !isScheduleLoading) {
      void loadScheduleRegions(regionCards)
    }
  }, [hasLoadedScheduleRegions, isScheduleLoading, isShiftChartOpen, loadScheduleRegions, regionCards])

  React.useEffect(() => {
    if (!isUnopenedShopsOpen || selectedUnopenedRegionId) {
      return
    }

    if (!hasLoadedUnopenedRegions && !isUnopenedShopsLoading) {
      void loadUnopenedRegions()
    }
  }, [
    hasLoadedUnopenedRegions,
    isUnopenedShopsLoading,
    isUnopenedShopsOpen,
    loadUnopenedRegions,
    selectedUnopenedRegionId,
  ])

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      await checkEmployeeAccess(session.user.id)
      await onRefreshSession?.()
      const nextRegionCards = await loadRegions()
      const nextScheduleRegionCards = await loadScheduleRegions(nextRegionCards)
      if (variant === 'director') {
        await loadDirectorRevenueSummary()
      }

      setSelectedRegionId(current => {
        if (!current) return current
        return nextRegionCards.some(region => region.id === current) ? current : null
      })

      if (selectedRegion) {
        const nextSelectedRegion =
          nextRegionCards.find(region => region.id === selectedRegion.id) ?? selectedRegion
        await loadRegionDetails(nextSelectedRegion)
      }

      if (selectedScheduleRegion) {
        const nextSelectedScheduleRegion =
          nextScheduleRegionCards?.find(region => region.id === selectedScheduleRegion.id) ??
          selectedScheduleRegion
        await loadScheduleRegionDetails(nextSelectedScheduleRegion)
      }

      if (isUnopenedShopsOpen) {
        const nextUnopenedRegionCards = await loadUnopenedRegions()

        setSelectedUnopenedRegionId(current => {
          if (!current) return current
          return nextUnopenedRegionCards.some(region => region.id === current) ? current : null
        })

        if (selectedUnopenedRegion) {
          const nextSelectedUnopenedRegion =
            nextUnopenedRegionCards.find(region => region.id === selectedUnopenedRegion.id) ??
            selectedUnopenedRegion
          await loadUnopenedRegionDetails(nextSelectedUnopenedRegion)
        }
      }

      setLoadError(null)
    } catch (error) {
      if (error instanceof Error && error.message === 'Доступ к вашему аккаунту ограничен') {
        onLogout()
      } else {
        setLoadError('Не удалось обновить данные по сменам')
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [
    loadRegions,
    loadScheduleRegions,
    loadUnopenedRegions,
    loadRegionDetails,
    loadScheduleRegionDetails,
    loadUnopenedRegionDetails,
    loadDirectorRevenueSummary,
    isUnopenedShopsOpen,
    onLogout,
    onRefreshSession,
    selectedRegionId,
    selectedScheduleRegionId,
    selectedUnopenedRegionId,
    session.user.id,
    variant,
  ])

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

  const backSwipeResponder = React.useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          if (
            !isDirectorRevenueDetailsOpen &&
            !selectedRegionId &&
            !selectedScheduleRegionId &&
            !selectedUnopenedRegionId &&
            !isRegionsOpen &&
            !isShiftChartOpen &&
            !isUnopenedShopsOpen
          ) {
            return false
          }

          const isHorizontalSwipe = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
          return gestureState.dx > 16 && isHorizontalSwipe
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx > 72 && Math.abs(gestureState.dy) < 48) {
            handleBackNavigation()
          }
        },
      }),
    [
      handleBackNavigation,
      isDirectorRevenueDetailsOpen,
      isRegionsOpen,
      isShiftChartOpen,
      isUnopenedShopsOpen,
      selectedRegionId,
      selectedScheduleRegionId,
      selectedUnopenedRegionId,
    ],
  )

  const selectedRegion =
    regionCards.find(region => region.id === selectedRegionId) ?? null
  const selectedScheduleRegion =
    scheduleRegionCards.find(region => region.id === selectedScheduleRegionId) ?? null
  const displayedUnopenedRegionCards = unopenedRegionCards
  const selectedUnopenedRegion =
    displayedUnopenedRegionCards.find(region => region.id === selectedUnopenedRegionId) ?? null
  const selectedScheduleEntries = selectedScheduleRegion
    ? (scheduleEntriesMap[selectedScheduleRegion.id] ?? [])
    : []
  const selectedUnopenedShops = selectedUnopenedRegion
    ? (unopenedShopsMap[selectedUnopenedRegion.id] ?? [])
    : []
  const displayedUnopenedShops = selectedUnopenedShops
  const visibleSelectedScheduleEntries = React.useMemo(
    () => selectedScheduleEntries.filter(shouldDisplayScheduleEntry),
    [selectedScheduleEntries],
  )
  const isSelectedScheduleRegionLoading = selectedScheduleRegion
    ? loadingScheduleRegionId === selectedScheduleRegion.id
    : false
  const hasLoadedSelectedScheduleRegion = selectedScheduleRegion
    ? Boolean(loadedScheduleRegionIds[selectedScheduleRegion.id])
    : false
  const isSelectedUnopenedRegionLoading = selectedUnopenedRegion
    ? loadingUnopenedRegionId === selectedUnopenedRegion.id
    : false
  const hasLoadedSelectedUnopenedRegion = selectedUnopenedRegion
    ? Boolean(loadedUnopenedRegionIds[selectedUnopenedRegion.id])
    : false
  const selectedRegionShifts = selectedRegion ? (regionShiftsMap[selectedRegion.id] ?? []) : []
  const isSelectedRegionLoading = selectedRegion ? loadingRegionId === selectedRegion.id : false
  const hasLoadedSelectedRegion = selectedRegion ? Boolean(loadedRegionIds[selectedRegion.id]) : false
  const selectedRegionStores = React.useMemo(
    () => buildStoreCards(selectedRegionShifts),
    [selectedRegionShifts],
  )
  const totalRegions = regionCards.length
  const totalEmployees = regionCards.reduce((sum, region) => sum + region.employeeCount, 0)
  const totalOpenShops = regionCards.reduce((sum, region) => sum + region.shopCount, 0)
  const scheduleRegionCount = scheduleRegionCards.length
  const unopenedRegionCount = displayedUnopenedRegionCards.length
  const totalUnopenedShops = unopenedRegionCards.reduce(
    (sum, region) => sum + region.unopenedShopCount,
    0,
  )
  const scheduleWindowDates = React.useMemo(() => {
    const start = dateFromDateKey(getTodayDateKeyInTimeZone(session.user.timezone))

    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return date
    })
  }, [session.user.timezone])
  const scheduleMonthOptions = React.useMemo(() => {
    const monthMap = new Map<string, { key: string; label: string }>()

    scheduleWindowDates.forEach(date => {
      const key = toMonthKey(date)
      if (!monthMap.has(key)) {
        monthMap.set(key, {
          key,
          label: capitalizeFirstLetter(
            new Intl.DateTimeFormat('ru-RU', {
              month: 'long',
              timeZone: session.user.timezone || undefined,
            }).format(date),
          ),
        })
      }
    })

    return Array.from(monthMap.values())
  }, [scheduleWindowDates, session.user.timezone])
  const resolvedScheduleMonthKey =
    selectedScheduleMonthKey ?? scheduleMonthOptions[0]?.key ?? null
  const selectedScheduleMonthStateKey =
    selectedScheduleRegionId && resolvedScheduleMonthKey
      ? `${selectedScheduleRegionId}:${resolvedScheduleMonthKey}`
      : null
  const resolvedScheduleMonthIndex = React.useMemo(
    () => scheduleMonthOptions.findIndex(option => option.key === resolvedScheduleMonthKey),
    [resolvedScheduleMonthKey, scheduleMonthOptions],
  )
  const scheduleMonthLabel =
    scheduleMonthOptions[resolvedScheduleMonthIndex]?.label ?? 'Месяц'
  const scheduleAvailableDatesForMonth = React.useMemo(
    () => scheduleWindowDates.filter(date => toMonthKey(date) === resolvedScheduleMonthKey),
    [resolvedScheduleMonthKey, scheduleWindowDates],
  )
  const activeScheduleDateKeys = React.useMemo(
    () =>
      new Set(
        visibleSelectedScheduleEntries
          .map(item => normalizeScheduleDateKey(item.date))
          .filter(Boolean),
      ),
    [visibleSelectedScheduleEntries],
  )
  const dutyScheduleDateKeys = React.useMemo(
    () =>
      new Set(
        visibleSelectedScheduleEntries
          .filter(item => isDutySchedule(item.duty))
          .map(item => normalizeScheduleDateKey(item.date))
          .filter(Boolean),
      ),
    [visibleSelectedScheduleEntries],
  )
  const resolveScheduleDateForMonth = React.useCallback(
    (monthKey: string | null, preferredDateKey?: string | null) => {
      if (!monthKey) return null

      const monthDateKeys = scheduleWindowDates
        .filter(date => toMonthKey(date) === monthKey)
        .map(date => toDateKey(date))

      if (monthDateKeys.length === 0) {
        return null
      }

      const monthStateKey =
        selectedScheduleRegionId && monthKey ? `${selectedScheduleRegionId}:${monthKey}` : null
      const rememberedDateKey = monthStateKey ? selectedScheduleDateByMonth[monthStateKey] ?? null : null

      if (rememberedDateKey && monthDateKeys.includes(rememberedDateKey)) {
        return rememberedDateKey
      }

      const fallbackDateKey = preferredDateKey ?? selectedScheduleDateKey
      const preferredDayOfMonth = fallbackDateKey
        ? Number(String(fallbackDateKey).split('-')[2] ?? NaN)
        : NaN

      if (Number.isFinite(preferredDayOfMonth)) {
        const matchingDateKey =
          monthDateKeys.find(dateKey => Number(String(dateKey).split('-')[2] ?? NaN) === preferredDayOfMonth) ??
          null

        if (matchingDateKey) {
          return matchingDateKey
        }
      }

      return monthDateKeys.find(dateKey => activeScheduleDateKeys.has(dateKey)) ?? monthDateKeys[0] ?? null
    },
    [
      activeScheduleDateKeys,
      scheduleWindowDates,
      selectedScheduleDateByMonth,
      selectedScheduleDateKey,
      selectedScheduleRegionId,
    ],
  )
  const scheduleCalendarDays = React.useMemo(() => {
    const monthStart = scheduleAvailableDatesForMonth[0]
    if (!monthStart || !resolvedScheduleMonthKey) {
      return []
    }

    const year = monthStart.getFullYear()
    const month = monthStart.getMonth()
    const firstAvailableDay = scheduleAvailableDatesForMonth[0]?.getDate() ?? 1
    const lastAvailableDay =
      scheduleAvailableDatesForMonth[scheduleAvailableDatesForMonth.length - 1]?.getDate() ??
      firstAvailableDay
    const firstDay = new Date(year, month, firstAvailableDay).getDay()
    const mondayBasedOffset = (firstDay + 6) % 7
    const availableDatesMap = new Map(
      scheduleAvailableDatesForMonth.map(date => [date.getDate(), toDateKey(date)]),
    )
    const cells: Array<{
      key: string
      label: string
      isActive: boolean
      hasDuty?: boolean
      isPlaceholder?: boolean
      dateKey?: string
    }> = []

    for (let i = 0; i < mondayBasedOffset; i += 1) {
      cells.push({
        key: `placeholder-${i}`,
        label: '',
        isActive: false,
        isPlaceholder: true,
      })
    }

    for (let day = firstAvailableDay; day <= lastAvailableDay; day += 1) {
      const dateKey = availableDatesMap.get(day)
      if (!dateKey) {
        cells.push({
          key: `placeholder-hidden-${day}`,
          label: '',
          isActive: false,
          isPlaceholder: true,
        })
        continue
      }

      cells.push({
        key: `day-${day}`,
        label: String(day),
        isActive: activeScheduleDateKeys.has(dateKey),
        hasDuty: dutyScheduleDateKeys.has(dateKey),
        dateKey,
      })
    }

    const trailingPlaceholders = (7 - (cells.length % 7)) % 7
    for (let i = 0; i < trailingPlaceholders; i += 1) {
      cells.push({
        key: `placeholder-end-${i}`,
        label: '',
        isActive: false,
        isPlaceholder: true,
      })
    }

    return cells
  }, [activeScheduleDateKeys, dutyScheduleDateKeys, resolvedScheduleMonthKey, scheduleAvailableDatesForMonth])
  React.useEffect(() => {
    if (!selectedScheduleRegionId) {
      return
    }

    const firstMonthKey = scheduleMonthOptions[0]?.key ?? null
    setSelectedScheduleMonthKey(current =>
      current && scheduleMonthOptions.some(option => option.key === current) ? current : firstMonthKey,
    )
  }, [selectedScheduleRegionId, scheduleMonthOptions])
  React.useEffect(() => {
    if (!selectedScheduleRegionId) {
      return
    }

    const nextDateKey = resolveScheduleDateForMonth(resolvedScheduleMonthKey)

    setSelectedScheduleDateKey(current => (current === nextDateKey ? current : nextDateKey))
  }, [
    resolveScheduleDateForMonth,
    selectedScheduleDateByMonth,
    selectedScheduleDateKey,
    resolvedScheduleMonthKey,
    selectedScheduleRegionId,
  ])
  React.useEffect(() => {
    if (selectedScheduleRegionId) {
      return
    }

    setSelectedScheduleMonthKey(null)
    setSelectedScheduleDateKey(null)
    setSelectedScheduleDateByMonth({})
  }, [selectedScheduleRegionId])
  const selectedScheduleDayLabel = React.useMemo(
    () => formatDateLabel(selectedScheduleDateKey),
    [selectedScheduleDateKey],
  )
  const scheduleDayEntries = React.useMemo(() => {
    if (!selectedScheduleRegion) return []
    if (!selectedScheduleDateKey || !activeScheduleDateKeys.has(selectedScheduleDateKey)) return []

    return visibleSelectedScheduleEntries.filter(
      item => normalizeScheduleDateKey(item.date) === selectedScheduleDateKey,
    )
  }, [activeScheduleDateKeys, selectedScheduleDateKey, selectedScheduleRegion, visibleSelectedScheduleEntries])

  const contentPaddingTop = Platform.OS === 'ios' ? 20 : 16

  const overviewContent = (
    <ScrollView
      key="hr-overview"
      contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
          colors={['#FF6A00']}
          progressBackgroundColor="#111111"
        />
      }>
      <View style={[styles.inlineHeader, variant === 'director' && styles.inlineHeaderDirector]}>
        <ManagementHeaderBrand
          variant={variant}
          todayLabel={todayLabel}
          isRevenueExpanded={isDirectorRevenueExpanded}
          onToggleRevenue={() => setIsDirectorRevenueExpanded(current => !current)}
          onOpenRevenueDetails={() => {
            setIsDirectorRevenueExpanded(false)
            setIsDirectorRevenueDetailsOpen(true)
          }}
          directorRevenueSummary={directorRevenueSummary}
          isDirectorRevenueLoading={isDirectorRevenueLoading}
          directorRevenueError={directorRevenueError}
        />
        <TouchableOpacity
          style={[styles.headerAvatarButton, variant === 'director' && styles.headerAvatarButtonFloating]}
          onPress={onGoProfile}
          accessibilityRole="button"
          accessibilityLabel="Открыть профиль">
          <Text style={styles.headerAvatarText}>{profileLetter}</Text>
          {unreadNotificationsCount > 0 ? (
            <View style={styles.headerAvatarBadge}>
              <Text style={styles.headerAvatarBadgeText}>
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
      <View style={styles.summaryCard}>
        <View style={styles.summaryMain}>
          <Text style={styles.summaryValue}>{totalEmployees}</Text>
          <Text style={styles.summaryCaption}>Сейчас на смене</Text>
        </View>
        <View style={styles.summaryStatsRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.summaryStat,
              totalRegions > 0 ? styles.summaryStatInteractive : styles.summaryStatDisabled,
            ]}
            onPress={() => {
              if (totalRegions > 0) {
                setIsRegionsOpen(true)
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Открыть список регионов">
            <View style={styles.summaryStatTopRow}>
              <Text style={styles.summaryStatValue}>{totalRegions}</Text>
              <Text style={styles.summaryStatArrow}>›</Text>
            </View>
            <Text style={[styles.summaryStatLabel, styles.summaryStatLabelInteractive]}>
              {pluralizeRu(totalRegions, 'Регион', 'Региона', 'Регионов')}
            </Text>
            <Text style={styles.summaryStatHint}>
              {totalRegions > 0 ? 'Перейти к списку' : 'Сейчас пусто'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.summaryStat, styles.summaryStatInteractiveSecondary]}
            onPress={() => setIsShiftChartOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Открыть график смен">
            <View style={styles.summaryStatTopRow}>
              <View style={styles.summaryMiniChart}>
                {[10, 16, 12, 20].map((height, index) => (
                  <View key={index} style={styles.summaryMiniChartColumn}>
                    <View style={[styles.summaryMiniChartBar, { height }]} />
                  </View>
                ))}
              </View>
              <Text style={styles.summaryStatArrow}>›</Text>
            </View>
            <Text style={[styles.summaryStatLabel, styles.summaryStatLabelInteractive]}>График смен</Text>
            <Text style={styles.summaryStatHintMuted}>Открыть раздел</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryActionRow}>
          <View style={styles.summaryActionTextBlock}>
            <Text style={styles.summaryActionTitle}>Контроль открытий</Text>
            <Text style={styles.summaryActionSubtitle}>
              Проверяй регионы и магазины, которые ещё не открывались за текущий локальный день.
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.summaryActionButton, styles.summaryActionButtonInteractive]}
            onPress={() => setIsUnopenedShopsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Открыть раздел неоткрытых магазинов">
            <Text style={[styles.summaryActionButtonText, styles.summaryActionButtonTextInteractive]}>
              Просмотреть
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loadError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}
    </ScrollView>
  )

  const regionsContent = (
    <View style={styles.gestureScreen} {...backSwipeResponder.panHandlers}>
      <ScrollView
        key="hr-regions"
        ref={regionsScrollRef}
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={['#FF6A00']}
            progressBackgroundColor="#111111"
          />
        }>
        <View style={[styles.inlineHeader, variant === 'director' && styles.inlineHeaderDirector]}>
        <ManagementHeaderBrand
          variant={variant}
          todayLabel={todayLabel}
          isRevenueExpanded={isDirectorRevenueExpanded}
          onToggleRevenue={() => setIsDirectorRevenueExpanded(current => !current)}
          onOpenRevenueDetails={() => {
            setIsDirectorRevenueExpanded(false)
            setIsDirectorRevenueDetailsOpen(true)
          }}
          directorRevenueSummary={directorRevenueSummary}
          isDirectorRevenueLoading={isDirectorRevenueLoading}
          directorRevenueError={directorRevenueError}
        />
          <TouchableOpacity
            style={[styles.headerAvatarButton, variant === 'director' && styles.headerAvatarButtonFloating]}
            onPress={onGoProfile}
            accessibilityRole="button"
            accessibilityLabel="Открыть профиль">
            <Text style={styles.headerAvatarText}>{profileLetter}</Text>
            {unreadNotificationsCount > 0 ? (
              <View style={styles.headerAvatarBadge}>
                <Text style={styles.headerAvatarBadgeText}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.regionDetailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackNavigation}
            accessibilityRole="button"
            accessibilityLabel="Вернуться на главный экран">
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.regionDetailTextBlock}>
            <Text style={styles.regionDetailTitle}>Регионы</Text>
            <Text style={styles.regionDetailSubtitle}>
              Выбери регион, чтобы посмотреть магазины и сотрудников на смене.
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Все регионы</Text>
          </View>
          {regionCards.length > 0 ? (
            regionCards.map(region => (
              <TouchableOpacity
                key={region.id}
                activeOpacity={0.92}
                style={styles.regionRow}
                onPress={async () => {
                  setSelectedRegionId(region.id)
                  try {
                    await loadRegionDetails(region)
                  } catch {
                    setLoadError('Не удалось загрузить сотрудников по региону')
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`Открыть регион ${region.regionName}`}>
                <View style={styles.regionRowMain}>
                  <View style={styles.regionCardTextBlock}>
                    <Text style={styles.regionCardTitle}>{region.regionName}</Text>
                    <Text style={styles.regionCardSubtitle}>
                      {`${region.employeeCount} ${pluralizeRu(region.employeeCount, 'сотрудник', 'сотрудника', 'сотрудников')} на смене`}
                    </Text>
                  </View>
                  <Text style={styles.regionArrowInline}>›</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Сейчас нет открытых смен</Text>
              <Text style={styles.emptyText}>
                Когда сотрудники откроют смены, здесь появятся активные регионы и открытые магазины.
              </Text>
            </View>
          )}
        </View>

        {loadError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )

  const shiftChartOverviewContent = (
    <View style={styles.gestureScreen} {...backSwipeResponder.panHandlers}>
      <ScrollView
        key="hr-shift-chart"
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={['#FF6A00']}
            progressBackgroundColor="#111111"
          />
        }>
        <View style={[styles.inlineHeader, variant === 'director' && styles.inlineHeaderDirector]}>
        <ManagementHeaderBrand
          variant={variant}
          todayLabel={todayLabel}
          isRevenueExpanded={isDirectorRevenueExpanded}
          onToggleRevenue={() => setIsDirectorRevenueExpanded(current => !current)}
          onOpenRevenueDetails={() => {
            setIsDirectorRevenueExpanded(false)
            setIsDirectorRevenueDetailsOpen(true)
          }}
          directorRevenueSummary={directorRevenueSummary}
          isDirectorRevenueLoading={isDirectorRevenueLoading}
          directorRevenueError={directorRevenueError}
        />
          <TouchableOpacity
            style={[styles.headerAvatarButton, variant === 'director' && styles.headerAvatarButtonFloating]}
            onPress={onGoProfile}
            accessibilityRole="button"
            accessibilityLabel="Открыть профиль">
            <Text style={styles.headerAvatarText}>{profileLetter}</Text>
            {unreadNotificationsCount > 0 ? (
              <View style={styles.headerAvatarBadge}>
                <Text style={styles.headerAvatarBadgeText}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.regionDetailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.9}
            onPress={handleBackNavigation}
            accessibilityRole="button"
            accessibilityLabel="Вернуться назад">
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.regionDetailTextBlock}>
            <Text style={styles.regionDetailTitle}>График смен</Text>
            <Text style={styles.regionDetailSubtitle}>
              Выбери регион, чтобы открыть календарь смен и посмотреть расписание на ближайшие 30 дней.
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Регионы в графике</Text>
          </View>
          <Text style={styles.scheduleBoardSubtitle}>
            Ниже собраны регионы, в которых есть сотрудники с назначенными сменами на ближайшие 30 дней.
          </Text>
          {isScheduleLoading && scheduleRegionCards.length === 0 ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="small" color="#FF6A00" />
              <Text style={styles.emptyTitle}>Загружаем график смен</Text>
              <Text style={styles.emptyText}>
                Подтягиваем регионы и сотрудников из расписания.
              </Text>
            </View>
          ) : scheduleRegionCards.length > 0 ? (
            <View style={styles.scheduleRegionsList}>
              {scheduleRegionCards.map(region => (
                <TouchableOpacity
                  key={`schedule-${region.id}`}
                  activeOpacity={0.92}
                  style={styles.scheduleEntryCard}
                  onPress={async () => {
                    setSelectedScheduleRegionId(region.id)
                    await loadScheduleRegionDetails(region)
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Открыть график региона ${region.regionName}`}>
                  <View style={styles.scheduleEntryMain}>
                    <View style={styles.scheduleEntryTextBlock}>
                      <Text style={styles.scheduleEntryEyebrow}>Календарь на 30 дней</Text>
                      <Text style={styles.scheduleEntryTitle}>{region.regionName}</Text>
                      <Text style={styles.scheduleEntrySubtitle}>
                        {region.employeeCount > 0
                          ? `${region.employeeCount} ${pluralizeRu(region.employeeCount, 'сотрудник', 'сотрудника', 'сотрудников')} в графике`
                          : 'График пока пуст'}
                      </Text>
                    </View>
                    <Text style={styles.scheduleEntryArrow}>›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Пока нечего показывать</Text>
              <Text style={styles.emptyText}>
                Когда подтянем данные графика с бэка, здесь появится список регионов с расписанием.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )

  const shiftChartRegionContent = selectedScheduleRegion ? (
    <View style={styles.gestureScreen} {...backSwipeResponder.panHandlers}>
      <ScrollView
        key={`hr-shift-chart-${selectedScheduleRegion.id}`}
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={['#FF6A00']}
            progressBackgroundColor="#111111"
          />
        }>
        <View style={[styles.inlineHeader, variant === 'director' && styles.inlineHeaderDirector]}>
        <ManagementHeaderBrand
          variant={variant}
          todayLabel={todayLabel}
          isRevenueExpanded={isDirectorRevenueExpanded}
          onToggleRevenue={() => setIsDirectorRevenueExpanded(current => !current)}
          onOpenRevenueDetails={() => {
            setIsDirectorRevenueExpanded(false)
            setIsDirectorRevenueDetailsOpen(true)
          }}
          directorRevenueSummary={directorRevenueSummary}
          isDirectorRevenueLoading={isDirectorRevenueLoading}
          directorRevenueError={directorRevenueError}
        />
          <TouchableOpacity
            style={[styles.headerAvatarButton, variant === 'director' && styles.headerAvatarButtonFloating]}
            onPress={onGoProfile}
            accessibilityRole="button"
            accessibilityLabel="Открыть профиль">
            <Text style={styles.headerAvatarText}>{profileLetter}</Text>
            {unreadNotificationsCount > 0 ? (
              <View style={styles.headerAvatarBadge}>
                <Text style={styles.headerAvatarBadgeText}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.regionDetailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.9}
            onPress={handleBackNavigation}
            accessibilityRole="button"
            accessibilityLabel="Вернуться к регионам графика">
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.regionDetailTextBlock}>
            <Text style={styles.regionDetailTitle}>{selectedScheduleRegion.regionName}</Text>
            <Text style={styles.regionDetailSubtitle}>
              Календарь смен на 30 дней. Выбери дату и ниже увидишь магазины, сотрудников и время.
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Календарь смен</Text>
          </View>
          <Text style={styles.scheduleBoardSubtitle}>
            Выбери дату в календаре, чтобы посмотреть назначенные смены.
          </Text>
          <View style={styles.calendarLegendRow}>
            <View style={styles.calendarLegendItem}>
              <View style={[styles.calendarDayDot, styles.calendarDayDotDuty]} />
              <Text style={styles.calendarLegendText}>Дежурство</Text>
            </View>
          </View>
          <View style={styles.calendarMonthHeader}>
            <View style={styles.calendarMonthSwitcher}>
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={resolvedScheduleMonthIndex <= 0}
                onPress={() => {
                  if (resolvedScheduleMonthIndex > 0) {
                    const nextMonthKey = scheduleMonthOptions[resolvedScheduleMonthIndex - 1]?.key ?? null
                    const nextDateKey = resolveScheduleDateForMonth(nextMonthKey, selectedScheduleDateKey)
                    React.startTransition(() => {
                      setSelectedScheduleMonthKey(nextMonthKey)
                      setSelectedScheduleDateKey(nextDateKey)
                    })
                  }
                }}
                style={[
                  styles.calendarMonthSwitchButton,
                  resolvedScheduleMonthIndex <= 0 && styles.calendarMonthSwitchButtonDisabled,
                ]}>
                <Text
                  style={[
                    styles.calendarMonthSwitchText,
                    resolvedScheduleMonthIndex <= 0 && styles.calendarMonthSwitchTextDisabled,
                  ]}>
                  ‹
                </Text>
              </TouchableOpacity>
              <Text style={styles.calendarMonthTitle}>{scheduleMonthLabel}</Text>
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={resolvedScheduleMonthIndex < 0 || resolvedScheduleMonthIndex >= scheduleMonthOptions.length - 1}
                onPress={() => {
                  if (resolvedScheduleMonthIndex >= 0 && resolvedScheduleMonthIndex < scheduleMonthOptions.length - 1) {
                    const nextMonthKey = scheduleMonthOptions[resolvedScheduleMonthIndex + 1]?.key ?? null
                    const nextDateKey = resolveScheduleDateForMonth(nextMonthKey, selectedScheduleDateKey)
                    React.startTransition(() => {
                      setSelectedScheduleMonthKey(nextMonthKey)
                      setSelectedScheduleDateKey(nextDateKey)
                    })
                  }
                }}
                style={[
                  styles.calendarMonthSwitchButton,
                  (resolvedScheduleMonthIndex < 0 || resolvedScheduleMonthIndex >= scheduleMonthOptions.length - 1) &&
                    styles.calendarMonthSwitchButtonDisabled,
                ]}>
                <Text
                  style={[
                    styles.calendarMonthSwitchText,
                    (resolvedScheduleMonthIndex < 0 || resolvedScheduleMonthIndex >= scheduleMonthOptions.length - 1) &&
                      styles.calendarMonthSwitchTextDisabled,
                  ]}>
                  ›
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.calendarMonthMeta}>
              {selectedScheduleRegion.employeeCount} {pluralizeRu(selectedScheduleRegion.employeeCount, 'сотрудник', 'сотрудника', 'сотрудников')} в графике
            </Text>
          </View>
          <View style={styles.calendarWeekdaysRow}>
            {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(day => (
              <Text key={day} style={styles.calendarWeekdayText}>{day}</Text>
            ))}
          </View>
          {isSelectedScheduleRegionLoading && !hasLoadedSelectedScheduleRegion ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="small" color="#FF6A00" />
              <Text style={styles.emptyTitle}>Загружаем календарь</Text>
              <Text style={styles.emptyText}>
                Подтягиваем даты, магазины и сотрудников по этому региону.
              </Text>
            </View>
          ) : (
            <View style={styles.calendarGrid}>
              {scheduleCalendarDays.map(day => (
                <TouchableOpacity
                  key={day.key}
                  activeOpacity={0.88}
                  style={[
                    styles.calendarDayCell,
                    day.isPlaceholder && styles.calendarDayCellPlaceholder,
                    day.isActive && styles.calendarDayCellActive,
                    day.dateKey === selectedScheduleDateKey && styles.calendarDayCellSelected,
                  ]}
                  disabled={day.isPlaceholder}
                  onPress={() => {
                    if (day.dateKey) {
                      setSelectedScheduleDateKey(day.dateKey)
                      if (selectedScheduleMonthStateKey) {
                        const monthStateKey = selectedScheduleMonthStateKey
                        setSelectedScheduleDateByMonth(current =>
                          current[monthStateKey] === day.dateKey
                            ? current
                            : { ...current, [monthStateKey]: day.dateKey ?? '' },
                        )
                      }
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    day.dateKey ? `Открыть смены на ${formatDateLabel(day.dateKey)}` : undefined
                  }>
                  <Text
                    style={[
                      styles.calendarDayText,
                      day.isPlaceholder && styles.calendarDayTextPlaceholder,
                      day.isActive && styles.calendarDayTextActive,
                      day.dateKey === selectedScheduleDateKey && styles.calendarDayTextSelected,
                    ]}>
                    {day.label}
                  </Text>
                  {day.isActive ? (
                    <View
                      style={[
                        styles.calendarDayDot,
                        day.hasDuty && styles.calendarDayDotDuty,
                      ]}
                    />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {selectedScheduleDayLabel
                ? `Смены на ${selectedScheduleDayLabel}`
                : 'Смены по выбранной дате'}
            </Text>
          </View>
          {isSelectedScheduleRegionLoading && !hasLoadedSelectedScheduleRegion ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="small" color="#FF6A00" />
              <Text style={styles.emptyTitle}>Загружаем смены</Text>
              <Text style={styles.emptyText}>
                Список по выбранным датам появится сразу после загрузки графика.
              </Text>
            </View>
          ) : scheduleDayEntries.length > 0 ? (
            <View style={styles.scheduleDayList}>
              {scheduleDayEntries.map(item => (
                <View key={item.id} style={styles.scheduleDayCard}>
                  <View style={styles.scheduleDayCardTop}>
                    {item.shopName?.trim() || item.openingTime || item.closingTime ? (
                      <View style={styles.scheduleDayCardTitleRow}>
                        {item.shopName?.trim() ? (
                          <Text style={styles.scheduleDayCardTitle}>{item.shopName.trim()}</Text>
                        ) : null}
                        {item.openingTime || item.closingTime ? (
                          <View style={styles.scheduleDayCardTimePill}>
                            <Text style={styles.scheduleDayCardTimeText}>
                              {formatTimeRange(item.openingTime, item.closingTime)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                    <View style={styles.scheduleDayCardTextBlock}>
                      {item.duty?.trim() ? (
                        <View
                          style={[
                            styles.scheduleDayDutyRow,
                            (item.shopName?.trim() || item.openingTime || item.closingTime) &&
                              styles.scheduleDayDutyRowWithTitle,
                          ]}>
                          <View style={styles.scheduleDayDutyDot} />
                          <Text style={styles.scheduleDayDutyInlineText}>{item.duty.trim()}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.scheduleDayCardSubtitle}>
                        {item.employeeName?.trim() || 'Сотрудник не указан'}
                      </Text>
                    </View>
                  </View>
                  {!![item.addressStreet, item.addressNumber].filter(Boolean).length ? (
                    <Text style={styles.scheduleDayCardAddress}>
                      {[item.addressStreet, item.addressNumber].filter(Boolean).join(', ')}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.scheduleDayEmptyText}>На эту дату смен пока нет</Text>
          )}
        </View>
      </ScrollView>
    </View>
  ) : null

  const unopenedShopsOverviewContent = (
    <View style={styles.gestureScreen} {...backSwipeResponder.panHandlers}>
      <ScrollView
        key="hr-unopened-shops"
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={['#FF6A00']}
            progressBackgroundColor="#111111"
          />
        }>
        <View style={[styles.inlineHeader, variant === 'director' && styles.inlineHeaderDirector]}>
        <ManagementHeaderBrand
          variant={variant}
          todayLabel={todayLabel}
          isRevenueExpanded={isDirectorRevenueExpanded}
          onToggleRevenue={() => setIsDirectorRevenueExpanded(current => !current)}
          onOpenRevenueDetails={() => {
            setIsDirectorRevenueExpanded(false)
            setIsDirectorRevenueDetailsOpen(true)
          }}
          directorRevenueSummary={directorRevenueSummary}
          isDirectorRevenueLoading={isDirectorRevenueLoading}
          directorRevenueError={directorRevenueError}
        />
          <TouchableOpacity
            style={[styles.headerAvatarButton, variant === 'director' && styles.headerAvatarButtonFloating]}
            onPress={onGoProfile}
            accessibilityRole="button"
            accessibilityLabel="Открыть профиль">
            <Text style={styles.headerAvatarText}>{profileLetter}</Text>
            {unreadNotificationsCount > 0 ? (
              <View style={styles.headerAvatarBadge}>
                <Text style={styles.headerAvatarBadgeText}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.regionDetailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.9}
            onPress={handleBackNavigation}
            accessibilityRole="button"
            accessibilityLabel="Вернуться назад">
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.regionDetailTextBlock}>
            <Text style={styles.regionDetailTitle}>Контроль открытий</Text>
            <Text style={styles.regionDetailSubtitle}>
              Отслеживай регионы и магазины, которые ещё не открывались за текущий локальный день.
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Все регионы</Text>
          </View>
          {displayedUnopenedRegionCards.length > 0 ? (
            displayedUnopenedRegionCards.map(region => (
              <TouchableOpacity
                key={`unopened-${region.id}`}
                activeOpacity={0.92}
                style={styles.regionRow}
                onPress={() => {
                  setSelectedUnopenedRegionId(region.id)

                  if (!loadedUnopenedRegionIds[region.id] && loadingUnopenedRegionId !== region.id) {
                    void loadUnopenedRegionDetails(region)
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`Открыть контроль открытий региона ${region.regionName}`}>
                <View style={styles.regionRowMain}>
                  <View style={styles.regionCardTextBlock}>
                    <Text style={styles.regionCardTitle}>{region.regionName}</Text>
                    <Text style={styles.regionCardSubtitle}>
                      Магазины без открытия за текущий локальный день.
                    </Text>
                  </View>
                  <Text style={styles.regionArrowInline}>›</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : isUnopenedShopsLoading && !hasLoadedUnopenedRegions ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="small" color="#FF6A00" />
              <Text style={styles.emptyTitle}>Загружаем регионы</Text>
              <Text style={styles.emptyText}>
                Подтягиваем актуальный список регионов для контроля открытий.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>На сегодня всё открыто</Text>
              <Text style={styles.emptyText}>
                Во всех доступных регионах уже есть открытия за текущий локальный день.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )

  const unopenedShopsRegionContent = selectedUnopenedRegion ? (
    <View style={styles.gestureScreen} {...backSwipeResponder.panHandlers}>
      <ScrollView
        key={`hr-unopened-region-${selectedUnopenedRegion.id}`}
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={['#FF6A00']}
            progressBackgroundColor="#111111"
          />
        }>
        <View style={[styles.inlineHeader, variant === 'director' && styles.inlineHeaderDirector]}>
        <ManagementHeaderBrand
          variant={variant}
          todayLabel={todayLabel}
          isRevenueExpanded={isDirectorRevenueExpanded}
          onToggleRevenue={() => setIsDirectorRevenueExpanded(current => !current)}
          onOpenRevenueDetails={() => {
            setIsDirectorRevenueExpanded(false)
            setIsDirectorRevenueDetailsOpen(true)
          }}
          directorRevenueSummary={directorRevenueSummary}
          isDirectorRevenueLoading={isDirectorRevenueLoading}
          directorRevenueError={directorRevenueError}
        />
          <TouchableOpacity
            style={[styles.headerAvatarButton, variant === 'director' && styles.headerAvatarButtonFloating]}
            onPress={onGoProfile}
            accessibilityRole="button"
            accessibilityLabel="Открыть профиль">
            <Text style={styles.headerAvatarText}>{profileLetter}</Text>
            {unreadNotificationsCount > 0 ? (
              <View style={styles.headerAvatarBadge}>
                <Text style={styles.headerAvatarBadgeText}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <View style={styles.regionDetailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.9}
            onPress={handleBackNavigation}
            accessibilityRole="button"
            accessibilityLabel="Вернуться к регионам неоткрытых магазинов">
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.regionDetailTextBlock}>
            <Text style={styles.regionDetailTitle}>{selectedUnopenedRegion.regionName}</Text>
            <Text style={styles.regionDetailSubtitle}>
              Список магазинов, которые ещё не открывались сегодня по локальной дате региона.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Магазины без открытия</Text>
          </View>
          {isSelectedUnopenedRegionLoading && !hasLoadedSelectedUnopenedRegion ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="small" color="#FF6A00" />
              <Text style={styles.emptyTitle}>Загружаем магазины</Text>
              <Text style={styles.emptyText}>
                Проверяем открытия по локальной дате региона.
              </Text>
            </View>
          ) : displayedUnopenedShops.length > 0 ? (
            <View style={styles.unopenedShopList}>
              {displayedUnopenedShops.map(shop => (
                <View key={shop.id} style={styles.storeCard}>
                  <View style={styles.storeCardHeader}>
                    <View style={styles.storeCardTextBlock}>
                      <Text style={styles.storeCardTitle}>{shop.shopName}</Text>
                      <Text style={styles.unopenedShopSubtitle}>
                        {formatTimeRange(shop.openingTime, shop.closingTime)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Все магазины уже открылись</Text>
              <Text style={styles.emptyText}>
                В регионе {selectedUnopenedRegion.regionName} на текущий локальный день не осталось магазинов без открытия.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  ) : null

  const directorRevenueDetailsContent =
    variant === 'director' && isDirectorRevenueDetailsOpen ? (
      <View style={styles.gestureScreen} {...backSwipeResponder.panHandlers}>
        <ScrollView
          key="director-revenue-details"
          contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
              colors={['#FF6A00']}
              progressBackgroundColor="#111111"
            />
          }>
          <View style={[styles.inlineHeader, styles.inlineHeaderDirector]}>
            <ManagementHeaderBrand
              variant={variant}
              todayLabel={todayLabel}
              isRevenueExpanded={isDirectorRevenueExpanded}
              onToggleRevenue={() => setIsDirectorRevenueExpanded(current => !current)}
              onOpenRevenueDetails={() => {
                setIsDirectorRevenueExpanded(false)
                setIsDirectorRevenueDetailsOpen(true)
              }}
              showRevenueCard={false}
              directorRevenueSummary={directorRevenueSummary}
              isDirectorRevenueLoading={isDirectorRevenueLoading}
              directorRevenueError={directorRevenueError}
            />
            <TouchableOpacity
              style={[styles.headerAvatarButton, styles.headerAvatarButtonFloating]}
              onPress={onGoProfile}
              accessibilityRole="button"
              accessibilityLabel="Открыть профиль">
              <Text style={styles.headerAvatarText}>{profileLetter}</Text>
              {unreadNotificationsCount > 0 ? (
                <View style={styles.headerAvatarBadge}>
                  <Text style={styles.headerAvatarBadgeText}>
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          <View style={styles.regionDetailHeader}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.9}
              onPress={handleBackNavigation}
              accessibilityRole="button"
              accessibilityLabel="Вернуться назад">
              <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.regionDetailTextBlock}>
              <Text style={styles.regionDetailTitle}>Выручка за вчера</Text>
              <Text style={styles.regionDetailSubtitle}>
                Полная финансовая сводка по регионам и магазинам за вчерашний день.
              </Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Общий итог</Text>
            </View>
            {isDirectorRevenueLoading && !directorRevenueSummary ? (
              <View style={styles.emptyCard}>
                <ActivityIndicator size="small" color="#FF6A00" />
                <Text style={styles.emptyTitle}>Загружаем выручку</Text>
                <Text style={styles.emptyText}>
                  Подтягиваем итог по компании, регионам и магазинам за вчера.
                </Text>
              </View>
            ) : directorRevenueError ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Не удалось загрузить сводку</Text>
                <Text style={styles.emptyText}>{directorRevenueError}</Text>
              </View>
            ) : directorRevenueSummary ? (
              <View style={styles.directorRevenueOverviewGrid}>
                <View style={styles.directorRevenueOverviewCard}>
                  <Text style={styles.directorRevenueOverviewLabel}>Общая выручка</Text>
                  <Text style={styles.directorRevenueOverviewValue}>
                    {formatCurrency(directorRevenueSummary.totalRevenue)}
                  </Text>
                </View>
                <View style={styles.directorRevenueOverviewCard}>
                  <Text style={styles.directorRevenueOverviewLabel}>Чеки за день</Text>
                  <Text style={styles.directorRevenueOverviewValue}>
                    {formatCompactNumber(directorRevenueSummary.totalInvoices)}
                  </Text>
                </View>
                <View style={styles.directorRevenueOverviewCard}>
                  <Text style={styles.directorRevenueOverviewLabel}>Магазины в отчёте</Text>
                  <Text style={styles.directorRevenueOverviewValue}>
                    {formatCompactNumber(directorRevenueSummary.shopCount)}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Все регионы</Text>
            </View>
            {directorRevenueSummary?.regions.length ? (
              <View style={styles.directorRevenueRegionList}>
                {directorRevenueSummary.regions.map(region => (
                  <View key={region.id} style={styles.directorRevenueRegionRow}>
                    <View style={styles.directorRevenueRegionTextBlock}>
                      <Text style={styles.directorRevenueRegionName}>{region.regionName}</Text>
                      <Text style={styles.directorRevenueRegionMeta}>
                        {`${formatCompactNumber(region.totalInvoices)} ${pluralizeRu(
                          region.totalInvoices,
                          'чек',
                          'чека',
                          'чеков',
                        )} • ${formatCompactNumber(region.shopCount)} ${pluralizeRu(
                          region.shopCount,
                          'магазин',
                          'магазина',
                          'магазинов',
                        )}`}
                      </Text>
                    </View>
                    <Text style={styles.directorRevenueRegionValue}>
                      {formatCurrency(region.totalRevenue)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Пока нет данных по регионам</Text>
                <Text style={styles.emptyText}>
                  За вчерашний день ещё нет закрытых смен, попавших в финансовую сводку.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Топ магазинов</Text>
            </View>
            {directorRevenueSummary?.topShops.length ? (
              <View style={styles.directorRevenueTopList}>
                {directorRevenueSummary.topShops.map((shop, index) => (
                  <View key={shop.id} style={styles.directorRevenueTopRow}>
                    <View style={styles.directorRevenueTopRank}>
                      <Text style={styles.directorRevenueTopRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.directorRevenueTopTextBlock}>
                      <Text style={styles.directorRevenueTopName}>{shop.shopName}</Text>
                      <Text style={styles.directorRevenueTopMeta}>
                        {`${shop.regionName} • ${formatCompactNumber(shop.totalInvoices)} ${pluralizeRu(
                          shop.totalInvoices,
                          'чек',
                          'чека',
                          'чеков',
                        )}`}
                      </Text>
                    </View>
                    <Text style={styles.directorRevenueTopValue}>
                      {formatCurrency(shop.totalRevenue)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Топ магазинов пока пуст</Text>
                <Text style={styles.emptyText}>
                  Список появится, когда в сводке за вчера будут данные по магазинам.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    ) : null

  const detailContent = selectedRegion ? (
    <View style={styles.gestureScreen} {...backSwipeResponder.panHandlers}>
      <ScrollView
        key={`hr-region-${selectedRegion.id}`}
        ref={detailScrollRef}
        contentContainerStyle={[styles.content, { paddingTop: contentPaddingTop }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={['#FF6A00']}
            progressBackgroundColor="#111111"
          />
        }>
        <View style={[styles.inlineHeader, variant === 'director' && styles.inlineHeaderDirector]}>
          <ManagementHeaderBrand
            variant={variant}
            todayLabel={todayLabel}
            isRevenueExpanded={isDirectorRevenueExpanded}
            onToggleRevenue={() => setIsDirectorRevenueExpanded(current => !current)}
            onOpenRevenueDetails={() => {
              setIsDirectorRevenueExpanded(false)
              setIsDirectorRevenueDetailsOpen(true)
            }}
            directorRevenueSummary={directorRevenueSummary}
            isDirectorRevenueLoading={isDirectorRevenueLoading}
            directorRevenueError={directorRevenueError}
          />
          <TouchableOpacity
            style={[styles.headerAvatarButton, variant === 'director' && styles.headerAvatarButtonFloating]}
            onPress={onGoProfile}
            accessibilityRole="button"
            accessibilityLabel="Открыть профиль">
            <Text style={styles.headerAvatarText}>{profileLetter}</Text>
            {unreadNotificationsCount > 0 ? (
              <View style={styles.headerAvatarBadge}>
                <Text style={styles.headerAvatarBadgeText}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
        <View style={styles.regionDetailHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackNavigation}
            accessibilityRole="button"
            accessibilityLabel="Вернуться к списку регионов">
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.regionDetailTextBlock}>
            <Text style={styles.regionDetailTitle}>{selectedRegion.regionName}</Text>
            <Text style={styles.regionDetailSubtitle}>
              {selectedRegion.employeeCount > 0
                ? `Сейчас ${getPresentWorkVerb(selectedRegion.employeeCount)} ${selectedRegion.employeeCount} ${pluralizeRu(selectedRegion.employeeCount, 'сотрудник', 'сотрудника', 'сотрудников')}`
                : 'Сейчас в регионе открытых смен нет'}
            </Text>
          </View>
        </View>

        <View style={styles.detailSummaryCard}>
          <View style={styles.detailSummaryItem}>
            <Text style={styles.detailSummaryValue}>{selectedRegion.employeeCount}</Text>
            <Text style={styles.detailSummaryLabel}>
              {pluralizeRu(selectedRegion.employeeCount, 'сотрудник', 'сотрудника', 'сотрудников')}
            </Text>
          </View>
          <View style={styles.detailSummaryAccentBlock}>
            <View style={styles.detailSummaryAccentBar} />
            <Text style={styles.detailSummaryAccentText}>Сейчас на смене</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Магазины региона</Text>
          </View>
          {selectedRegionStores.length > 0 ? (
            selectedRegionStores.map(store => (
              <View key={store.id} style={styles.storeCard}>
                <View style={styles.storeCardHeader}>
                  <View style={styles.storeCardTextBlock}>
                    <Text style={styles.storeCardTitle}>{store.shopName}</Text>
                    <Text style={styles.storeCardSubtitle}>
                      {formatTimeRange(store.openingTime, store.closingTime)}
                    </Text>
                  </View>
                </View>
                <View style={styles.peopleList}>
                  {store.employees.map(employee => (
                    <View key={employee.id} style={styles.personRow}>
                      <View style={styles.personRowHeader}>
                        <Text style={styles.personName}>{employee.name}</Text>
                        {employee.phoneNumber ? (
                          <TouchableOpacity
                            activeOpacity={0.88}
                            style={styles.callButton}
                            onPress={() => handlePhonePress(employee.phoneNumber)}
                            accessibilityRole="button"
                            accessibilityLabel={`Позвонить ${employee.name}`}>
                            <Text style={styles.callButtonText}>Позвонить</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          ) : isSelectedRegionLoading || !hasLoadedSelectedRegion ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="small" color="#FF6A00" />
              <Text style={styles.emptyTitle}>Загружаем магазины региона</Text>
              <Text style={styles.emptyText}>
                Подтягиваем сотрудников и открытые точки для этого региона.
              </Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>В этом регионе сейчас пусто</Text>
              <Text style={styles.emptyText}>
                Как только сотрудники откроют смены, здесь появятся магазины и список тех, кто работает.
              </Text>
            </View>
          )}
        </View>

        {loadError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  ) : null

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
      {isLoading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#FF6A00" />
        </View>
      ) : isDirectorRevenueDetailsOpen ? (
        directorRevenueDetailsContent
      ) : selectedRegion ? (
        detailContent
      ) : selectedScheduleRegion ? (
        shiftChartRegionContent
      ) : selectedUnopenedRegion ? (
        unopenedShopsRegionContent
      ) : isShiftChartOpen ? (
        shiftChartOverviewContent
      ) : isUnopenedShopsOpen ? (
        unopenedShopsOverviewContent
      ) : isRegionsOpen ? (
        regionsContent
      ) : (
        overviewContent
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gestureScreen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Platform.OS === 'android' ? 18 : 20,
    paddingBottom: 120,
    gap: 18,
  },
  inlineHeader: {
    position: 'relative',
    minHeight: 38,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 4,
  },
  inlineHeaderDirector: {
    minHeight: 0,
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: Platform.OS === 'ios' ? 58 : 0,
    gap: 6,
  },
  directorHeaderContent: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  directorHeaderIntro: {
    paddingRight: Platform.OS === 'ios' ? 58 : 68,
    gap: 2,
  },
  headerEyebrow: {
    color: '#8F8F8F',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  directorHeaderTitleBlock: {
    alignSelf: 'flex-start',
    paddingTop: 0,
    marginTop: 2,
  },
  directorHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 35,
    letterSpacing: -0.9,
    fontFamily: 'OpenLukyanov',
    textShadowColor: 'rgba(255,255,255,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  directorHeaderRevenueCard: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,176,82,0.18)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  directorHeaderRevenueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  directorHeaderRevenueTextBlock: {
    flex: 1,
    gap: 6,
  },
  directorHeaderRevenueEyebrow: {
    color: '#F4D0A9',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  directorHeaderRevenueHint: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(255,106,0,0.18)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  directorHeaderRevenueDelta: {
    color: '#FFCF9F',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  directorHeaderRevenueDeltaPositive: {
    color: '#6EE7A8',
  },
  directorHeaderRevenueDeltaNegative: {
    color: '#FF7D7D',
  },
  directorHeaderRevenueArrow: {
    color: '#FFB27A',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
    width: 22,
    textAlign: 'center',
  },
  directorHeaderRevenueArrowCollapsed: {
    transform: [{ rotate: '90deg' }],
  },
  directorHeaderRevenueArrowExpanded: {
    transform: [{ rotate: '-90deg' }],
  },
  directorHeaderRevenueExpandedText: {
    color: '#8F8F8F',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  directorHeaderRevenueExpandedBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  directorHeaderRevenueExpandedLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  directorHeaderRevenueExpandedAccent: {
    width: 3,
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(255,106,0,0.6)',
    marginTop: 2,
  },
  directorRevenueDetails: {
    gap: 14,
  },
  directorRevenueMetricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  directorRevenueMetricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,176,82,0.12)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  directorRevenueMetricLabel: {
    color: '#A3A3A3',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  directorRevenueMetricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  directorRevenueSection: {
    gap: 8,
  },
  directorRevenueSectionTitle: {
    color: '#F1D0AE',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  directorRevenueSectionEmpty: {
    color: '#8F8F8F',
    fontSize: 12,
    lineHeight: 17,
  },
  directorRevenueRegionList: {
    gap: 8,
  },
  directorRevenueRegionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.028)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  directorRevenueRegionTextBlock: {
    flex: 1,
    gap: 2,
  },
  directorRevenueRegionName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  directorRevenueRegionMeta: {
    color: '#8F8F8F',
    fontSize: 11,
    lineHeight: 15,
  },
  directorRevenueRegionValue: {
    color: '#FFB27A',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  directorRevenueTopList: {
    gap: 8,
  },
  directorRevenueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.028)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  directorRevenueTopRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,106,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.24)',
  },
  directorRevenueTopRankText: {
    color: '#FFB27A',
    fontSize: 11,
    fontWeight: '800',
  },
  directorRevenueTopTextBlock: {
    flex: 1,
    gap: 2,
  },
  directorRevenueTopName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  directorRevenueTopMeta: {
    color: '#8F8F8F',
    fontSize: 11,
    lineHeight: 15,
  },
  directorRevenueTopValue: {
    color: '#FFD2A7',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  directorRevenueFootnote: {
    color: '#8F8F8F',
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 2,
    marginTop: 2,
  },
  directorRevenueDetailsButton: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: 'rgba(255,106,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 2,
  },
  directorRevenueDetailsButtonText: {
    color: '#FFB27A',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  directorRevenueOverviewGrid: {
    gap: 10,
  },
  directorRevenueOverviewCard: {
    borderRadius: 16,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 4,
  },
  directorRevenueOverviewLabel: {
    color: '#8F8F8F',
    fontSize: 12,
    fontWeight: '700',
  },
  directorRevenueOverviewValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  titleSvgWrap: {
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    marginTop: -6,
    overflow: 'visible',
  },
  titleSvg: {
    width: '100%',
    height: Platform.OS === 'android' ? 84 : 90,
    overflow: 'visible',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: -17,
  },
  headerMetaRowDirector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 1,
  },
  headerMetaAccent: {
    width: 24,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#FF6A00',
  },
  headerMetaAccentDirector: {
    width: 28,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#FF6A00',
  },
  headerCaptionText: {
    color: '#B6B6B6',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 24,
    padding: 18,
    gap: 16,
  },
  summaryMain: {
    gap: 2,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
  },
  summaryCaption: {
    color: '#8F8F8F',
    fontSize: 14,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  summaryStat: {
    flex: 1,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 2,
  },
  summaryStatInteractive: {
    backgroundColor: 'rgba(255,106,0,0.08)',
    borderColor: 'rgba(255,106,0,0.28)',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
  },
  summaryStatInteractiveSecondary: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderColor: 'rgba(255,176,82,0.22)',
  },
  summaryStatDisabled: {
    backgroundColor: '#151515',
    borderColor: 'rgba(255,255,255,0.06)',
    opacity: 0.82,
  },
  summaryStatTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  summaryActionTextBlock: {
    flex: 1,
    gap: 4,
  },
  summaryActionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  summaryActionSubtitle: {
    color: '#8F8F8F',
    fontSize: 13,
    lineHeight: 18,
  },
  summaryActionButton: {
    borderRadius: 14,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryActionButtonDisabled: {
    backgroundColor: '#111111',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryActionButtonInteractive: {
    backgroundColor: 'rgba(255,106,0,0.08)',
    borderColor: 'rgba(255,106,0,0.28)',
  },
  summaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  summaryActionButtonTextInteractive: {
    color: '#FFB27A',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryActionButtonTextDisabled: {
    color: '#8F8F8F',
  },
  summaryStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  summaryMiniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    minHeight: 22,
  },
  summaryMiniChartColumn: {
    width: 7,
    height: 22,
    justifyContent: 'flex-end',
  },
  summaryMiniChartBar: {
    width: '100%',
    borderRadius: 999,
    backgroundColor: '#FF6A00',
  },
  summaryStatLabel: {
    color: '#8F8F8F',
    fontSize: 12,
  },
  summaryStatLabelInteractive: {
    color: '#FFFFFF',
  },
  summaryStatHint: {
    color: '#FFB27A',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryStatHintMuted: {
    color: '#D9A974',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryStatArrow: {
    color: '#FFB27A',
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 8,
    lineHeight: 22,
  },
  section: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  regionRow: {
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  regionRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  regionCardTextBlock: {
    flex: 1,
    gap: 4,
  },
  regionCardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  regionCardSubtitle: {
    color: '#8F8F8F',
    fontSize: 13,
    lineHeight: 18,
  },
  regionArrowInline: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 1,
  },
  scheduleBoardSubtitle: {
    color: '#8F8F8F',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  calendarLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 4,
    marginTop: 10,
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarLegendText: {
    color: '#8F8F8F',
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleRegionsList: {
    marginTop: 10,
    gap: 12,
  },
  scheduleEntryCard: {
    borderRadius: 22,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255,176,82,0.12)',
    paddingHorizontal: 17,
    paddingVertical: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 4,
  },
  scheduleEntryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scheduleEntryTextBlock: {
    flex: 1,
    gap: 6,
  },
  scheduleEntryEyebrow: {
    color: '#9B6A42',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scheduleEntryTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  scheduleEntrySubtitle: {
    color: '#B3B3B3',
    fontSize: 13,
    lineHeight: 18,
  },
  scheduleEntryArrow: {
    color: '#FFC38D',
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 4,
    alignSelf: 'center',
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  calendarMonthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarMonthSwitchButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  calendarMonthSwitchButtonDisabled: {
    opacity: 0.28,
  },
  calendarMonthSwitchText: {
    color: '#CFCFCF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  calendarMonthSwitchTextDisabled: {
    color: '#6F6F6F',
  },
  calendarMonthTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
  },
  calendarMonthMeta: {
    color: '#9B6A42',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  calendarWeekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 1,
  },
  calendarWeekdayText: {
    width: '14.285%',
    color: '#6F6F6F',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDayCell: {
    width: '13.4%',
    height: 46,
    borderRadius: 13,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginBottom: 8,
  },
  calendarDayCellPlaceholder: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  calendarDayCellActive: {
    backgroundColor: 'rgba(255,106,0,0.08)',
    borderColor: 'rgba(255,106,0,0.24)',
  },
  calendarDayCellSelected: {
    backgroundColor: 'rgba(255,106,0,0.16)',
    borderColor: 'rgba(255,106,0,0.38)',
    shadowColor: '#FF6A00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 4,
  },
  calendarDayText: {
    color: '#8F8F8F',
    fontSize: 13,
    fontWeight: '800',
  },
  calendarDayTextPlaceholder: {
    color: 'transparent',
  },
  calendarDayTextActive: {
    color: '#FFD2A7',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
  },
  calendarDayDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#FF6A00',
  },
  calendarDayDotDuty: {
    backgroundColor: '#FFD166',
    shadowColor: '#FFD166',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 3,
  },
  scheduleDayList: {
    marginTop: 10,
    gap: 10,
  },
  scheduleDayEmptyText: {
    color: '#8F8F8F',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 14,
    paddingHorizontal: 2,
  },
  scheduleDayCard: {
    borderRadius: 18,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  scheduleDayCardTop: {
    gap: 1,
  },
  scheduleDayCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  scheduleDayCardTextBlock: {
    gap: 1,
  },
  scheduleDayCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  scheduleDayCardSubtitle: {
    color: '#8F8F8F',
    fontSize: 13,
    lineHeight: 18,
  },
  scheduleDayDutyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduleDayDutyRowWithTitle: {
    marginTop: 0,
  },
  scheduleDayDutyDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#FF6A00',
  },
  scheduleDayDutyInlineText: {
    color: '#FFB27A',
    fontSize: 16,
    fontWeight: '700',
  },
  scheduleDayCardTimePill: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,106,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.24)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scheduleDayCardTimeText: {
    color: '#FFB27A',
    fontSize: 12,
    fontWeight: '800',
  },
  scheduleDayCardAddress: {
    color: '#6F6F6F',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  unopenedShopList: {
    marginTop: 10,
    gap: 10,
  },
  unopenedShopCard: {
    borderRadius: 18,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  unopenedShopTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  unopenedShopTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  unopenedShopSubtitle: {
    color: '#FF6A00',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  detailSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  detailSummaryItem: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  detailSummaryAccentBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    marginLeft: 16,
    paddingTop: 14,
  },
  detailSummaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
  },
  detailSummaryAccentBar: {
    width: 32,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#FF6A00',
  },
  detailSummaryAccentText: {
    color: '#8F8F8F',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailSummaryValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  detailSummaryLabel: {
    color: '#8F8F8F',
    fontSize: 12,
  },
  regionDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    marginTop: -2,
  },
  regionDetailTextBlock: {
    flex: 1,
    gap: 4,
  },
  regionDetailTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  regionDetailSubtitle: {
    color: '#8F8F8F',
    fontSize: 14,
    lineHeight: 20,
  },
  storeCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 18,
    padding: 14,
  },
  storeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  storeCardTextBlock: {
    flex: 1,
  },
  storeCardTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  storeCardSubtitle: {
    color: '#FF6A00',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  peopleList: {
    gap: 10,
  },
  personRow: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  personRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  personName: {
    color: '#8F8F8F',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  personMeta: {
    color: '#8F8F8F',
    fontSize: 13,
    marginTop: 2,
  },
  callButton: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,106,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.28)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  callButtonText: {
    color: '#FFB27A',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: '#8F8F8F',
    fontSize: 14,
    lineHeight: 21,
  },
  errorCard: {
    backgroundColor: 'rgba(255,106,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.24)',
    borderRadius: 16,
    padding: 14,
  },
  errorText: {
    color: '#FFB27A',
    fontSize: 13,
    lineHeight: 19,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarButton: {
    width: Platform.OS === 'android' ? 48 : 38,
    height: Platform.OS === 'android' ? 48 : 38,
    borderRadius: Platform.OS === 'android' ? 24 : 19,
    position: Platform.OS === 'ios' ? 'absolute' : 'relative',
    top: Platform.OS === 'ios' ? 14 : 0,
    right: Platform.OS === 'ios' ? 4 : undefined,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarButtonFloating: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 0 : 14,
    right: 4,
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 18 : 16,
    fontWeight: '800',
  },
  headerAvatarBadge: {
    position: 'absolute',
    top: -9,
    right: -5,
    minWidth: 22,
    width: 22,
    height: 22,
    paddingHorizontal: 0,
    borderRadius: 11,
    backgroundColor: '#FF6A00',
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 22,
    includeFontPadding: false,
    transform: [{ translateY: Platform.OS === 'android' ? -0.5 : -1 }],
  },
})
