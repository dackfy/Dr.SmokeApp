import AsyncStorage from '@react-native-async-storage/async-storage'
import React from 'react'
import { Animated } from 'react-native'
import { setAndroidHapticStrength, type AndroidHapticStrength } from '../utils/androidHaptics'
import type { AndroidContrastMode } from './androidDynamicColors'

export type AndroidDesignMode = 'material' | 'company'
export type AndroidThemeTransitionPhase = 'idle' | 'exiting' | 'entering'
export type AndroidThemeTransitionOrigin = { x: number; y: number } | null
export type AndroidMotionIntensity = 'full' | 'standard' | 'minimal'

type AndroidThemeContextValue = {
  mode: AndroidDesignMode
  setMode: (mode: AndroidDesignMode) => void
  completeIntro: (mode: AndroidDesignMode) => void
  isHydrating: boolean
  shouldShowIntro: boolean
  transitionPhase: AndroidThemeTransitionPhase
  transitionTarget: AndroidDesignMode | null
  transitionOrigin: AndroidThemeTransitionOrigin
  previewTarget: AndroidDesignMode | null
  previewOrigin: AndroidThemeTransitionOrigin
  previewProgress: Animated.Value
  beginPreview: (mode: AndroidDesignMode, origin?: AndroidThemeTransitionOrigin) => void
  clearPreview: () => void
  motionIntensity: AndroidMotionIntensity
  setMotionIntensity: (value: AndroidMotionIntensity) => void
  hapticStrength: AndroidHapticStrength
  setHapticStrength: (value: AndroidHapticStrength) => void
  contrastMode: AndroidContrastMode
  setContrastMode: (value: AndroidContrastMode) => void
  notificationsEnabled: boolean
  setNotificationsEnabled: (value: boolean) => void
  hintsEnabled: boolean
  setHintsEnabled: (value: boolean) => void
  confirmActionsEnabled: boolean
  setConfirmActionsEnabled: (value: boolean) => void
}

const STORAGE_KEY = 'android_design_mode_v1'
const INTRO_STORAGE_KEY = 'android_design_intro_seen_v2'
const MOTION_STORAGE_KEY = 'android_motion_intensity_v1'
const HAPTIC_STORAGE_KEY = 'android_haptic_strength_v1'
const CONTRAST_STORAGE_KEY = 'android_contrast_mode_v1'
const NOTIFICATIONS_STORAGE_KEY = 'android_notifications_enabled_v1'
const HINTS_STORAGE_KEY = 'android_hints_enabled_v1'
const CONFIRM_ACTIONS_STORAGE_KEY = 'android_confirm_actions_enabled_v1'
const THEME_EXIT_MS = 380
const THEME_ENTER_MS = 620

const AndroidThemeContext = React.createContext<AndroidThemeContextValue>({
  mode: 'material',
  setMode: () => {},
  completeIntro: () => {},
  isHydrating: true,
  shouldShowIntro: false,
  transitionPhase: 'idle',
  transitionTarget: null,
  transitionOrigin: null,
  previewTarget: null,
  previewOrigin: null,
  previewProgress: new Animated.Value(0),
  beginPreview: () => {},
  clearPreview: () => {},
  motionIntensity: 'standard',
  setMotionIntensity: () => {},
  hapticStrength: 'normal',
  setHapticStrength: () => {},
  contrastMode: 'balanced',
  setContrastMode: () => {},
  notificationsEnabled: true,
  setNotificationsEnabled: () => {},
  hintsEnabled: true,
  setHintsEnabled: () => {},
  confirmActionsEnabled: true,
  setConfirmActionsEnabled: () => {},
})

