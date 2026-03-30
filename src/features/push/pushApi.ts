import { PermissionsAndroid, Platform } from 'react-native'
import messaging, {
  AuthorizationStatus,
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging'
import { buildApiUrl } from '../../config/api'

export type PushPlatform = 'ios' | 'android'

function getPushPlatform(): PushPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android'
}

async function ensureAndroidNotificationPermission() {
  if (Platform.OS !== 'android') {
    return true
  }

  if (Platform.Version < 33) {
    return true
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  )

  return granted === PermissionsAndroid.RESULTS.GRANTED
}

async function ensureMessagingPermission() {
  if (Platform.OS === 'ios') {
    await messaging().registerDeviceForRemoteMessages()

    const status = await messaging().requestPermission()
    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    )
  }

  return ensureAndroidNotificationPermission()
}

export async function getDevicePushToken() {
  const isAllowed = await ensureMessagingPermission()
  if (!isAllowed) {
    return null
  }

  const token = String(await messaging().getToken()).trim()
  if (!token) {
    return null
  }

  return {
    token,
    platform: getPushPlatform(),
  }
}

export async function registerPushToken(employeeId: string, pushToken: string, platform: PushPlatform) {
  const res = await fetch(
    buildApiUrl(`/employees/${encodeURIComponent(employeeId)}/push-tokens/register`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform,
        push_token: pushToken,
      }),
    },
  )

  if (!res.ok) {
    throw new Error(`Push token register HTTP ${res.status}`)
  }

  return res.json()
}

export async function deactivatePushToken(employeeId: string, pushToken: string) {
  const res = await fetch(
    buildApiUrl(`/employees/${encodeURIComponent(employeeId)}/push-tokens/deactivate`),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        push_token: pushToken,
      }),
    },
  )

  if (!res.ok) {
    throw new Error(`Push token deactivate HTTP ${res.status}`)
  }

  return res.json()
}

export async function registerCurrentDevicePushToken(employeeId: string) {
  const pushInfo = await getDevicePushToken()
  if (!pushInfo) {
    return null
  }

  await registerPushToken(employeeId, pushInfo.token, pushInfo.platform)
  return pushInfo
}

export async function deactivateCurrentDevicePushToken(employeeId: string) {
  const token = String(await messaging().getToken()).trim()
  if (!token) {
    return null
  }

  await deactivatePushToken(employeeId, token)
  return token
}

export function subscribeToPushTokenRefresh(employeeId: string) {
  return messaging().onTokenRefresh(async nextToken => {
    const token = String(nextToken || '').trim()
    if (!token) {
      return
    }

    try {
      await registerPushToken(employeeId, token, getPushPlatform())
    } catch {}
  })
}

export function subscribeToForegroundPushMessages(
  onMessage: (message: FirebaseMessagingTypes.RemoteMessage) => void,
) {
  return messaging().onMessage(async remoteMessage => {
    onMessage(remoteMessage)
  })
}

export function subscribeToPushNotificationOpens(
  onOpen: (message: FirebaseMessagingTypes.RemoteMessage) => void,
) {
  return messaging().onNotificationOpenedApp(remoteMessage => {
    onOpen(remoteMessage)
  })
}

export async function getInitialPushNotification() {
  return messaging().getInitialNotification()
}
