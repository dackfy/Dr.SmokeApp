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
import { SafeAreaView } from 'react-native-safe-area-context'
import type { AuthSession } from '../features/auth/types'
import { buildApiUrl } from '../config/api'
import { checkEmployeeAccess } from '../features/auth/authApi'

type HrHomeScreenProps = {
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

function formatTodayLabel(timezone?: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: timezone || undefined,
  }).format(new Date())
}

function formatTimeRange(openingTime?: string | null, closingTime?: string | null) {
  const start = String(openingTime || '').slice(0, 5)
  const end = String(closingTime || '').slice(0, 5)
  if (!start && !end) return 'Время уточняется'
  if (start && end) return `${start} - ${end}`
  return start || end
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

export default function HrHomeScreen({
  session,
  onLogout,
  onRefreshSession,
  onGoProfile,
}: HrHomeScreenProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(true)
  const [regionCards, setRegionCards] = React.useState<RegionCard[]>([])
  const [regionShiftsMap, setRegionShiftsMap] = React.useState<Record<string, TodayOpenShiftItem[]>>({})
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [isRegionsOpen, setIsRegionsOpen] = React.useState(false)
  const [selectedRegionId, setSelectedRegionId] = React.useState<string | null>(null)

  const profileLetter = (session.user.email?.trim()?.charAt(0) || 'П').toUpperCase()
  const todayLabel = `Сегодня, ${formatTodayLabel(session.user.timezone)}`

  const handleBackNavigation = React.useCallback(() => {
    if (selectedRegionId) {
      setSelectedRegionId(null)
      return
    }

    if (isRegionsOpen) {
      setIsRegionsOpen(false)
    }
  }, [isRegionsOpen, selectedRegionId])

  const loadFallbackRegionData = React.useCallback(async () => {
    const todayRes = await fetch(
      buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/open-shifts-today`),
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
      buildApiUrl(`/employees/${encodeURIComponent(session.user.id)}/hr/regions`),
    )

    if (regionsRes.status === 404 || regionsRes.status === 501) {
      await loadFallbackRegionData()
      return
    }

    if (!regionsRes.ok) {
      throw new Error(`HR regions HTTP ${regionsRes.status}`)
    }

    const regionsData = (await regionsRes.json()) as HrRegionSummaryResponse
    const nextRegionCards = Array.isArray(regionsData.regions)
      ? regionsData.regions.map(region => ({
          id: String(region.region_id ?? region.region_name ?? `region-${Math.random()}`),
          regionId: Number.isFinite(Number(region.region_id)) ? Number(region.region_id) : null,
          regionName: String(region.region_name || 'Регион'),
          employeeCount: Number(region.employee_count ?? 0),
          shopCount: Number(region.shop_count ?? 0),
        }))
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
  }, [loadFallbackRegionData, session.user.id])

  const loadRegionDetails = React.useCallback(async (region: RegionCard) => {
    if (!region.id) return

    const res = await fetch(
      buildApiUrl(
        `/employees/${encodeURIComponent(session.user.id)}/hr/regions/${encodeURIComponent(
          String(region.regionId ?? region.id),
        )}/open-shifts`,
      ),
    )

    if (res.status === 404 || res.status === 501) {
      if (region.regionId === session.user.regionId || region.regionName === session.user.regionName) {
        await loadFallbackRegionData()
      }
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
  }, [loadFallbackRegionData, session.user.id, session.user.regionId, session.user.regionName])

  const loadData = React.useCallback(async () => {
    await loadRegions()
    setSelectedRegionId(current => {
      if (!current) return current
      return current
    })
  }, [loadRegions])

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

  const onRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      await checkEmployeeAccess(session.user.id)
      await Promise.all([onRefreshSession?.(), loadData()])
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
  }, [loadData, onLogout, onRefreshSession, session.user.id])

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
          if (!selectedRegionId && !isRegionsOpen) {
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
    [handleBackNavigation, isRegionsOpen, selectedRegionId],
  )

  const selectedRegion =
    regionCards.find(region => region.id === selectedRegionId) ?? null
  const selectedRegionShifts = selectedRegion ? (regionShiftsMap[selectedRegion.id] ?? []) : []
  const selectedRegionStores = React.useMemo(
    () => buildStoreCards(selectedRegionShifts),
    [selectedRegionShifts],
  )
  const totalRegions = regionCards.length
  const totalEmployees = regionCards.reduce((sum, region) => sum + region.employeeCount, 0)
  const totalOpenShops = regionCards.reduce((sum, region) => sum + region.shopCount, 0)

  const contentPaddingTop = Platform.OS === 'ios' ? 20 : 16

  const overviewContent = (
    <ScrollView
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
      <View style={styles.inlineHeader}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerEyebrow}>Управление регионами</Text>
          <Text style={styles.fixedHeaderTitle}>HR Dashboard</Text>
          <View style={styles.headerMetaRow}>
            <View style={styles.headerMetaAccent} />
            <Text style={styles.headerCaptionText}>{todayLabel}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.headerAvatarButton}
          onPress={onGoProfile}
          accessibilityRole="button"
          accessibilityLabel="Открыть профиль">
          <Text style={styles.headerAvatarText}>{profileLetter}</Text>
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
            style={[styles.summaryStat, styles.summaryStatInteractive]}
            onPress={() => setIsRegionsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Открыть список регионов">
            <View style={styles.summaryStatTopRow}>
              <Text style={styles.summaryStatValue}>{totalRegions}</Text>
              <Text style={styles.summaryStatArrow}>›</Text>
            </View>
            <Text style={[styles.summaryStatLabel, styles.summaryStatLabelInteractive]}>Регионов</Text>
            <Text style={styles.summaryStatHint}>Перейти к списку</Text>
          </TouchableOpacity>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryStatValue}>{totalOpenShops}</Text>
            <Text style={styles.summaryStatLabel}>Магазинов</Text>
          </View>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryActionRow}>
          <View style={styles.summaryActionTextBlock}>
            <Text style={styles.summaryActionTitle}>Неоткрытые магазины</Text>
            <Text style={styles.summaryActionSubtitle}>
              Раздел уже подготовлен. Пока внутри заглушка, позже сюда подключим реальные данные по магазинам.
            </Text>
          </View>
          <View style={[styles.summaryActionButton, styles.summaryActionButtonDisabled]}>
            <Text style={[styles.summaryActionButtonText, styles.summaryActionButtonTextDisabled]}>
              Скоро
            </Text>
          </View>
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
        <View style={styles.inlineHeader}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerEyebrow}>Управление регионами</Text>
            <Text style={styles.fixedHeaderTitle}>HR Dashboard</Text>
            <View style={styles.headerMetaRow}>
              <View style={styles.headerMetaAccent} />
              <Text style={styles.headerCaptionText}>{todayLabel}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerAvatarButton}
            onPress={onGoProfile}
            accessibilityRole="button"
            accessibilityLabel="Открыть профиль">
            <Text style={styles.headerAvatarText}>{profileLetter}</Text>
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
            <Text style={styles.sectionMeta}>{totalRegions}</Text>
          </View>
          {regionCards.map(region => (
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
                    {region.employeeCount > 0
                      ? `${region.employeeCount} ${pluralizeRu(region.employeeCount, 'сотрудник', 'сотрудника', 'сотрудников')} на смене`
                      : 'Смен пока нет'}
                  </Text>
                </View>
                <Text style={styles.regionArrowInline}>›</Text>
              </View>
              <View style={styles.regionStatsRow}>
                <View style={styles.regionMiniPill}>
                  <Text style={styles.regionMiniValue}>{region.employeeCount}</Text>
                  <Text style={styles.regionMiniLabel}>
                    {pluralizeRu(region.employeeCount, 'сотрудник', 'сотрудника', 'сотрудников')}
                  </Text>
                </View>
                <View style={styles.regionMiniPill}>
                  <Text style={styles.regionMiniValue}>{region.shopCount}</Text>
                  <Text style={styles.regionMiniLabel}>
                    {pluralizeRu(region.shopCount, 'магазин', 'магазина', 'магазинов')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {loadError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )

  const detailContent = selectedRegion ? (
    <View style={styles.gestureScreen} {...backSwipeResponder.panHandlers}>
      <ScrollView
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
        <View style={styles.inlineHeader}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerEyebrow}>Управление регионами</Text>
            <Text style={styles.fixedHeaderTitle}>HR Dashboard</Text>
            <View style={styles.headerMetaRow}>
              <View style={styles.headerMetaAccent} />
              <Text style={styles.headerCaptionText}>{todayLabel}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerAvatarButton}
            onPress={onGoProfile}
            accessibilityRole="button"
            accessibilityLabel="Открыть профиль">
            <Text style={styles.headerAvatarText}>{profileLetter}</Text>
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
                ? `Сейчас работают ${selectedRegion.employeeCount} ${pluralizeRu(selectedRegion.employeeCount, 'сотрудник', 'сотрудника', 'сотрудников')}`
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
          <View style={styles.detailSummaryDivider} />
          <View style={styles.detailSummaryItem}>
            <Text style={styles.detailSummaryValue}>{selectedRegion.shopCount}</Text>
            <Text style={styles.detailSummaryLabel}>
              {pluralizeRu(selectedRegion.shopCount, 'магазин', 'магазина', 'магазинов')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Магазины региона</Text>
            <Text style={styles.sectionMeta}>{selectedRegionStores.length}</Text>
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
      ) : selectedRegion ? (
        detailContent
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
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: Platform.OS === 'ios' ? 58 : 0,
    gap: 6,
  },
  headerEyebrow: {
    color: '#8F8F8F',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  fixedHeaderTitle: {
    color: '#FF6A00',
    fontSize: Platform.OS === 'android' ? 29 : 34,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: Platform.OS === 'android' ? 0.4 : -0.4,
    lineHeight: Platform.OS === 'android' ? 31 : 36,
    flexShrink: 1,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255,106,0,0.18)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerMetaAccent: {
    width: 24,
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
  summaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  summaryActionButtonTextDisabled: {
    color: '#8F8F8F',
  },
  summaryStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
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
  sectionMeta: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFFFFF',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 28,
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
    fontSize: 12,
    lineHeight: 17,
  },
  regionArrowInline: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 1,
  },
  regionStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  regionMiniPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  regionMiniValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  regionMiniLabel: {
    color: '#8F8F8F',
    fontSize: 12,
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
    gap: 2,
  },
  detailSummaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
  },
  detailSummaryValue: {
    color: '#FFFFFF',
    fontSize: 22,
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
    gap: 12,
  },
  storeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  storeCardTextBlock: {
    flex: 1,
    gap: 4,
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
    color: '#FFFFFF',
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
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 18 : 16,
    fontWeight: '800',
  },
})