export function useAndroidThemeModeState(): AndroidThemeContextValue {
  const [mode, setModeState] = React.useState<AndroidDesignMode>('material')
  const [isHydrating, setIsHydrating] = React.useState(true)
  const [shouldShowIntro, setShouldShowIntro] = React.useState(false)
  const [transitionPhase, setTransitionPhase] =
    React.useState<AndroidThemeTransitionPhase>('idle')
  const [transitionTarget, setTransitionTarget] = React.useState<AndroidDesignMode | null>(null)
  const [transitionOrigin, setTransitionOrigin] =
    React.useState<AndroidThemeTransitionOrigin>(null)
  const [previewTarget, setPreviewTarget] = React.useState<AndroidDesignMode | null>(null)
  const [previewOrigin, setPreviewOrigin] =
    React.useState<AndroidThemeTransitionOrigin>(null)
  const [motionIntensity, setMotionIntensityState] =
    React.useState<AndroidMotionIntensity>('standard')
  const [hapticStrength, setHapticStrengthState] =
    React.useState<AndroidHapticStrength>('normal')
  const [contrastMode, setContrastModeState] =
    React.useState<AndroidContrastMode>('balanced')
  const [notificationsEnabled, setNotificationsEnabledState] = React.useState(true)
  const [hintsEnabled, setHintsEnabledState] = React.useState(true)
  const [confirmActionsEnabled, setConfirmActionsEnabledState] = React.useState(true)
  const previewProgress = React.useRef(new Animated.Value(0)).current
  const timeoutsRef = React.useRef<number[]>([])

  React.useEffect(() => {
    let isMounted = true

    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(INTRO_STORAGE_KEY),
      AsyncStorage.getItem(MOTION_STORAGE_KEY),
      AsyncStorage.getItem(HAPTIC_STORAGE_KEY),
      AsyncStorage.getItem(CONTRAST_STORAGE_KEY),
      AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY),
      AsyncStorage.getItem(HINTS_STORAGE_KEY),
      AsyncStorage.getItem(CONFIRM_ACTIONS_STORAGE_KEY),
    ])
      .then(
        ([
          value,
          introSeen,
          motionValue,
          hapticValue,
          contrastValue,
          notificationsValue,
          hintsValue,
          confirmActionsValue,
        ]) => {
        if (!isMounted) return

        if (value === 'company' || value === 'material') {
          setModeState(value)
        }

        if (motionValue === 'full' || motionValue === 'standard' || motionValue === 'minimal') {
          setMotionIntensityState(motionValue)
        }

        if (hapticValue === 'soft' || hapticValue === 'normal' || hapticValue === 'expressive') {
          setHapticStrengthState(hapticValue)
        }

        if (contrastValue === 'balanced' || contrastValue === 'high') {
          setContrastModeState(contrastValue)
        }

        if (notificationsValue === 'true' || notificationsValue === 'false') {
          setNotificationsEnabledState(notificationsValue === 'true')
        }

        if (hintsValue === 'true' || hintsValue === 'false') {
          setHintsEnabledState(hintsValue === 'true')
        }

        if (confirmActionsValue === 'true' || confirmActionsValue === 'false') {
          setConfirmActionsEnabledState(confirmActionsValue === 'true')
        }

        setShouldShowIntro(introSeen !== 'true')
      })
      .finally(() => {
        if (isMounted) {
          setIsHydrating(false)
        }
      })

    return () => {
      isMounted = false
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId))
      timeoutsRef.current = []
    }
  }, [])

  React.useEffect(() => {
    setAndroidHapticStrength(hapticStrength)
  }, [hapticStrength])

  const setMode = React.useCallback(
    (nextMode: AndroidDesignMode) => {
      if (nextMode === mode || transitionPhase !== 'idle') {
        return
      }

      setTransitionTarget(nextMode)
      setTransitionOrigin(previewOrigin)
      setTransitionPhase('exiting')

      const exitTimeout = setTimeout(() => {
        setModeState(nextMode)
        AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => {})
        setTransitionPhase('entering')

        const enterTimeout = setTimeout(() => {
          setTransitionPhase('idle')
          setTransitionTarget(null)
          setTransitionOrigin(null)
        }, THEME_ENTER_MS)

        timeoutsRef.current.push(enterTimeout as unknown as number)
      }, THEME_EXIT_MS)

      timeoutsRef.current.push(exitTimeout as unknown as number)
    },
    [mode, previewOrigin, transitionPhase],
  )

  const beginPreview = React.useCallback(
    (nextMode: AndroidDesignMode, origin: AndroidThemeTransitionOrigin = null) => {
      setPreviewTarget(nextMode)
      setPreviewOrigin(origin)
      previewProgress.stopAnimation()
      previewProgress.setValue(0)
    },
    [previewProgress],
  )

  const clearPreview = React.useCallback(() => {
    previewProgress.stopAnimation()
    previewProgress.setValue(0)
    setPreviewTarget(null)
    setPreviewOrigin(null)
  }, [previewProgress])

  const completeIntro = React.useCallback((nextMode: AndroidDesignMode) => {
    setShouldShowIntro(false)
    setModeState(nextMode)
    AsyncStorage.multiSet([
      [STORAGE_KEY, nextMode],
      [INTRO_STORAGE_KEY, 'true'],
    ]).catch(() => {})
  }, [])

  const setMotionIntensity = React.useCallback((value: AndroidMotionIntensity) => {
    setMotionIntensityState(value)
    AsyncStorage.setItem(MOTION_STORAGE_KEY, value).catch(() => {})
  }, [])

  const setHapticStrength = React.useCallback((value: AndroidHapticStrength) => {
    setAndroidHapticStrength(value)
    setHapticStrengthState(value)
    AsyncStorage.setItem(HAPTIC_STORAGE_KEY, value).catch(() => {})
  }, [])

  const setContrastMode = React.useCallback((value: AndroidContrastMode) => {
    setContrastModeState(value)
    AsyncStorage.setItem(CONTRAST_STORAGE_KEY, value).catch(() => {})
  }, [])

  const setNotificationsEnabled = React.useCallback((value: boolean) => {
    setNotificationsEnabledState(value)
    AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, String(value)).catch(() => {})
  }, [])

  const setHintsEnabled = React.useCallback((value: boolean) => {
    setHintsEnabledState(value)
    AsyncStorage.setItem(HINTS_STORAGE_KEY, String(value)).catch(() => {})
  }, [])

  const setConfirmActionsEnabled = React.useCallback((value: boolean) => {
    setConfirmActionsEnabledState(value)
    AsyncStorage.setItem(CONFIRM_ACTIONS_STORAGE_KEY, String(value)).catch(() => {})
  }, [])

  return {
    mode,
    setMode,
    completeIntro,
    isHydrating,
    shouldShowIntro,
    transitionPhase,
    transitionTarget,
    transitionOrigin,
    previewTarget,
    previewOrigin,
    previewProgress,
    beginPreview,
    clearPreview,
    motionIntensity,
    setMotionIntensity,
    hapticStrength,
    setHapticStrength,
    contrastMode,
    setContrastMode,
    notificationsEnabled,
    setNotificationsEnabled,
    hintsEnabled,
    setHintsEnabled,
    confirmActionsEnabled,
    setConfirmActionsEnabled,
  }
}

export function AndroidThemeModeProvider({
  children,
  value,
}: React.PropsWithChildren<{ value: AndroidThemeContextValue }>) {
  return (
    <AndroidThemeContext.Provider value={value}>
      {children}
    </AndroidThemeContext.Provider>
  )
}

export function useAndroidThemeMode() {
  return React.useContext(AndroidThemeContext)
}
