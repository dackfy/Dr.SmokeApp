import React from 'react'
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  StatusBar,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAndroidThemeMode } from '../theme/androidAppTheme'
import {
  getAndroidCompanyPalette,
  getAndroidStatusBarStyle,
  getAndroidThemePalette,
} from '../theme/androidDynamicColors'

export default function AndroidThemeIntro() {
  const colorScheme = useColorScheme()
  const androidTheme = useAndroidThemeMode()
  const progress = React.useRef(new Animated.Value(0)).current
  const [selectedMode, setSelectedMode] = React.useState<'company' | 'material'>('material')

  React.useEffect(() => {
    if (!androidTheme.shouldShowIntro || Platform.OS !== 'android') {
      return
    }

    setSelectedMode(androidTheme.mode)
    progress.setValue(0)
    Animated.spring(progress, {
      toValue: 1,
      stiffness: 180,
      damping: 20,
      mass: 0.9,
      useNativeDriver: true,
    }).start()
  }, [androidTheme.mode, androidTheme.shouldShowIntro, progress])

  if (Platform.OS !== 'android' || !androidTheme.shouldShowIntro) {
    return null
  }

  const materialPalette = getAndroidThemePalette(colorScheme === 'dark')
  const companyPalette = getAndroidCompanyPalette()
  const statusBarStyle = getAndroidStatusBarStyle(String(materialPalette.background))
  const sheetTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [52, 0],
    extrapolate: 'clamp',
  })
  const sheetOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const sheetScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
    extrapolate: 'clamp',
  })

  const renderPreview = (
    palette: ReturnType<typeof getAndroidThemePalette>,
    isCompany: boolean,
  ) => (
    <View style={introStyles.previewRow}>
      <View
        style={[
          introStyles.previewPanel,
          {
            backgroundColor: String(palette.surfaceRaised),
            borderColor: String(palette.outlineVariant),
          },
        ]}>
        <View
          style={[
            introStyles.previewOrb,
            { backgroundColor: isCompany ? '#FF6A00' : String(palette.primary) },
          ]}
        />
        <View
          style={[
            introStyles.previewLine,
            { backgroundColor: String(palette.onSurface) },
          ]}
        />
        <View
          style={[
            introStyles.previewLineMuted,
            { backgroundColor: String(palette.onSurfaceMuted) },
          ]}
        />
      </View>
      <View
        style={[
          introStyles.previewAccentBar,
          {
            backgroundColor: isCompany ? '#FF6A00' : String(palette.primary),
          },
        ]}
      />
      <View
        style={[
          introStyles.previewPanel,
          {
            backgroundColor: String(palette.primaryContainer),
            borderColor: String(palette.outlineVariant),
          },
        ]}>
        <View
          style={[
            introStyles.previewLine,
            { backgroundColor: isCompany ? '#FFFFFF' : String(palette.primaryStrong) },
          ]}
        />
        <View
          style={[
            introStyles.previewLineShort,
            { backgroundColor: String(palette.onSurfaceMuted) },
          ]}
        />
      </View>
    </View>
  )

  return (
    <View style={introStyles.root} pointerEvents="box-none">
      <SafeAreaView style={introStyles.overlay} edges={['top', 'bottom']}>
        <Animated.View
          style={[
            introStyles.sheet,
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
          <View style={introStyles.heroBlock}>
            <Text style={[introStyles.kicker, { color: String(materialPalette.primary) }]}>
              Первый запуск
            </Text>
            <Text style={[introStyles.title, { color: String(materialPalette.onSurface) }]}>
              Выбери стиль приложения
            </Text>
            <Text
              style={[
                introStyles.subtitle,
                { color: String(materialPalette.onSurfaceMuted) },
              ]}>
              Можно оставить фирменный код-дизайн или включить Material You, чтобы интерфейс
              подстраивался под систему.
            </Text>
          </View>

          <View style={introStyles.optionList}>
            <Pressable
              style={[
                introStyles.optionCard,
                selectedMode === 'company' ? introStyles.optionCardSelected : null,
                {
                  backgroundColor: String(companyPalette.surfaceRaised),
                  borderColor:
                    selectedMode === 'company'
                      ? '#FF6A00'
                      : String(companyPalette.outlineVariant),
                },
              ]}
              onPress={() => setSelectedMode('company')}>
              <View style={introStyles.optionHeader}>
                <Text style={[introStyles.optionBadge, { color: '#FFB273' }]}>Brand code</Text>
                <Text style={[introStyles.optionTitle, { color: '#FFFFFF' }]}>
                  Код компании
                </Text>
                <Text style={[introStyles.optionText, { color: '#A8A8A8' }]}>
                  Контрастный тёмный интерфейс с плотной типографикой и ярким акцентом.
                </Text>
              </View>
              {renderPreview(companyPalette, true)}
            </Pressable>

            <Pressable
              style={[
                introStyles.optionCard,
                selectedMode === 'material' ? introStyles.optionCardSelected : null,
                {
                  backgroundColor: String(materialPalette.surfaceRaised),
                  borderColor:
                    selectedMode === 'material'
                      ? String(materialPalette.primary)
                      : String(materialPalette.outlineVariant),
                },
              ]}
              onPress={() => setSelectedMode('material')}>
              <View style={introStyles.optionHeader}>
                <Text
                  style={[
                    introStyles.optionBadge,
                    { color: String(materialPalette.primary) },
                  ]}>
                  System adaptive
                </Text>
                <Text
                  style={[
                    introStyles.optionTitle,
                    { color: String(materialPalette.onSurface) },
                  ]}>
                  Material You
                </Text>
                <Text
                  style={[
                    introStyles.optionText,
                    { color: String(materialPalette.onSurfaceMuted) },
                  ]}>
                  Подхватывает системную светлую или тёмную тему и системные акцентные цвета.
                </Text>
              </View>
              {renderPreview(materialPalette, false)}
            </Pressable>
          </View>

          <Text
            style={[
              introStyles.footerHint,
              { color: String(materialPalette.onSurfaceMuted) },
            ]}>
            Настройку можно изменить позже во вкладке «Ещё».
          </Text>
          <Pressable
            style={[
              introStyles.continueButton,
              {
                backgroundColor:
                  selectedMode === 'company'
                    ? '#FF6A00'
                    : String(materialPalette.primary),
              },
            ]}
            onPress={() => androidTheme.completeIntro(selectedMode)}>
            <Text
              style={[
                introStyles.continueButtonText,
                {
                  color:
                    selectedMode === 'company'
                      ? '#FFFFFF'
                      : String(materialPalette.onPrimary),
                },
              ]}>
              Дальше
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

const introStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 400,
    elevation: 400,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5,8,12,0.56)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  sheet: {
    borderRadius: 34,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
    elevation: 12,
  },
  heroBlock: {
    marginBottom: 18,
    gap: 8,
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  optionList: {
    gap: 12,
  },
  optionCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  optionCardSelected: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 6,
  },
  optionHeader: {
    gap: 6,
  },
  optionBadge: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  optionTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  optionText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    height: 72,
  },
  previewPanel: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  previewAccentBar: {
    width: 24,
    borderRadius: 16,
  },
  previewOrb: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  previewLine: {
    width: '92%',
    height: 8,
    borderRadius: 999,
  },
  previewLineMuted: {
    width: '66%',
    height: 7,
    borderRadius: 999,
    opacity: 0.45,
  },
  previewLineShort: {
    width: '52%',
    height: 7,
    borderRadius: 999,
    opacity: 0.7,
  },
  footerHint: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontWeight: '500',
  },
  continueButton: {
    minHeight: 56,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
})
