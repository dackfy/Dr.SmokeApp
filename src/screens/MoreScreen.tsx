import React from 'react'
import {
  BackHandler,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native'
import { usePortalAccess } from '../features/portal/usePortalAccess'
import { useAndroidThemeMode } from '../theme/androidAppTheme'
import {
  type AndroidThemePalette,
  getAndroidCompanyPalette,
  getAndroidStatusBarStyle,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors'
import { styles } from './MoreScreen.styles'

type MoreScreenRoute = 'root' | 'appearance' | 'portal'

type MoreScreenProps = {
  employeeId: string
}

const PORTAL_URL = 'https://portal.dr-smoke.ru/'

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

export default function MoreScreen({
  employeeId,
}: MoreScreenProps) {
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const isAndroid = Platform.OS === 'android'
  const [route, setRoute] = React.useState<MoreScreenRoute>('root')

  const palette = React.useMemo(() => {
    if (!isAndroid) {
      return iosPalette
    }

    return androidTheme.mode === 'company'
      ? getAndroidCompanyPalette()
      : getAndroidThemePalette(colorScheme === 'dark')
  }, [androidTheme.mode, colorScheme, isAndroid])

  const companyPreview = ['#050505', '#FF6A00', '#252525']
  const materialPreview = [
    String(palette.primary),
    String(palette.secondary),
    String(palette.tertiary),
  ]
  const isCompanyMode = isAndroid && androidTheme.mode === 'company'
  const isMaterialMode = isAndroid && androidTheme.mode === 'material'
  const isMaterialDark = isMaterialMode && colorScheme === 'dark'
  const accentTextColor = isCompanyMode
    ? String(palette.primaryStrong)
    : isMaterialDark
      ? String(palette.onSurface)
      : String(palette.primary)
  const subtleSurfaceColor = isCompanyMode
    ? String(palette.surfaceMuted)
    : isMaterialDark
      ? String(palette.surface)
      : String(palette.surfaceRaised)
  const rootCardBackground = String(palette.surfaceRaised)
  const heroCardBackground = isCompanyMode
    ? String(palette.surfaceMuted)
    : subtleSurfaceColor
  const heroKickerColor = accentTextColor
  const secondaryMutedColor =
    isMaterialDark ? String(palette.onSurfaceMuted) : String(palette.onSurfaceMuted)
  const heroBorderColor = isCompanyMode
    ? String(palette.primaryContainerStrong)
    : isMaterialMode && isMaterialDark
      ? String(palette.outline)
      : isMaterialMode
        ? String(palette.primary)
        : String(palette.outlineVariant)
  const portalHeroBackground = isCompanyMode
    ? String(palette.surfaceMuted)
    : subtleSurfaceColor
  const portalPanelBackground = isCompanyMode
    ? String(palette.surfaceRaised)
    : String(palette.surfaceRaised)
  const portalSecondaryPanel = isCompanyMode
    ? String(palette.surface)
    : subtleSurfaceColor
  const ctaBackground =
    isCompanyMode
      ? String(palette.primary)
      : isMaterialDark
        ? String(palette.primaryStrong)
        : String(palette.primary)
  const ctaTextColor =
    getAndroidStatusBarStyle(ctaBackground) === 'dark-content'
      ? '#08120F'
      : '#FFFFFF'
  const ctaBorderColor =
    isCompanyMode
      ? String(palette.primaryStrong)
      : isMaterialDark
        ? String(palette.primaryStrong)
        : String(palette.primary)
  const materialSolidAccent =
    isMaterialDark ? String(palette.primaryStrong) : String(palette.primary)
  const materialSelectedBadgeBackground = isMaterialDark
    ? String(palette.primaryStrong)
    : materialSolidAccent
  const materialSelectedRadioBorder = isMaterialDark ? '#D7E3EC' : materialSolidAccent
  const materialPreviewCardBackground = isMaterialDark
    ? '#141A20'
    : String(palette.surfaceRaised)
  const materialPreviewCardSecondaryBackground = isMaterialDark
    ? '#222C36'
    : String(palette.surfaceAccent)
  const materialPreviewBorder = isMaterialDark
    ? 'rgba(215,227,236,0.14)'
    : String(palette.outlineVariant)
  const materialPreviewPrimaryLine = isMaterialDark
    ? '#F5F7FA'
    : materialPreview[0]
  const materialPreviewSecondaryLine = isMaterialDark
    ? '#AEBBC7'
    : materialPreview[1]
  const materialPreviewTertiaryLine = isMaterialDark
    ? '#CBD5E1'
    : materialPreview[2]
  const {
    session: portalSession,
    isLoading: isPortalLoading,
    isRefreshing: isPortalRefreshing,
    error: portalError,
    refresh: refreshPortal,
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
                  ? String(palette.surfaceMuted)
                  : String(palette.surfaceRaised),
                borderColor: isCompanyMode
                  ? String(palette.primaryContainerStrong)
                  : String(palette.outlineVariant),
              },
            ]}
            onPress={() => setRoute('root')}
            accessibilityRole="button"
            accessibilityLabel="Назад">
            <Text style={[styles.backButtonText, { color: String(palette.onSurface) }]}>‹</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.headerTextWrap}>
          <Text style={[styles.screenTitle, { color: String(palette.onSurface) }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: String(palette.onSurfaceMuted) }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  )

  const renderRoot = () => (
    <>
      <View
        style={[
          styles.sectionCard,
          styles.heroCard,
          {
            backgroundColor: heroCardBackground,
            borderColor: isCompanyMode
              ? String(palette.primaryContainerStrong)
              : String(palette.outlineVariant),
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: isCompanyMode ? 0.18 : 0.08,
            shadowRadius: 24,
            elevation: isCompanyMode ? 8 : 4,
          },
        ]}>
        <Text style={[styles.heroKicker, { color: heroKickerColor }]}>
          Центр настроек
        </Text>
        <Text style={[styles.heroTitle, { color: String(palette.onSurface) }]}>
          Настройки и инструменты
        </Text>
        <Text style={[styles.subtitle, { color: secondaryMutedColor }]}>
          Здесь будут собраны оформление приложения, доступ на портал и внутренние сервисы.
        </Text>
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: rootCardBackground,
            borderColor: String(palette.outlineVariant),
          },
        ]}>
        <View style={styles.rowList}>
          <Pressable
            style={[
              styles.navRow,
              {
                backgroundColor: isCompanyMode
                  ? String(palette.surface)
                  : String(palette.surface),
                borderColor: isCompanyMode
                  ? String(palette.primaryContainerStrong)
                  : String(palette.outlineVariant),
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: isCompanyMode ? 0.12 : 0.04,
                shadowRadius: 18,
                elevation: isCompanyMode ? 4 : 2,
              },
            ]}
            onPress={() => setRoute('appearance')}>
            <View style={styles.navRowTextWrap}>
              <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                Оформление
              </Text>
              <Text style={[styles.navRowTitle, { color: String(palette.onSurface) }]}>
                Стиль приложения
              </Text>
              <Text
                style={[
                  styles.navRowSubtitle,
                  { color: secondaryMutedColor },
                ]}>
                {isAndroid
                  ? 'Переключение между фирменным код-дизайном и Material You.'
                  : 'Настройки оформления и визуальные параметры приложения собраны в этом разделе.'}
              </Text>
            </View>
            <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
          </Pressable>

          <Pressable
            style={[
              styles.navRow,
              {
                backgroundColor: isCompanyMode
                  ? String(palette.surface)
                  : String(palette.surface),
                borderColor: isCompanyMode
                  ? String(palette.primaryContainerStrong)
                  : String(palette.outlineVariant),
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: isCompanyMode ? 0.12 : 0.04,
                shadowRadius: 18,
                elevation: isCompanyMode ? 4 : 2,
              },
            ]}
            onPress={() => setRoute('portal')}>
            <View style={styles.navRowTextWrap}>
              <Text style={[styles.navRowMeta, { color: heroKickerColor }]}>
                Инструменты
              </Text>
              <Text style={[styles.navRowTitle, { color: String(palette.onSurface) }]}>
                Доступ на портал
              </Text>
              <Text
                style={[
                  styles.navRowSubtitle,
                  { color: secondaryMutedColor },
                ]}>
                Быстрый вход в веб-портал сотрудника, ссылка и будущий flow с PIN-кодом.
              </Text>
            </View>
            <Text style={[styles.navChevron, { color: accentTextColor }]}>›</Text>
          </Pressable>
        </View>
      </View>
    </>
  )

  const renderAppearance = () => (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: String(palette.surfaceRaised),
          borderColor: String(palette.outlineVariant),
        },
      ]}>
      {!isAndroid ? (
        <>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: String(palette.primaryContainer) },
            ]}>
            <Text style={[styles.statusPillText, { color: String(palette.primaryStrong) }]}>
              iOS
            </Text>
          </View>
          <Text style={[styles.heroTitle, { color: String(palette.onSurface) }]}>
            Оформление приложения
          </Text>
          <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
            На iPhone приложение опирается на нативный iOS-стиль. Отдельное переключение тем
            используется только на Android.
          </Text>
        </>
      ) : (
        <View style={styles.rowList}>
          <Pressable
            style={[
              styles.optionCard,
              {
                backgroundColor: isCompanyMode
                  ? String(palette.primaryContainerStrong)
                  : String(palette.surface),
                borderColor: isCompanyMode
                  ? String(palette.primary)
                  : String(palette.outlineVariant),
              },
            ]}
            onPress={() => androidTheme.setMode('company')}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badgeLeft,
                  {
                    backgroundColor: isCompanyMode
                      ? String(palette.primary)
                      : String(palette.surfaceMuted),
                  },
                ]}>
                <Text
                  style={[
                    styles.badgeLeftText,
                    {
                      color: isCompanyMode
                        ? String(palette.onPrimary)
                        : String(palette.onSurface),
                    },
                  ]}>
                    Фирменный
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: isCompanyMode
                      ? String(palette.primary)
                      : String(palette.outline),
                    backgroundColor: isCompanyMode
                      ? String(palette.primary)
                      : 'transparent',
                  },
                ]}
              />
            </View>
            <View style={styles.optionHeader}>
              <Text style={[styles.optionTitle, { color: String(palette.onSurface) }]}>
                Код компании
              </Text>
              <Text style={[styles.optionMeta, { color: accentTextColor }]}>
                Темный режим
              </Text>
            </View>
            <Text
              style={[
                styles.optionDescription,
                { color: secondaryMutedColor },
              ]}>
              Плотный темный интерфейс с ярким оранжевым акцентом и собранной фирменной подачей.
            </Text>
            <View style={styles.previewRail}>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: companyPreview[0],
                    borderColor: 'rgba(255,255,255,0.06)',
                  },
                ]}>
                <View
                  style={[
                    styles.previewDot,
                    { backgroundColor: companyPreview[1] },
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
                  { backgroundColor: companyPreview[1] },
                ]}
              />
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: companyPreview[2],
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
                backgroundColor: isMaterialMode
                  ? String(palette.surfaceRaised)
                  : String(palette.surface),
                borderColor: isMaterialMode
                  ? materialSolidAccent
                  : String(palette.outlineVariant),
                shadowColor: isMaterialMode ? materialSolidAccent : '#000000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: isMaterialMode ? 0.12 : 0.04,
                shadowRadius: 20,
                elevation: isMaterialMode ? 5 : 2,
              },
            ]}
            onPress={() => androidTheme.setMode('material')}>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badgeLeft,
                  {
                    backgroundColor: isMaterialMode
                      ? materialSelectedBadgeBackground
                      : String(palette.surfaceMuted),
                  },
                ]}>
                <Text
                  style={[
                    styles.badgeLeftText,
                    {
                      color: isMaterialMode
                        ? '#FFFFFF'
                        : isMaterialDark
                          ? '#D7E3EC'
                          : String(palette.onSurface),
                    },
                  ]}>
                    System aware
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: isMaterialMode
                      ? materialSelectedRadioBorder
                      : String(palette.outline),
                    backgroundColor: isMaterialMode
                      ? '#FFFFFF'
                      : 'transparent',
                  },
                ]}>
                {isMaterialMode ? (
                  <View
                    style={[
                      styles.radioInner,
                      { backgroundColor: materialSolidAccent },
                    ]}
                  />
                ) : null}
              </View>
            </View>
            <View style={styles.optionHeader}>
              <Text style={[styles.optionTitle, { color: String(palette.onSurface) }]}>
                Material You
              </Text>
              <Text style={[styles.optionMeta, { color: accentTextColor }]}>
                Системная тема
              </Text>
            </View>
            <Text
              style={[
                styles.optionDescription,
                { color: secondaryMutedColor },
              ]}>
              Подстраивается под системную светлую или тёмную тему и использует системный
              акцент.
            </Text>
            <View style={styles.previewRail}>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: materialPreviewCardBackground,
                    borderColor: materialPreviewBorder,
                  },
                ]}>
                <View
                  style={[
                    styles.previewDot,
                    { backgroundColor: materialSolidAccent },
                  ]}
                />
                <View
                  style={[
                    styles.previewLine,
                    { backgroundColor: materialPreviewPrimaryLine },
                  ]}
                />
              </View>
              <View
                style={[
                  styles.previewTall,
                  { backgroundColor: materialPreview[0] },
                ]}
              />
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: materialPreviewCardSecondaryBackground,
                    borderColor: materialPreviewBorder,
                  },
                ]}>
                <View
                  style={[
                    styles.previewLine,
                    { backgroundColor: materialPreviewTertiaryLine },
                  ]}
                />
                <View
                  style={[
                    styles.previewLineShort,
                    { backgroundColor: materialPreviewSecondaryLine },
                  ]}
                />
              </View>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  )

  const renderPortal = () => (
    <>
      <View
        style={[
          styles.heroGlowCard,
          {
            backgroundColor: portalHeroBackground,
            borderColor: heroBorderColor,
          },
        ]}>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: String(palette.surfaceRaised) },
          ]}>
          <Text style={[styles.statusPillText, { color: heroKickerColor }]}>
            Portal access
          </Text>
        </View>
        <Text style={[styles.heroTitle, { color: String(palette.onSurface) }]}>
          Доступ на портал
        </Text>
        <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
          Быстрый вход в веб-портал сотрудника с выдачей PIN, подтверждением входа и завершением
          сессии.
        </Text>

        <View style={styles.portalHeroGrid}>
          <View style={styles.portalStatRow}>
            <View
              style={[
                styles.portalStatCard,
                {
                  backgroundColor: String(palette.surfaceRaised),
                  borderColor: String(palette.outlineVariant),
                },
              ]}>
              <Text style={[styles.portalStatLabel, { color: heroKickerColor }]}>
                Статус
              </Text>
              <Text style={[styles.portalStatValue, { color: String(palette.onSurface) }]}>
                {isPortalLoading ? 'Загрузка…' : portalStatusLabel}
              </Text>
            </View>
            <View
              style={[
                styles.portalStatCard,
                {
                  backgroundColor: String(palette.surfaceRaised),
                  borderColor: String(palette.outlineVariant),
                },
              ]}>
              <Text style={[styles.portalStatLabel, { color: heroKickerColor }]}>
                PIN-код
              </Text>
              <Text style={[styles.portalStatValue, { color: String(palette.onSurface) }]}>
                {portalSession.pin || '--------'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.portalLinkCard,
          {
            backgroundColor: portalPanelBackground,
            borderColor: String(palette.outlineVariant),
          },
        ]}>
        <Text style={[styles.portalLinkLabel, { color: heroKickerColor }]}>
          Ссылка на портал
        </Text>
        <Text style={[styles.portalLinkValue, { color: String(palette.onSurface) }]}>
          {portalSession.portalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}
        </Text>
        <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
          Открывается во внешнем браузере без вмешательства в домашний экран приложения.
        </Text>
        <View style={styles.inlineActionRow}>
          <TouchableOpacity
            style={[
              styles.inlineActionButton,
              {
                backgroundColor: String(palette.surfaceAccent),
                borderColor: String(palette.outlineVariant),
              },
            ]}
            onPress={openPortal}>
            <Text style={[styles.inlineActionText, { color: String(palette.onSurface) }]}>
              Открыть в браузере
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.inlineActionButton,
              {
                backgroundColor: String(palette.surface),
                borderColor: String(palette.outlineVariant),
              },
            ]}
            onPress={refreshPortal}>
            <Text style={[styles.inlineActionText, { color: String(palette.onSurface) }]}>
              {isPortalRefreshing ? 'Обновление…' : 'Обновить'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.portalCodeCard,
          {
            backgroundColor: portalSecondaryPanel,
            borderColor: String(palette.outlineVariant),
          },
        ]}>
        <View
          style={[
            styles.portalAccentStrip,
            { backgroundColor: materialSolidAccent },
          ]}
        />
        <Text style={[styles.portalLinkLabel, { color: heroKickerColor }]}>
          Сценарий входа
        </Text>
        <Text style={[styles.portalCodeValue, { color: String(palette.onSurface) }]}>
          {portalSession.status === 'pending_confirm' ? 'Ожидание' : 'Готово'}
        </Text>
        <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
          {portalError
            ? portalError
            : portalSession.status === 'pending_confirm'
              ? 'Введите PIN на портале и затем нажмите подтверждение входа в приложении.'
              : portalSession.status === 'active'
                ? 'Сессия на портале активна. При необходимости её можно завершить вручную.'
                : 'Запроси PIN, открой портал и после ввода кода подтверди вход.'}
        </Text>
        {portalSession.expiresAt ? (
          <Text style={[styles.helperText, { color: secondaryMutedColor }]}>
            Действует до: {portalSession.expiresAt}
          </Text>
        ) : null}
      </View>

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

        {portalSession.status !== 'inactive' ? (
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {
                backgroundColor: String(palette.surfaceAccent),
                borderColor: String(palette.outlineVariant),
              },
            ]}
            onPress={openPortal}>
            <Text style={[styles.secondaryButtonText, { color: String(palette.onSurface) }]}>
              Открыть портал
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              backgroundColor: String(palette.surface),
              borderColor: String(palette.outlineVariant),
            },
          ]}
          onPress={() => setRoute('root')}>
          <Text style={[styles.secondaryButtonText, { color: String(palette.onSurface) }]}>
            Назад в настройки
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
          backgroundColor: String(palette.background),
        },
      ]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {route === 'root' ? renderHeader('Ещё', 'Настройки, доступы и внутренние сервисы') : null}
        {route === 'appearance'
          ? renderHeader('Оформление', 'Управление визуальным стилем приложения')
          : null}
        {route === 'portal'
          ? renderHeader('Портал', 'Быстрый вход в веб-портал сотрудника')
          : null}

        {route === 'root' ? renderRoot() : null}
        {route === 'appearance' ? renderAppearance() : null}
        {route === 'portal' ? renderPortal() : null}
      </ScrollView>
    </View>
  )
}
