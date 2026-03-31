import { Platform, PlatformColor, type ColorValue } from 'react-native'

export type AndroidThemePalette = {
  primary: ColorValue
  primaryStrong: ColorValue
  secondary: ColorValue
  tertiary: ColorValue
  primaryContainer: ColorValue
  primaryContainerStrong: ColorValue
  background: ColorValue
  surface: ColorValue
  surfaceRaised: ColorValue
  surfaceMuted: ColorValue
  surfaceAccent: ColorValue
  outline: ColorValue
  outlineVariant: ColorValue
  onSurface: ColorValue
  onSurfaceMuted: ColorValue
  onPrimary: ColorValue
  error: ColorValue
  errorContainer: ColorValue
  errorBorder: ColorValue
  success: ColorValue
  successContainer: ColorValue
  successBorder: ColorValue
  buttonText: ColorValue
  closedBadge: ColorValue
  closedBadgeBorder: ColorValue
  secondaryButton: ColorValue
}

export type AndroidContrastMode = 'balanced' | 'high'

const lightFallback: AndroidThemePalette = {
  primary: '#4F6EE8',
  primaryStrong: '#2E4FD6',
  secondary: '#6C7FD9',
  tertiary: '#7B63BF',
  primaryContainer: '#E4EAFF',
  primaryContainerStrong: '#D2DCFF',
  background: '#F5F7FC',
  surface: '#FCFDFF',
  surfaceRaised: '#ffffff',
  surfaceMuted: '#EEF2FF',
  surfaceAccent: '#E4EAFF',
  outline: '#C7D1F1',
  outlineVariant: '#D8E0F8',
  onSurface: '#121826',
  onSurfaceMuted: '#5F6781',
  onPrimary: '#ffffff',
  error: '#b3261e',
  errorContainer: '#ffd9d4',
  errorBorder: '#d99a94',
  success: '#1F6A46',
  successContainer: '#DDF6E7',
  successBorder: '#9FD6B7',
  buttonText: '#ffffff',
  closedBadge: '#ECE4FF',
  closedBadgeBorder: '#C8BAF4',
  secondaryButton: '#E3E9FF',
}

const companyPalette: AndroidThemePalette = {
  primary: '#FF6A00',
  primaryStrong: '#FF8C38',
  secondary: '#7A5C46',
  tertiary: '#644A3B',
  primaryContainer: '#241409',
  primaryContainerStrong: '#2E1808',
  background: '#000000',
  surface: '#0B0B0B',
  surfaceRaised: '#121212',
  surfaceMuted: '#171717',
  surfaceAccent: '#1C1C1C',
  outline: '#2D2D2D',
  outlineVariant: '#242424',
  onSurface: '#FFFFFF',
  onSurfaceMuted: '#A8A8A8',
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
  secondaryButton: '#191919',
}

const darkFallback: AndroidThemePalette = {
  primary: '#A9B8FF',
  primaryStrong: '#D9E0FF',
  secondary: '#C2C9F5',
  tertiary: '#D9C3FF',
  primaryContainer: '#243165',
  primaryContainerStrong: '#31407E',
  background: '#090B14',
  surface: '#111522',
  surfaceRaised: '#171C2B',
  surfaceMuted: '#1D2436',
  surfaceAccent: '#243052',
  outline: '#3F4A6B',
  outlineVariant: '#2B3451',
  onSurface: '#F4F6FF',
  onSurfaceMuted: '#AAB2CF',
  onPrimary: '#0A1024',
  error: '#ffb4ab',
  errorContainer: '#4b1915',
  errorBorder: '#8a3c36',
  success: '#A7E2B7',
  successContainer: '#173524',
  successBorder: '#306348',
  buttonText: '#0A1024',
  closedBadge: '#33264C',
  closedBadgeBorder: '#65528A',
  secondaryButton: '#212949',
}

function supportsAndroidDynamicColors() {
  return Platform.OS === 'android' && Number(Platform.Version) >= 31
}

