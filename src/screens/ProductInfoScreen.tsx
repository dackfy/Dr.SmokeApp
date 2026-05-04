import React from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  processColor,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AnimatedEntranceView from '../components/AnimatedEntranceView'
import ElasticScrollView from '../components/ElasticScrollView'
import type { AuthSession } from '../features/auth/types'
import {
  fetchProductByBarcode,
  fetchProductByGuid,
  searchProductsByName,
  type ProductInfo,
  type ProductSearchCandidate,
} from '../features/productInfo/productInfoApi'
import { useAndroidThemeMode } from '../theme/androidAppTheme'
import {
  type AndroidThemePalette,
  getAndroidCompanyPalette,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors'
import {
  androidLightImpact,
  androidMediumImpact,
  androidRustleHaptic,
  androidSuccessHaptic,
} from '../utils/androidHaptics'

type ProductInfoScreenProps = {
  session: AuthSession
  isRefreshing?: boolean
  onRefresh?: () => Promise<void>
}

const RESULTS_BATCH_SIZE = 20
const SEARCH_SUGGESTIONS_LIMIT = 3

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

function getPalette(
  isAndroid: boolean,
  mode: 'company' | 'material',
  isDark: boolean,
  contrastMode: 'balanced' | 'high',
) {
  if (!isAndroid) {
    return iosPalette
  }

  return mode === 'company'
    ? getAndroidCompanyPalette()
    : getAndroidThemePalette(isDark, contrastMode)
}

function formatPrice(value: string | null) {
  if (!value) {
    return 'Цена не указана'
  }

  const normalized = String(value).replace(',', '.').trim()
  const amount = Number(normalized)
  if (!Number.isFinite(amount)) {
    return `${value} ₽`
  }

  return `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)} ₽`
}

function hasUsablePrice(value: string | null) {
  if (!value) {
    return false
  }

  const normalized = String(value).replace(',', '.').trim()
  const amount = Number(normalized)
  return Number.isFinite(amount) && amount > 0
}

function hasMeaningfulProductData(product: ProductInfo | null) {
  if (!product) {
    return false
  }

  return hasUsablePrice(product.price) || product.parameters.length > 0 || product.remains.length > 0
}

function buildSearchSuggestions(rawQuery: string) {
  const cleaned = rawQuery
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) {
    return []
  }

  const words = cleaned
    .split(' ')
    .map(word => word.trim())
    .filter(word => word.length > 1)

  if (!words.length) {
    return []
  }

  const suggestions = new Set<string>()
  suggestions.add(words.slice(0, 2).join(' ').trim())
  suggestions.add(words.slice(0, 3).join(' ').trim())
  suggestions.add(words[0])

  return Array.from(suggestions)
    .map(item => item.trim())
    .filter(item => item.length > 1 && item !== cleaned)
    .slice(0, SEARCH_SUGGESTIONS_LIMIT)
}

