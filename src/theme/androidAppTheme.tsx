import AsyncStorage from '@react-native-async-storage/async-storage'
import React from 'react'

export type AndroidDesignMode = 'material' | 'company'
export type AndroidThemeTransitionPhase = 'idle' | 'exiting' | 'entering'

type AndroidThemeContextValue = {
  mode: AndroidDesignMode
  setMode: (mode: AndroidDesignMode) => void
  completeIntro: (mode: AndroidDesignMode) => void
  isHydrating: boolean
  shouldShowIntro: boolean
  transitionPhase: AndroidThemeTransitionPhase
}

const STORAGE_KEY = 'android_design_mode_v1'
const INTRO_STORAGE_KEY = 'android_design_intro_seen_v2'
const THEME_EXIT_MS = 280
const THEME_ENTER_MS = 420

const AndroidThemeContext = React.createContext<AndroidThemeContextValue>({
  mode: 'material',
  setMode: () => {},
  completeIntro: () => {},
  isHydrating: true,
  shouldShowIntro: false,
  transitionPhase: 'idle',
})

export function useAndroidThemeModeState(): AndroidThemeContextValue {
  const [mode, setModeState] = React.useState<AndroidDesignMode>('material')
  const [isHydrating, setIsHydrating] = React.useState(true)
  const [shouldShowIntro, setShouldShowIntro] = React.useState(false)
  const [transitionPhase, setTransitionPhase] =
    React.useState<AndroidThemeTransitionPhase>('idle')
  const timeoutsRef = React.useRef<number[]>([])

  React.useEffect(() => {
    let isMounted = true

    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(INTRO_STORAGE_KEY),
    ])
      .then(([value, introSeen]) => {
        if (!isMounted) return

        if (value === 'company' || value === 'material') {
          setModeState(value)
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

  const setMode = React.useCallback(
    (nextMode: AndroidDesignMode) => {
      if (nextMode === mode || transitionPhase !== 'idle') {
        return
      }

      setTransitionPhase('exiting')

      const exitTimeout = setTimeout(() => {
        setModeState(nextMode)
        AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => {})
        setTransitionPhase('entering')

        const enterTimeout = setTimeout(() => {
          setTransitionPhase('idle')
        }, THEME_ENTER_MS)

        timeoutsRef.current.push(enterTimeout as unknown as number)
      }, THEME_EXIT_MS)

      timeoutsRef.current.push(exitTimeout as unknown as number)
    },
    [mode, transitionPhase],
  )

  const completeIntro = React.useCallback((nextMode: AndroidDesignMode) => {
    setShouldShowIntro(false)
    setModeState(nextMode)
    AsyncStorage.multiSet([
      [STORAGE_KEY, nextMode],
      [INTRO_STORAGE_KEY, 'true'],
    ]).catch(() => {})
  }, [])

  return {
    mode,
    setMode,
    completeIntro,
    isHydrating,
    shouldShowIntro,
    transitionPhase,
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