function dynamicColor(token: string, fallback: ColorValue): ColorValue {
  return supportsAndroidDynamicColors() ? PlatformColor(token) : fallback
}

export function getAndroidThemePalette(
  isDark: boolean,
  contrastMode: AndroidContrastMode = 'balanced',
): AndroidThemePalette {
  const isHighContrast = contrastMode === 'high'
  if (isDark) {
    return {
      primary: dynamicColor('@android:color/system_accent1_300', darkFallback.primary),
      primaryStrong: dynamicColor('@android:color/system_accent1_200', darkFallback.primaryStrong),
      secondary: dynamicColor('@android:color/system_accent2_300', darkFallback.secondary),
      tertiary: dynamicColor('@android:color/system_accent3_300', darkFallback.tertiary),
      primaryContainer: dynamicColor(
        '@android:color/system_accent1_800',
        darkFallback.primaryContainer,
      ),
      primaryContainerStrong: dynamicColor(
        '@android:color/system_accent1_700',
        darkFallback.primaryContainerStrong,
      ),
      background: dynamicColor('@android:color/system_neutral1_900', darkFallback.background),
      surface: dynamicColor('@android:color/system_neutral2_900', darkFallback.surface),
      surfaceRaised: dynamicColor(
        isHighContrast ? '@android:color/system_neutral2_700' : '@android:color/system_neutral2_800',
        isHighContrast ? '#1C2230' : darkFallback.surfaceRaised,
      ),
      surfaceMuted: dynamicColor(
        isHighContrast ? '@android:color/system_neutral2_600' : '@android:color/system_neutral2_700',
        isHighContrast ? '#232B3C' : darkFallback.surfaceMuted,
      ),
      surfaceAccent: dynamicColor(
        isHighContrast ? '@android:color/system_accent1_800' : '@android:color/system_accent1_800',
        isHighContrast ? '#273657' : darkFallback.surfaceAccent,
      ),
      outline: dynamicColor(
        isHighContrast ? '@android:color/system_neutral2_300' : '@android:color/system_neutral2_400',
        isHighContrast ? '#6B7790' : darkFallback.outline,
      ),
      outlineVariant: dynamicColor(
        isHighContrast ? '@android:color/system_neutral2_500' : '@android:color/system_neutral2_600',
        isHighContrast ? '#4B5872' : darkFallback.outlineVariant,
      ),
      onSurface: dynamicColor('@android:color/system_neutral1_50', darkFallback.onSurface),
      onSurfaceMuted: dynamicColor(
        isHighContrast ? '@android:color/system_neutral2_100' : '@android:color/system_neutral2_200',
        isHighContrast ? '#C7D0E0' : darkFallback.onSurfaceMuted,
      ),
      onPrimary: dynamicColor('@android:color/system_neutral1_900', darkFallback.onPrimary),
      error: darkFallback.error,
      errorContainer: darkFallback.errorContainer,
      errorBorder: darkFallback.errorBorder,
      success: darkFallback.success,
      successContainer: darkFallback.successContainer,
      successBorder: darkFallback.successBorder,
      buttonText: dynamicColor('@android:color/system_neutral1_900', darkFallback.buttonText),
      closedBadge: dynamicColor('@android:color/system_accent3_800', darkFallback.closedBadge),
      closedBadgeBorder: dynamicColor(
        '@android:color/system_accent3_700',
        darkFallback.closedBadgeBorder,
      ),
      secondaryButton: dynamicColor(
        '@android:color/system_neutral2_800',
        darkFallback.secondaryButton,
      ),
    }
  }

  return {
    primary: dynamicColor('@android:color/system_accent1_500', lightFallback.primary),
    primaryStrong: dynamicColor('@android:color/system_accent1_700', lightFallback.primaryStrong),
    secondary: dynamicColor('@android:color/system_accent2_500', lightFallback.secondary),
    tertiary: dynamicColor('@android:color/system_accent3_500', lightFallback.tertiary),
    primaryContainer: dynamicColor(
      '@android:color/system_accent1_100',
      lightFallback.primaryContainer,
    ),
    primaryContainerStrong: dynamicColor(
      '@android:color/system_accent1_200',
      lightFallback.primaryContainerStrong,
    ),
    background: dynamicColor('@android:color/system_neutral1_10', lightFallback.background),
    surface: dynamicColor('@android:color/system_neutral1_0', lightFallback.surface),
    surfaceRaised: dynamicColor(
      isHighContrast ? '@android:color/system_neutral1_0' : '@android:color/system_neutral1_10',
      isHighContrast ? '#FBFCFF' : lightFallback.surfaceRaised,
    ),
    surfaceMuted: dynamicColor(
      isHighContrast ? '@android:color/system_neutral2_100' : '@android:color/system_neutral2_50',
      isHighContrast ? '#EDF2FB' : lightFallback.surfaceMuted,
    ),
    surfaceAccent: dynamicColor(
      isHighContrast ? '@android:color/system_accent1_100' : '@android:color/system_accent1_50',
      isHighContrast ? '#E2EAFA' : lightFallback.surfaceAccent,
    ),
    outline: dynamicColor(
      isHighContrast ? '@android:color/system_neutral2_400' : '@android:color/system_neutral2_300',
      isHighContrast ? '#99A6BC' : lightFallback.outline,
    ),
    outlineVariant: dynamicColor(
      isHighContrast ? '@android:color/system_neutral2_300' : '@android:color/system_neutral2_200',
      isHighContrast ? '#B9C5D9' : lightFallback.outlineVariant,
    ),
    onSurface: dynamicColor('@android:color/system_neutral1_900', lightFallback.onSurface),
    onSurfaceMuted: dynamicColor(
      isHighContrast ? '@android:color/system_neutral2_800' : '@android:color/system_neutral2_700',
      isHighContrast ? '#596476' : lightFallback.onSurfaceMuted,
    ),
    onPrimary: dynamicColor('@android:color/system_neutral1_10', lightFallback.onPrimary),
    error: lightFallback.error,
    errorContainer: lightFallback.errorContainer,
    errorBorder: lightFallback.errorBorder,
    success: lightFallback.success,
    successContainer: lightFallback.successContainer,
    successBorder: lightFallback.successBorder,
    buttonText: dynamicColor('@android:color/system_neutral1_10', lightFallback.buttonText),
    closedBadge: dynamicColor('@android:color/system_accent3_100', lightFallback.closedBadge),
    closedBadgeBorder: dynamicColor(
      '@android:color/system_accent3_200',
      lightFallback.closedBadgeBorder,
    ),
    secondaryButton: dynamicColor(
      '@android:color/system_neutral2_100',
      lightFallback.secondaryButton,
    ),
  }
}

export function getAndroidCompanyPalette(): AndroidThemePalette {
  return companyPalette
}

export function getAndroidStatusBarColor(isDark: boolean): string {
  return isDark ? '#0f1412' : '#f4f7f3'
}

function normalizeHexColor(color: string): string | null {
  const normalized = color.trim().replace('#', '')

  if (normalized.length === 3) {
    return normalized
      .split('')
      .map(char => char + char)
      .join('')
  }

  if (normalized.length === 6) {
    return normalized
  }

  return null
}

function getChannelLuminance(channel: number): number {
  const value = channel / 255
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

export function getAndroidStatusBarStyle(
  backgroundColor: string,
): 'light-content' | 'dark-content' {
  const normalized = normalizeHexColor(backgroundColor)

  if (!normalized) {
    return 'light-content'
  }

  const red = parseInt(normalized.slice(0, 2), 16)
  const green = parseInt(normalized.slice(2, 4), 16)
  const blue = parseInt(normalized.slice(4, 6), 16)

  const luminance =
    0.2126 * getChannelLuminance(red) +
    0.7152 * getChannelLuminance(green) +
    0.0722 * getChannelLuminance(blue)

  return luminance > 0.5 ? 'dark-content' : 'light-content'
}
