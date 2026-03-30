import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import ElasticScrollView from '../components/ElasticScrollView'
import type { AuthSession } from '../features/auth/types'

type RolePlaceholderHomeScreenProps = {
  session: AuthSession
  role?: number
  isRefreshing?: boolean
  onRefresh?: () => Promise<void>
  onGoProfile?: () => void
}

export default function RolePlaceholderHomeScreen({
  session,
  role,
  isRefreshing = false,
  onRefresh,
  onGoProfile,
}: RolePlaceholderHomeScreenProps) {
  const insets = useSafeAreaInsets()
  const profileLetter = (session.user.email?.trim()?.charAt(0) || 'П').toUpperCase()

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.container}>
        <View pointerEvents="box-none" style={styles.iosFloatingHeaderWrap}>
          <View
            style={[
              styles.tabHeaderContainer,
              styles.iosFloatingHeaderContainer,
              { paddingTop: insets.top + 25 },
            ]}>
            <View style={[styles.tabHeaderRow, styles.tabHeaderRowIosOnly, styles.iosFloatingHeaderRow]}>
              <TouchableOpacity
                style={styles.headerAvatarButton}
                onPress={onGoProfile}
                accessibilityRole="button"
                accessibilityLabel="Открыть профиль">
                <Text style={styles.headerAvatarText}>{profileLetter}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ElasticScrollView
          contentContainerStyle={styles.content}
          enableTopElastic={false}
          enableBottomElastic
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                onRefresh?.().catch(() => {})
              }}
              tintColor="#FFFFFF"
            />
          }>
          <Text style={styles.title}>Главный экран для этой роли</Text>
          <Text style={styles.subtitle}>
            Пока здесь будет отдельный сценарий для роли {Number.isFinite(Number(role)) ? role : '—'}.
          </Text>
        </ElasticScrollView>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <TouchableOpacity
          style={styles.headerAvatarButton}
          onPress={onGoProfile}
          accessibilityRole="button"
          accessibilityLabel="Открыть профиль">
          <Text style={styles.headerAvatarText}>{profileLetter}</Text>
        </TouchableOpacity>
      </View>
      <ElasticScrollView
        contentContainerStyle={styles.content}
        enableTopElastic={false}
        enableBottomElastic
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              onRefresh?.().catch(() => {})
            }}
            tintColor="#FFFFFF"
          />
        }>
        <Text style={styles.title}>Главный экран для этой роли</Text>
        <Text style={styles.subtitle}>
          Пока здесь будет отдельный сценарий для роли {Number.isFinite(Number(role)) ? role : '—'}.
        </Text>
      </ElasticScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 4,
  },
  tabHeaderContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  tabHeaderRow: {
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tabHeaderRowIosOnly: {
    justifyContent: 'flex-end',
  },
  iosFloatingHeaderWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  iosFloatingHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  iosFloatingHeaderRow: {
    minHeight: 56,
  },
  headerSpacer: {
    width: Platform.OS === 'android' ? 48 : 38,
    height: Platform.OS === 'android' ? 48 : 38,
  },
  headerAvatarButton: {
    width: Platform.OS === 'android' ? 48 : 38,
    height: Platform.OS === 'android' ? 48 : 38,
    borderRadius: Platform.OS === 'android' ? 24 : 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerAvatarText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'android' ? 18 : 16,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Platform.OS === 'android' ? 18 : 20,
    gap: 10,
    paddingVertical: 32,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#8F8F8F',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
})
