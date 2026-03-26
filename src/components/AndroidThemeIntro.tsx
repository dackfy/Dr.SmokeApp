import React from 'react'
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  Vibration,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAndroidThemeMode } from '../theme/androidAppTheme'
import {
  getAndroidCompanyPalette,
  getAndroidStatusBarStyle,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors'

type ThemeMode = 'company' | 'material'

export default function AndroidThemeIntro() {
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const progress = React.useRef(new Animated.Value(0)).current
  const previewPulse = React.useRef(new Animated.Value(1)).current
  const footerPulse = React.useRef(new Animated.Value(1)).current
  const [selectedMode, setSelectedMode] = React.useState<ThemeMode>('material')
  const [isCompleting, setIsCompleting] = React.useState(false)

  React.useEffect(() => {
    if (!androidTheme.shouldShowIntro || Platform.OS !== 'android') {
      return
    }

    setSelectedMode(androidTheme.mode)
    progress.setValue(0)
    Animated.spring(progress, {
      toValue: 1,
      stiffness: 170,
      damping: 22,
      mass: 0.92,
      useNativeDriver: true,
    }).start()
  }, [androidTheme.mode, androidTheme.shouldShowIntro, progress])

  React.useEffect(() => {
    if (!androidTheme.shouldShowIntro || Platform.OS !== 'android') {
      return
    }

    previewPulse.setValue(0.985)
    footerPulse.setValue(0.97)

    Animated.parallel([
      Animated.spring(previewPulse, {
        toValue: 1,
        stiffness: 220,
        damping: 16,
        mass: 0.72,
        useNativeDriver: true,
      }),
      Animated.spring(footerPulse, {
        toValue: 1,
        stiffness: 210,
        damping: 17,
        mass: 0.78,
        useNativeDriver: true,
      }),
    ]).start()
  }, [androidTheme.shouldShowIntro, footerPulse, previewPulse, selectedMode])

  if (Platform.OS !== 'android' || !androidTheme.shouldShowIntro) {
    return null
  }

  const materialPalette = getAndroidThemePalette(colorScheme === 'dark')
  const companyPalette = getAndroidCompanyPalette()
  const activePalette = selectedMode === 'company' ? companyPalette : materialPalette
  const activeAccent = selectedMode === 'company' ? '#FF6A00' : String(materialPalette.primary)
  const activeAccentStrong =
    selectedMode === 'company' ? '#FF8C38' : String(materialPalette.primaryStrong)
  const activeOnPrimary = '#FFFFFF'
  const statusBarStyle = getAndroidStatusBarStyle(String(materialPalette.background))
  const isDarkMaterial = colorScheme === 'dark'
  const materialReadableText = isDarkMaterial
    ? '#F3F6F8'
    : String(materialPalette.onSurface)
  const materialReadableMuted = isDarkMaterial
    ? '#B2BCC4'
    : String(materialPalette.onSurfaceMuted)
  const materialReadableChip = isDarkMaterial
    ? '#DCE6EE'
    : String(materialPalette.onSurface)
  const materialReadableBadge = isDarkMaterial
    ? '#D7E3EC'
    : String(materialPalette.primaryStrong)
  const materialReadablePrimarySurface = isDarkMaterial ? '#212A33' : String(materialPalette.surfaceMuted)
  const materialReadableSecondarySurface = isDarkMaterial ? '#181F26' : String(materialPalette.surface)

  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [42, 0],
    extrapolate: 'clamp',
  })
  const sheetOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const sheetScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.97, 1],
    extrapolate: 'clamp',
  })
  const continueScale = footerPulse.interpolate({
    inputRange: [0.97, 1],
    outputRange: [0.985, 1],
    extrapolate: 'clamp',
  })
  const continueOpacity = footerPulse.interpolate({
    inputRange: [0.97, 1],
    outputRange: [0.88, 1],
    extrapolate: 'clamp',
  })

  const optionData: Array<{
    mode: ThemeMode
    eyebrow: string
    title: string
    badge: string
    description: string
  }> = [
    {
      mode: 'company',
      eyebrow: 'Фирменный стиль',
      title: 'Код компании',
      badge: 'Черный и оранжевый',
      description:
        'Контрастный интерфейс с плотными карточками и фирменным оранжевым акцентом.',
    },
    {
      mode: 'material',
      eyebrow: 'Системная тема',
      title: 'Material You',
      badge: colorScheme === 'dark' ? 'Под твою темную тему' : 'Под твою светлую тему',
      description:
        'Подстраивается под системную тему Android и использует системный акцент без резких цветов.',
    },
  ]

  const renderLivePreview = () => (
    <Animated.View
      style={[
        styles.previewShell,
        {
          backgroundColor: String(activePalette.surfaceRaised),
          borderColor: String(activePalette.outlineVariant),
          transform: [{ scale: previewPulse }],
        },
      ]}>
      <View style={styles.previewTopRow}>
        <View
          style={[
            styles.previewChip,
            {
              backgroundColor:
                selectedMode === 'company'
                  ? String(companyPalette.primaryContainer)
                  : materialReadablePrimarySurface,
              borderColor:
                selectedMode === 'company'
                  ? '#503016'
                  : String(materialPalette.outlineVariant),
            },
          ]}>
          <Text
            style={[
              styles.previewChipText,
              {
                color:
                  selectedMode === 'company' ? activeAccentStrong : materialReadableChip,
              },
            ]}>
            {selectedMode === 'company' ? 'Код компании' : 'Material You'}
          </Text>
        </View>
        <View
          style={[
            styles.previewAvatar,
            { backgroundColor: String(activePalette.primaryContainer) },
          ]}>
          <Text
            style={[
              styles.previewAvatarText,
              {
                color:
                  selectedMode === 'company' ? activeAccentStrong : materialReadableText,
              },
            ]}>
            D
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.previewHeroCard,
          {
            backgroundColor: String(activePalette.surface),
            borderColor: String(activePalette.outlineVariant),
          },
        ]}>
        <View
          style={[
            styles.previewBadge,
            {
              backgroundColor:
                selectedMode === 'company'
                  ? String(companyPalette.closedBadge)
                  : materialReadablePrimarySurface,
              borderColor:
                selectedMode === 'company'
                  ? String(companyPalette.closedBadgeBorder)
                  : String(activePalette.outlineVariant),
            },
          ]}>
          <Text
            style={[
              styles.previewBadgeText,
              {
                color:
                  selectedMode === 'company'
                    ? String(companyPalette.primaryStrong)
                    : materialReadableChip,
              },
            ]}>
            {selectedMode === 'company' ? 'Фирменный режим' : 'Системный режим'}
          </Text>
        </View>
        <View
          style={[
            styles.previewLineLong,
            { backgroundColor: String(activePalette.onSurface) },
          ]}
        />
        <View
          style={[
            styles.previewLineMedium,
            { backgroundColor: String(activePalette.onSurfaceMuted) },
          ]}
        />
      </View>

      <View style={styles.previewBottomRow}>
        <View
          style={[
            styles.previewMiniCard,
            {
              backgroundColor: String(activePalette.surface),
              borderColor: String(activePalette.outlineVariant),
            },
          ]}>
          <View
            style={[styles.previewMiniDot, { backgroundColor: activeAccent }]}
          />
          <View
            style={[
              styles.previewMiniLineWide,
              { backgroundColor: String(activePalette.onSurface) },
            ]}
          />
        </View>
        <View
          style={[
            styles.previewMiniCard,
            {
              backgroundColor:
                selectedMode === 'company'
                  ? String(companyPalette.primaryContainer)
                  : materialReadablePrimarySurface,
              borderColor: String(activePalette.outlineVariant),
            },
          ]}>
          <View
            style={[
              styles.previewMiniLineWide,
              {
                backgroundColor:
                  selectedMode === 'company'
                    ? '#FFFFFF'
                    : materialReadableBadge,
              },
            ]}
          />
          <View
            style={[
              styles.previewMiniLineShort,
              { backgroundColor: String(activePalette.onSurfaceMuted) },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  )
  const selectedOption = optionData.find(option => option.mode === selectedMode) ?? optionData[0]
  const handleSelectMode = (mode: ThemeMode) => {
    if (mode === selectedMode || isCompleting) {
      return
    }

    if (Platform.OS === 'android') {
      Vibration.vibrate(mode === 'company' ? 7 : 5)
    }
    setSelectedMode(mode)
  }

  const handleComplete = () => {
    if (isCompleting) {
      return
    }

    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 10, 24, 16])
    }
    setIsCompleting(true)
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(footerPulse, {
        toValue: 0.94,
        duration: 190,
        useNativeDriver: true,
      }),
    ]).start(() => {
      androidTheme.completeIntro(selectedMode)
      setIsCompleting(false)
    })
  }

  return (
    <View style={styles.root} pointerEvents="box-none">
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: String(materialPalette.background),
              opacity: sheetOpacity,
              transform: [{ translateY: sheetTranslateY }, { scale: sheetScale }],
            },
          ]}>
          <StatusBar
            barStyle={statusBarStyle}
            backgroundColor={String(materialPalette.background)}
          />

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <View style={styles.heroBlock}>
              <Text
                style={[
                  styles.kicker,
                  {
                    color:
                      selectedMode === 'company'
                        ? '#FF8C38'
                        : materialReadableBadge,
                  },
                ]}>
                Первый запуск
              </Text>
              <Text style={[styles.title, { color: String(materialPalette.onSurface) }]}>
                Выбери стиль приложения
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: String(materialPalette.onSurfaceMuted) },
                ]}>
                Выбери один из двух режимов. Настройку потом можно поменять во вкладке
                «Ещё».
              </Text>
            </View>

            {renderLivePreview()}

            <View style={styles.optionRow}>
              {optionData.map(option => {
                const isSelected = selectedMode === option.mode
                const optionAccent =
                  option.mode === 'company'
                    ? '#FF6A00'
                    : String(materialPalette.primary)

                return (
                  <Pressable
                    key={option.mode}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isSelected
                          ? option.mode === 'material'
                            ? materialReadablePrimarySurface
                            : String(materialPalette.surfaceRaised)
                          : option.mode === 'material'
                            ? materialReadableSecondarySurface
                            : String(materialPalette.surface),
                        borderColor: isSelected
                          ? optionAccent
                          : String(materialPalette.outlineVariant),
                      },
                    ]}
                    onPress={() => handleSelectMode(option.mode)}>
                    <View style={styles.optionTop}>
                      <View style={styles.optionCopy}>
                        <Text
                          style={[
                            styles.optionTitle,
                            {
                        color: isSelected
                                ? option.mode === 'material'
                                  ? materialReadableText
                                  : String(materialPalette.onSurface)
                                : option.mode === 'material'
                                  ? materialReadableMuted
                                  : String(materialPalette.onSurfaceMuted),
                            },
                          ]}>
                          {option.title}
                        </Text>
                        <Text
                          style={[
                            styles.optionMeta,
                            {
                              color: isSelected
                                ? option.mode === 'company'
                                  ? '#FF8C38'
                                  : materialReadableBadge
                                : option.mode === 'material'
                                  ? materialReadableMuted
                                  : String(materialPalette.onSurfaceMuted),
                            },
                          ]}>
                          {option.mode === 'company' ? 'Фирменный' : 'Системная'}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.optionRadio,
                          {
                            backgroundColor: isSelected ? optionAccent : 'transparent',
                            borderColor: isSelected
                              ? optionAccent
                              : String(materialPalette.outline),
                          },
                        ]}>
                        {isSelected ? <View style={styles.optionRadioInner} /> : null}
                      </View>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                backgroundColor: String(materialPalette.background),
                borderTopColor: String(materialPalette.outlineVariant),
              },
            ]}>
            <Text
              style={[
                styles.footerCaption,
                { color: String(materialPalette.onSurfaceMuted) },
              ]}>
              Выбран режим:{' '}
              <Text style={{ color: String(materialPalette.onSurface), fontWeight: '800' }}>
                {selectedOption.title}
              </Text>
            </Text>

            <Pressable
              style={[
                styles.continueButton,
                {
                  backgroundColor: activeAccent,
                  borderColor: selectedMode === 'company' ? '#FF8C38' : materialReadablePrimarySurface,
                },
              ]}
              onPress={handleComplete}>
              <Animated.View
                style={{
                  transform: [{ scale: continueScale }],
                  opacity: continueOpacity,
                }}>
                <Text style={[styles.continueButtonText, { color: activeOnPrimary }]}>
                  Продолжить
                </Text>
              </Animated.View>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 400,
    elevation: 400,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4,7,10,0.62)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sheet: {
    maxHeight: '74%',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.28,
    shadowRadius: 34,
    elevation: 14,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 10,
  },
  heroBlock: {
    gap: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 25,
    lineHeight: 29,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  previewShell: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewChip: {
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewChipText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  previewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewAvatarText: {
    fontSize: 17,
    fontWeight: '900',
  },
  previewHeroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    overflow: 'hidden',
  },
  previewBadge: {
    alignSelf: 'flex-start',
    minHeight: 26,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.25,
  },
  previewLineLong: {
    width: '88%',
    height: 7,
    borderRadius: 999,
  },
  previewLineMedium: {
    width: '64%',
    height: 7,
    borderRadius: 999,
    opacity: 0.76,
  },
  previewBottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  previewMiniCard: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  previewMiniDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  previewMiniLineWide: {
    width: '84%',
    height: 7,
    borderRadius: 999,
  },
  previewMiniLineShort: {
    width: '56%',
    height: 7,
    borderRadius: 999,
    opacity: 0.76,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionCard: {
    flex: 1,
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  optionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionCopy: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '900',
  },
  optionMeta: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.25,
  },
  optionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioInner: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
  },
  footerCaption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  continueButton: {
    minHeight: 52,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
})
