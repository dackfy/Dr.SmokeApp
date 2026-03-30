import { Platform, Vibration } from 'react-native'

export type AndroidHapticStrength = 'soft' | 'normal' | 'expressive'

type HapticKind =
  | 'softTick'
  | 'tick'
  | 'releaseTick'
  | 'selection'
  | 'toggle'
  | 'confirm'
  | 'lightImpact'
  | 'mediumImpact'
  | 'heavyImpact'
  | 'peakImpact'
  | 'success'
  | 'warning'
  | 'rustle'

const HAPTIC_PATTERNS: Record<HapticKind, number | number[]> = {
  softTick: 6,
  tick: 9,
  releaseTick: 7,
  selection: [0, 7, 18, 5],
  toggle: [0, 8, 20, 6],
  confirm: [0, 10, 24, 14],
  lightImpact: 10,
  mediumImpact: [0, 12, 18, 6],
  heavyImpact: [0, 16, 20, 10],
  peakImpact: [0, 18, 22, 14],
  success: [0, 10, 22, 12, 18],
  warning: [0, 12, 28, 10, 18, 26, 8],
  rustle: [0, 5, 14, 4, 12, 4],
}

const HAPTIC_OPTIONS = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
} as const

let currentAndroidHapticStrength: AndroidHapticStrength = 'normal'

export function setAndroidHapticStrength(strength: AndroidHapticStrength) {
  currentAndroidHapticStrength = strength
}

function canVibrate() {
  return Platform.OS === 'android'
}

function resolveNativeType(
  kind: HapticKind,
  strength: AndroidHapticStrength,
): string {
  if (strength === 'soft') {
    switch (kind) {
      case 'softTick':
        return 'soft'
      case 'tick':
        return 'effectTick'
      case 'releaseTick':
        return 'keyboardRelease'
      case 'selection':
        return 'clockTick'
      case 'toggle':
        return 'keyboardTap'
      case 'confirm':
        return 'contextClick'
      case 'lightImpact':
        return 'soft'
      case 'mediumImpact':
        return 'effectClick'
      case 'heavyImpact':
        return 'rigid'
      case 'peakImpact':
        return 'impactHeavy'
      case 'success':
        return 'notificationSuccess'
      case 'warning':
        return 'notificationWarning'
      case 'rustle':
        return 'textHandleMove'
    }
  }

  if (strength === 'expressive') {
    switch (kind) {
      case 'softTick':
        return 'clockTick'
      case 'tick':
        return 'effectClick'
      case 'releaseTick':
        return 'keyboardRelease'
      case 'selection':
        return 'virtualKey'
      case 'toggle':
        return 'keyboardPress'
      case 'confirm':
        return 'rigid'
      case 'lightImpact':
        return 'impactMedium'
      case 'mediumImpact':
        return 'impactHeavy'
      case 'heavyImpact':
        return 'effectHeavyClick'
      case 'peakImpact':
        return 'effectHeavyClick'
      case 'success':
        return 'notificationSuccess'
      case 'warning':
        return 'notificationWarning'
      case 'rustle':
        return 'textHandleMove'
    }
  }

  switch (kind) {
    case 'softTick':
      return 'effectTick'
    case 'tick':
      return 'effectClick'
    case 'releaseTick':
      return 'keyboardRelease'
    case 'selection':
      return 'clockTick'
    case 'toggle':
      return 'keyboardTap'
    case 'confirm':
      return 'rigid'
    case 'lightImpact':
      return 'impactLight'
    case 'mediumImpact':
      return 'impactMedium'
    case 'heavyImpact':
      return 'impactHeavy'
    case 'peakImpact':
      return 'impactHeavy'
    case 'success':
      return 'notificationSuccess'
    case 'warning':
      return 'notificationWarning'
    case 'rustle':
      return 'soft'
  }
}

function resolveFallbackKind(
  kind: HapticKind,
  strength: AndroidHapticStrength,
): HapticKind {
  if (strength === 'soft') {
    switch (kind) {
      case 'peakImpact':
      case 'heavyImpact':
        return 'mediumImpact'
      case 'mediumImpact':
      case 'confirm':
        return 'lightImpact'
      default:
        return kind
    }
  }

  if (strength === 'expressive') {
    switch (kind) {
      case 'lightImpact':
        return 'mediumImpact'
      case 'mediumImpact':
      case 'confirm':
        return 'heavyImpact'
      default:
        return kind
    }
  }

  return kind
}

export function androidHaptic(kind: HapticKind) {
  if (!canVibrate()) {
    return
  }

  const resolvedKind = resolveFallbackKind(kind, currentAndroidHapticStrength)
  const nativeType = resolveNativeType(kind, currentAndroidHapticStrength)

  try {
    const { trigger } = require('react-native-haptic-feedback') as {
      trigger: (
        type: string,
        options: typeof HAPTIC_OPTIONS,
      ) => void
    }
    if (kind === 'peakImpact') {
      trigger(nativeType, HAPTIC_OPTIONS)
      setTimeout(() => {
        try {
          trigger(
            currentAndroidHapticStrength === 'expressive' ? 'rigid' : 'effectClick',
            HAPTIC_OPTIONS,
          )
        } catch {
          Vibration.vibrate(HAPTIC_PATTERNS.peakImpact)
        }
      }, currentAndroidHapticStrength === 'expressive' ? 18 : 22)
      return
    }
    trigger(nativeType, HAPTIC_OPTIONS)
    return
  } catch {
    Vibration.vibrate(HAPTIC_PATTERNS[resolvedKind])
  }
}

export function androidSoftTick() {
  androidHaptic('softTick')
}

export function androidTick() {
  androidHaptic('tick')
}

export function androidSelectionHaptic() {
  androidHaptic('selection')
}

export function androidToggleHaptic() {
  androidHaptic('toggle')
}

export function androidConfirmHaptic() {
  androidHaptic('confirm')
}

export function androidLightImpact() {
  androidHaptic('lightImpact')
}

export function androidMediumImpact() {
  androidHaptic('mediumImpact')
}

export function androidHeavyImpact() {
  androidHaptic('heavyImpact')
}

export function androidPeakImpact() {
  androidHaptic('peakImpact')
}

export function androidSuccessHaptic() {
  androidHaptic('success')
}

export function androidWarningHaptic() {
  androidHaptic('warning')
}

export function androidRustleHaptic() {
  androidHaptic('rustle')
}

export function androidReleaseTick() {
  androidHaptic('releaseTick')
}
