import { NativeModules, PermissionsAndroid, Platform } from 'react-native'

type ShiftProgressNotificationNativeModule = {
  showOrUpdateShiftProgressNotification?: (
    title: string,
    body: string,
    progress: number,
    indeterminate: boolean,
  ) => void
  cancelShiftProgressNotification?: () => void
}

const nativeModule =
  NativeModules.ShiftProgressNotification as ShiftProgressNotificationNativeModule | undefined

function isAvailable() {
  return (
    Platform.OS === 'android'
    && !!nativeModule
    && typeof nativeModule.showOrUpdateShiftProgressNotification === 'function'
    && typeof nativeModule.cancelShiftProgressNotification === 'function'
  )
}

async function ensureNotificationPermission() {
  if (Platform.OS !== 'android') {
    return true
  }

  if (Platform.Version < 33) {
    return true
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    )
    return granted === PermissionsAndroid.RESULTS.GRANTED
  } catch {
    return false
  }
}

export function showOrUpdateShiftProgressNotification(
  title: string,
  body: string,
  progress: number,
  indeterminate = false,
) {
  void (async () => {
    if (!isAvailable()) {
      return
    }

    const allowed = await ensureNotificationPermission()
    if (!allowed) {
      return
    }

    const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)))
    nativeModule?.showOrUpdateShiftProgressNotification?.(
      title,
      body,
      normalizedProgress,
      indeterminate,
    )
  })()
}

export function cancelShiftProgressNotification() {
  if (!isAvailable()) {
    return
  }
  nativeModule?.cancelShiftProgressNotification?.()
}
