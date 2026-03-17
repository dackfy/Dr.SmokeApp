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

const lightFallback: AndroidThemePalette = {
  primary: '#315f55',
  primaryStrong: '#22483f',
  secondary: '#54635d',
  tertiary: '#65597a',
  primaryContainer: '#d7eee6',
  primaryContainerStrong: '#bedfd4',
  background: '#f4f7f3',
  surface: '#fcfdfa',
  surfaceRaised: '#ffffff',
  surfaceMuted: '#edf3ef',
  surfaceAccent: '#e5efe9',
  outline: '#c5d2cb',
  outlineVariant: '#d8e2dd',
  onSurface: '#181d1a',
  onSurfaceMuted: '#58635e',
  onPrimary: '#ffffff',
  error: '#b3261e',
  errorContainer: '#ffd9d4',
  errorBorder: '#d99a94',
  success: '#245b38',
  successContainer: '#d8f0df',
  successBorder: '#97c8a7',
  buttonText: '#ffffff',
  closedBadge: '#efe4d7',
  closedBadgeBorder: '#d2bc9e',
  secondaryButton: '#dfe8e3',
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
  primary: '#8fdbc7',
  primaryStrong: '#b7f4e5',
  secondary: '#b0ccc3',
  tertiary: '#d5bde7',
  primaryContainer: '#173a32',
  primaryContainerStrong: '#1d4a40',
  background: '#0f1412',
  surface: '#151b18',
  surfaceRaised: '#1a211e',
  surfaceMuted: '#1f2723',
  surfaceAccent: '#25302b',
  outline: '#38443f',
  outlineVariant: '#2b3531',
  onSurface: '#edf2ee',
  onSurfaceMuted: '#a4b2ab',
  onPrimary: '#0b1f19',
  error: '#ffb4ab',
  errorContainer: '#4b1915',
  errorBorder: '#8a3c36',
  success: '#9fdbb2',
  successContainer: '#173524',
  successBorder: '#306348',
  buttonText: '#082119',
  closedBadge: '#3b2b20',
  closedBadgeBorder: '#6a5241',
  secondaryButton: '#26302c',
}

const USE_DYNAMIC_ANDROID_COLORS = true

function systemColor(name: string, fallback: ColorValue) {
  if (!USE_DYNAMIC_ANDROID_COLORS) {
    return fallback
  }

  return Platform.OS === 'android' && Number(Platform.Version) >= 31
    ? PlatformColor(`@android:color/${name}`)
    : fallback
}

export function getAndroidThemePalette(isDark: boolean): AndroidThemePalette {
  if (isDark) {
    return {
      ...darkFallback,
      primary: systemColor('system_accent1_300', darkFallback.primary),
      primaryStrong: systemColor('system_accent1_100', darkFallback.primaryStrong),
      secondary: systemColor('system_accent2_300', darkFallback.secondary),
      tertiary: systemColor('system_accent3_300', darkFallback.tertiary),
      primaryContainer: systemColor('system_accent1_700', darkFallback.primaryContainer),
      primaryContainerStrong: systemColor(
        'system_accent1_600',
        darkFallback.primaryContainerStrong,
      ),
      // Keep surfaces and text on stable contrast-safe fallbacks.
      background: darkFallback.background,
      surface: darkFallback.surface,
      surfaceRaised: darkFallback.surfaceRaised,
      surfaceMuted: darkFallback.surfaceMuted,
      surfaceAccent: darkFallback.surfaceAccent,
      outline: darkFallback.outline,
      outlineVariant: darkFallback.outlineVariant,
      onSurface: darkFallback.onSurface,
      onSurfaceMuted: darkFallback.onSurfaceMuted,
      onPrimary: darkFallback.onPrimary,
      closedBadge: systemColor('system_accent2_700', darkFallback.closedBadge),
      closedBadgeBorder: systemColor(
        'system_accent2_500',
        darkFallback.closedBadgeBorder,
      ),
      secondaryButton: systemColor('system_neutral2_700', darkFallback.secondaryButton),
    }
  }

  return {
    ...lightFallback,
    primary: systemColor('system_accent1_600', lightFallback.primary),
    primaryStrong: systemColor('system_accent1_800', lightFallback.primaryStrong),
    secondary: systemColor('system_accent2_600', lightFallback.secondary),
    tertiary: systemColor('system_accent3_600', lightFallback.tertiary),
    primaryContainer: systemColor('system_accent1_100', lightFallback.primaryContainer),
    primaryContainerStrong: systemColor(
      'system_accent1_200',
      lightFallback.primaryContainerStrong,
    ),
    // Stable neutrals keep the UI readable even with aggressive device accents.
    background: lightFallback.background,
    surface: lightFallback.surface,
    surfaceRaised: lightFallback.surfaceRaised,
    surfaceMuted: lightFallback.surfaceMuted,
    surfaceAccent: lightFallback.surfaceAccent,
    outline: lightFallback.outline,
    outlineVariant: lightFallback.outlineVariant,
    onSurface: lightFallback.onSurface,
    onSurfaceMuted: lightFallback.onSurfaceMuted,
    onPrimary: lightFallback.onPrimary,
    closedBadge: systemColor('system_accent2_100', lightFallback.closedBadge),
    closedBadgeBorder: systemColor(
      'system_accent2_300',
      lightFallback.closedBadgeBorder,
    ),
    secondaryButton: systemColor('system_neutral2_100', lightFallback.secondaryButton),
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