export default function ProductInfoScreen({
  session,
  isRefreshing = false,
  onRefresh,
}: ProductInfoScreenProps) {
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const isAndroid = Platform.OS === 'android'
  const resultsScrollRef = React.useRef<ScrollView>(null)
  const shouldRestoreResultsScrollRef = React.useRef(false)
  const palette = React.useMemo(
    () => getPalette(isAndroid, androidTheme.mode, colorScheme === 'dark', androidTheme.contrastMode),
    [androidTheme.contrastMode, androidTheme.mode, colorScheme, isAndroid],
  )
  const isMaterialDark = isAndroid && androidTheme.mode === 'material' && colorScheme === 'dark'
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
  const heroAccentTextColor =
    isAndroid && androidTheme.mode === 'company'
      ? palette.primaryStrong
      : isMaterialDark
        ? palette.onSurface
        : palette.primary
  const cardBorderColor =
    isAndroid && androidTheme.mode === 'company'
      ? palette.primaryContainerStrong
      : isMaterialDark
        ? palette.outline
        : palette.outlineVariant
  const innerBorderColor =
    isAndroid && androidTheme.mode === 'company'
      ? palette.primaryContainerStrong
      : isMaterialDark
        ? palette.outlineVariant
        : palette.outline
  const resultBorderColor =
    isAndroid && androidTheme.mode === 'company'
      ? palette.primaryContainerStrong
      : isMaterialDark
        ? palette.outline
        : palette.outlineVariant
  const [query, setQuery] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [results, setResults] = React.useState<ProductSearchCandidate[]>([])
  const [lastResults, setLastResults] = React.useState<ProductSearchCandidate[]>([])
  const [lastResultsScrollY, setLastResultsScrollY] = React.useState(0)
  const [visibleResultsCount, setVisibleResultsCount] = React.useState(RESULTS_BATCH_SIZE)
  const [product, setProduct] = React.useState<ProductInfo | null>(null)
  const [emptySuggestions, setEmptySuggestions] = React.useState<string[]>([])

  const regionLabel = session.user.regionName?.trim() || session.user.city?.trim() || 'Регион не указан'

  const performSearch = React.useCallback(
    async (rawValue: string) => {
      const value = rawValue.trim()
      if (!value) {
        setError('Введите штрихкод или название товара')
        setResults([])
        setLastResults([])
        setProduct(null)
        setEmptySuggestions([])
        return
      }

      setIsLoading(true)
      setError(null)
      setResults([])
      setLastResults([])
      setVisibleResultsCount(RESULTS_BATCH_SIZE)
      setProduct(null)
      setEmptySuggestions([])
      androidMediumImpact()

      try {
        if (/^\d+$/.test(value)) {
          const nextProduct = await fetchProductByBarcode(
            value,
            session.user.regionName,
            session.user.city,
          )

          if (!nextProduct) {
            setEmptySuggestions(['Проверьте штрихкод и попробуйте ещё раз'])
            return
          }

          setLastResults([])
          setProduct(nextProduct)
          androidSuccessHaptic()
          return
        }

        const nextResults = await searchProductsByName(value)
        if (!nextResults.length) {
          const suggestions = buildSearchSuggestions(value)
          setEmptySuggestions(
            suggestions.length ? suggestions : ['Попробуйте короче или по ключевому слову'],
          )
          return
        }

        if (nextResults.length === 1) {
          try {
            const nextProduct = await fetchProductByGuid(
              nextResults[0].id,
              session.user.regionName,
              session.user.city,
            )

            if (hasMeaningfulProductData(nextProduct) || nextProduct) {
              setLastResults([])
              setProduct(nextProduct)
              androidSuccessHaptic()
              return
            }
          } catch {
            // Fall back to the found results list if the exact-match card
            // cannot be loaded from 1C.
          }
        }

        setLastResults(nextResults)
        setResults(nextResults)
        setVisibleResultsCount(Math.min(RESULTS_BATCH_SIZE, nextResults.length))
        androidRustleHaptic()
      } catch {
        setError('Не удалось получить данные о товаре. Попробуйте позже.')
      } finally {
        setIsLoading(false)
      }
    },
    [session.user.city, session.user.regionName],
  )

  const handleSearch = React.useCallback(async () => {
    await performSearch(query)
  }, [performSearch, query])

  const handleResetSearch = React.useCallback(() => {
    androidLightImpact()
    shouldRestoreResultsScrollRef.current = false
    setQuery('')
    setError(null)
    setResults([])
    setLastResults([])
    setLastResultsScrollY(0)
    setVisibleResultsCount(RESULTS_BATCH_SIZE)
    setProduct(null)
    setEmptySuggestions([])
  }, [])

  const handleSelectCandidate = React.useCallback(
    async (candidate: ProductSearchCandidate) => {
      setIsLoading(true)
      setError(null)
      setEmptySuggestions([])
      androidLightImpact()

      try {
        const nextProduct = await fetchProductByGuid(
          candidate.id,
          session.user.regionName,
          session.user.city,
        )

        if (!nextProduct) {
          setError('Не удалось загрузить выбранный товар.')
          return
        }

        setProduct(nextProduct)
        setResults([])
        androidSuccessHaptic()
      } catch {
        setError('Не удалось загрузить выбранный товар.')
      } finally {
        setIsLoading(false)
      }
    },
    [session.user.city, session.user.regionName],
  )

  const handleBackToResults = React.useCallback(() => {
    if (!lastResults.length) {
      return
    }

    androidLightImpact()
    shouldRestoreResultsScrollRef.current = true
    setError(null)
    setEmptySuggestions([])
    setProduct(null)
    setResults(lastResults)
    setVisibleResultsCount(current =>
      Math.min(Math.max(current, RESULTS_BATCH_SIZE), lastResults.length),
    )
  }, [lastResults])

  React.useEffect(() => {
    if (!results.length || product || !shouldRestoreResultsScrollRef.current) {
      return
    }

    const restore = () => {
      resultsScrollRef.current?.scrollTo({
        y: lastResultsScrollY,
        animated: false,
      })
      shouldRestoreResultsScrollRef.current = false
    }

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(restore)
    })

    return () => cancelAnimationFrame(frame)
  }, [lastResultsScrollY, product, results.length])

  const handleRefresh = React.useCallback(async () => {
    androidRustleHaptic()
    if (product?.id) {
      const refreshed = await fetchProductByGuid(product.id, session.user.regionName, session.user.city)
      if (refreshed) {
        setProduct(refreshed)
      }
    } else {
      await onRefresh?.()
    }
  }, [onRefresh, product?.id, session.user.city, session.user.regionName])

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <ElasticScrollView
        enableTopElastic={false}
        enableBottomElastic
        refreshControl={
          <RefreshControl
            refreshing={Boolean(isRefreshing || isLoading)}
            onRefresh={() => {
              handleRefresh().catch(() => {})
            }}
            tintColor={refreshAccentColorValue}
            colors={[refreshAccentColorValue]}
            progressBackgroundColor={refreshSurfaceColorValue}
          />
        }
        contentContainerStyle={styles.content}>
        <AnimatedEntranceView
          delay={24}
          style={[
            styles.heroCard,
            {
              backgroundColor: palette.surfaceRaised,
              borderColor: cardBorderColor,
            },
          ]}>
          <View style={[styles.heroAccent, { backgroundColor: palette.primary }]} />
          <Text style={[styles.kicker, { color: heroAccentTextColor }]}>Информация о товаре</Text>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: palette.onSurface }]}>Проверка по 1С</Text>
            <View
              style={[
                styles.betaPill,
                {
                  backgroundColor: palette.surface,
                  borderColor: innerBorderColor,
                },
              ]}>
              <Text style={[styles.betaPillText, { color: heroAccentTextColor }]}>beta</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: palette.onSurfaceMuted }]}>
            Введи штрихкод или название товара, чтобы получить цену, характеристики и остатки по магазинам.
          </Text>
          <View
            style={[
              styles.regionCard,
              {
                backgroundColor: palette.surface,
                borderColor: innerBorderColor,
              },
            ]}>
            <Text style={[styles.regionLabel, { color: heroAccentTextColor }]}>Регион поиска</Text>
            <Text style={[styles.regionValue, { color: palette.onSurface }]}>{regionLabel}</Text>
          </View>
        </AnimatedEntranceView>

        <AnimatedEntranceView
          delay={72}
          style={[
            styles.panel,
            {
              backgroundColor: palette.surfaceRaised,
              borderColor: cardBorderColor,
            },
          ]}>
          <Text style={[styles.panelTitle, { color: palette.onSurface }]}>Поиск товара</Text>
          <TextInput
            value={query}
            onChangeText={text => {
              setQuery(text)
              setError(null)
              setEmptySuggestions([])
            }}
            placeholder="Штрихкод или название товара"
            placeholderTextColor={palette.onSurfaceMuted}
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: innerBorderColor,
                color: palette.onSurface,
              },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: palette.primary,
                borderColor: palette.primaryStrong,
              },
            ]}
            onPress={() => {
              handleSearch().catch(() => {})
            }}
            disabled={isLoading}>
            <Text style={[styles.buttonText, { color: palette.onPrimary }]}>
              {isLoading ? 'Ищем товар…' : 'Найти товар'}
            </Text>
          </TouchableOpacity>
          {query || error || results.length || product ? (
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: palette.surface,
                  borderColor: innerBorderColor,
                },
              ]}
              onPress={handleResetSearch}
              disabled={isLoading}>
              <Text style={[styles.secondaryButtonText, { color: palette.onSurfaceMuted }]}>
                Сбросить поиск
              </Text>
            </TouchableOpacity>
          ) : null}
        </AnimatedEntranceView>

        {error ? (
          <AnimatedEntranceView
            delay={96}
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

        {!error && !results.length && !product && emptySuggestions.length ? (
          <AnimatedEntranceView
            delay={108}
            style={[
              styles.feedbackCard,
              {
                backgroundColor: palette.surfaceRaised,
                borderColor: cardBorderColor,
              },
            ]}>
            <Text style={[styles.feedbackTitle, { color: palette.primaryStrong }]}>
              Ничего не найдено
            </Text>
            <Text style={[styles.feedbackText, { color: palette.onSurfaceMuted }]}>
              Попробуйте более короткий или уточнённый вариант запроса.
            </Text>
            <View style={styles.suggestionList}>
              {emptySuggestions.map(item => {
                const isHint = item === 'Проверьте штрихкод и попробуйте ещё раз'
                return (
                  <TouchableOpacity
                    key={item}
                    disabled={isHint || isLoading}
                    style={[
                      styles.suggestionChip,
                      {
                        backgroundColor: palette.surface,
                        borderColor: innerBorderColor,
                        opacity: isHint ? 0.85 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (isHint) {
                        return
                      }
                      setQuery(item)
                      performSearch(item).catch(() => {})
                    }}>
                    <Text style={[styles.suggestionChipText, { color: palette.onSurface }]}>
                      {isHint ? item : `Искать: ${item}`}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </AnimatedEntranceView>
        ) : null}

        {results.length ? (
          <AnimatedEntranceView
            delay={112}
            style={[
              styles.panel,
              {
                backgroundColor: palette.surfaceRaised,
                borderColor: cardBorderColor,
              },
            ]}>
            <View style={styles.resultHeader}>
              <Text style={[styles.panelTitle, { color: palette.onSurface }]}>Найденные товары</Text>
              <Text style={[styles.resultCount, { color: palette.onSurfaceMuted }]}>
                {results.length} совпадений
              </Text>
            </View>
            <ScrollView
              ref={resultsScrollRef}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={styles.resultScroll}
              contentContainerStyle={styles.resultList}
              scrollEventThrottle={16}
              onScroll={event => {
                setLastResultsScrollY(event.nativeEvent.contentOffset.y)
              }}>
              {results.slice(0, visibleResultsCount).map(item => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.resultCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor: resultBorderColor,
                    },
                  ]}
                  onPress={() => {
                    handleSelectCandidate(item).catch(() => {})
                  }}>
                  <Text style={[styles.resultName, { color: palette.onSurface }]}>{item.name}</Text>
                </Pressable>
              ))}
              {visibleResultsCount < results.length ? (
                <TouchableOpacity
                  style={[
                    styles.moreButton,
                    {
                      backgroundColor: palette.surface,
                      borderColor: resultBorderColor,
                    },
                  ]}
                  onPress={() => {
                    androidRustleHaptic()
                    setVisibleResultsCount(current =>
                      Math.min(current + RESULTS_BATCH_SIZE, results.length),
                    )
                  }}>
                  <Text style={[styles.moreButtonText, { color: palette.primaryStrong }]}>
                    Показать ещё
                  </Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </AnimatedEntranceView>
        ) : null}

        {product ? (
          <AnimatedEntranceView
            delay={136}
            style={[
              styles.panel,
              {
                backgroundColor: palette.surfaceRaised,
                borderColor: cardBorderColor,
              },
            ]}>
            <View style={styles.productHeader}>
              <Text style={[styles.kicker, { color: palette.primaryStrong }]}>Карточка товара</Text>
              {lastResults.length ? (
                <TouchableOpacity
                  style={[
                    styles.backToResultsButton,
                    {
                    backgroundColor: palette.surface,
                    borderColor: innerBorderColor,
                  },
                ]}
                  onPress={handleBackToResults}>
                  <Text style={[styles.backToResultsText, { color: palette.primaryStrong }]}>
                    К списку
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <View
              style={[
                styles.productSummaryCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: innerBorderColor,
                },
              ]}>
              <Text style={[styles.productTitle, { color: palette.onSurface }]}>{product.name}</Text>
              <View
                style={[
                  styles.productPriceChip,
                  {
                    backgroundColor:
                      hasUsablePrice(product.price) ? palette.primaryContainerStrong : palette.surfaceRaised,
                    borderColor:
                      hasUsablePrice(product.price) ? palette.primaryContainerStrong : innerBorderColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.productPrice,
                    {
                      color: hasUsablePrice(product.price) ? palette.primaryStrong : palette.onSurface,
                    },
                  ]}>
                  {formatPrice(product.price)}
                </Text>
              </View>
            </View>

            {!hasUsablePrice(product.price) &&
            !product.parameters.length &&
            !product.remains.length ? (
              <View
                style={[
                  styles.noteCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: innerBorderColor,
                  },
                ]}>
                <Text style={[styles.noteTitle, { color: palette.primaryStrong }]}>
                  Данные ограничены
                </Text>
                <Text style={[styles.noteText, { color: palette.onSurfaceMuted }]}>
                  По этому товару 1С вернула только название.
                </Text>
              </View>
            ) : null}

            {product.parameters.length ? (
              <View
                style={[
                  styles.infoSectionCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: innerBorderColor,
                  },
                ]}>
                <Text style={[styles.infoTitle, { color: palette.primaryStrong }]}>Характеристики</Text>
                {product.parameters.map(item => (
                  <View
                    key={`${item.name}:${item.value}`}
                    style={[
                      styles.infoRow,
                      {
                        backgroundColor: palette.surfaceRaised,
                        borderColor: innerBorderColor,
                      },
                    ]}>
                    <Text style={[styles.infoName, { color: palette.onSurfaceMuted }]}>{item.name}</Text>
                    <Text style={[styles.infoValue, { color: palette.onSurface }]}>{item.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {product.remains.length ? (
              <View
                style={[
                  styles.infoSectionCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: innerBorderColor,
                  },
                ]}>
                <Text style={[styles.infoTitle, { color: palette.primaryStrong }]}>Остатки на магазинах</Text>
                {product.remains.map(item => (
                  <View
                    key={`${item.shop}:${item.quantity}`}
                    style={[
                      styles.infoRow,
                      {
                        backgroundColor: palette.surfaceRaised,
                        borderColor: innerBorderColor,
                      },
                    ]}>
                    <Text style={[styles.infoName, { color: palette.onSurfaceMuted }]}>{item.shop}</Text>
                    <Text style={[styles.infoValue, { color: palette.onSurface }]}>{item.quantity}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </AnimatedEntranceView>
        ) : null}

        {isLoading ? <ActivityIndicator color={palette.primaryStrong} style={styles.loader} /> : null}
      </ElasticScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 160,
    gap: 16,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 20,
    gap: 12,
  },
  heroAccent: {
    width: 72,
    height: 6,
    borderRadius: 999,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  betaPill: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  betaPillText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  regionCard: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 7,
  },
  regionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  regionValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  panel: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  panelTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: '700',
  },
  button: {
    minHeight: 56,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  feedbackCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  feedbackText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  suggestionList: {
    marginTop: 10,
    gap: 8,
  },
  suggestionChip: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionChipText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  resultList: {
    gap: 10,
  },
  resultHeader: {
    gap: 4,
  },
  resultCount: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  resultScroll: {
    maxHeight: 320,
  },
  moreButton: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  moreButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  resultName: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  productTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  productSummaryCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  productPriceChip: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  backToResultsButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  backToResultsText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  productPrice: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  infoSectionCard: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  infoRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  infoName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  loader: {
    marginTop: 8,
  },
})
