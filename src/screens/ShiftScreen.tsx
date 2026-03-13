import React from 'react'
import {
  Alert,
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Image,
  Modal,
  PermissionsAndroid,
  Pressable,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { launchCamera } from 'react-native-image-picker'
import type { AuthSession } from '../features/auth/types'
import { useShiftFlow } from '../features/shift/useShiftFlow'
import { styles } from './ShiftScreen.styles'
import LiquidTabBar from '../components/LiquidTabBar'
import type { TabKey } from '../components/LiquidTabBar'

type ShiftScreenProps = {
  session: AuthSession
  onLogout: () => void
  onBack?: () => void
  onGoHome?: () => void
  onGoMail?: () => void
  onGoTrash?: () => void
  onGoProfile?: () => void
  activeTab?: TabKey
  showHeaderActions?: boolean
  showTabBar?: boolean
}

const homeIcon = require('../assets/icons/home.png')
const profileIcon = require('../assets/icons/profile.png')
const mailIcon = require('../assets/icons/mail.png')
const trashIcon = require('../assets/icons/trash.png')

function formatDateTime(value?: string) {
  if (!value) return '-'

  const mysqlDateTimeMatch = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(:\d{2})?$/)
  if (mysqlDateTimeMatch) {
    const [, year, month, day, hour, minute] = mysqlDateTimeMatch
    return `${day}.${month}.${year}, ${hour}:${minute}`
  }

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatTodayLabel(timezone?: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone: timezone || undefined,
  }).format(new Date())
}

async function ensureCameraPermission() {
  if (Platform.OS !== 'android') {
    return true
  }

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
  return granted === PermissionsAndroid.RESULTS.GRANTED
}

async function takePhoto(
  onSuccess: (uri: string) => void,
  cameraType: 'back' | 'front' = 'back',
) {
  try {
    const hasPermission = await ensureCameraPermission()
    if (!hasPermission) {
      Alert.alert('Нет доступа к камере', 'Разрешите доступ к камере в настройках устройства.')
      return
    }

    const result = await launchCamera({
      mediaType: 'photo',
      cameraType,
      quality: 0.7,
      saveToPhotos: false,
    })

    if (result.didCancel) return

    if (result.errorCode) {
      Alert.alert('Ошибка камеры', result.errorMessage || 'Не удалось сделать фото')
      return
    }

    const uri = result.assets?.[0]?.uri

    if (!uri) {
      Alert.alert('Ошибка', 'Фото не получено')
      return
    }

    onSuccess(uri)
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes('launchCamera')
        ? 'Модуль камеры не подключен в сборке. Пересоберите приложение после установки react-native-image-picker.'
        : 'Не удалось открыть камеру.'

    Alert.alert('Ошибка камеры', message)
  }
}

export default function ShiftScreen({
  session,
  onLogout,
  onBack,
  onGoHome,
  onGoMail,
  onGoTrash,
  onGoProfile,
  activeTab = 'home',
  showHeaderActions = true,
  showTabBar = true,
}: ShiftScreenProps) {
  const [isShopDropdownOpen, setIsShopDropdownOpen] = React.useState(false)
  const cashAccessoryId = 'shift-cash-accessory'

  const {
    mode,
    openStep,
    closeStep,
    status,
    availableShops,
    openDraft,
    closeDraft,
    canStartOpening,
    canStartClosing,
    isLoading,
    isSubmitting,
    error,
    notice,
    actions,
  } = useShiftFlow(session.user)

  const fullName = [session.user.name, session.user.lastName].filter(Boolean).join(' ')
  const displayName = fullName || session.user.email
  const todayLabel = `Сегодня, ${formatTodayLabel(session.user.timezone)}`
  const profileLetter = (session.user.email?.trim()?.charAt(0) || 'П').toUpperCase()
  const shiftShopDisplay = status.openedShift?.shopName
  const shiftOpenedAtDisplay = status.openedShift
    ? formatDateTime(status.openedShift.openedAt)
    : null

  const switchTab = React.useCallback(
    (nextTab: TabKey) => {
      if (nextTab === 'home') {
        onGoHome?.()
        return
      }
      if (nextTab === 'mail') {
        onGoMail?.()
        return
      }
      if (nextTab === 'trash') {
        onGoTrash?.()
        return
      }
      onGoProfile?.()
    },
    [onGoHome, onGoMail, onGoProfile, onGoTrash],
  )

  React.useEffect(() => {
    if (openStep !== 'shop') {
      setIsShopDropdownOpen(false)
    }
  }, [openStep])

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onScrollBeginDrag={Keyboard.dismiss}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{todayLabel}</Text>

          <TouchableOpacity
            style={styles.headerAvatarButton}
            onPress={onGoProfile ?? onBack}
            accessibilityRole="button"
            accessibilityLabel="Открыть профиль">
            <Text style={styles.headerAvatarText}>{profileLetter}</Text>
          </TouchableOpacity>
        </View>

        {showHeaderActions ? (
          <View style={styles.greetingBlock}>
            <Text style={styles.subtitle}>Сотрудник: {displayName}</Text>
            {onBack ? (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={onBack}
                disabled={isSubmitting || isLoading}>
                <Text style={styles.buttonText}>Назад</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onLogout}
              disabled={isSubmitting || isLoading}>
              <Text style={styles.buttonText}>Выйти</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Информация о сменах</Text>

          <View style={status.openedShift ? styles.badgeOpen : styles.badgeClosed}>
            <Text style={styles.badgeText}>
              {status.openedShift ? 'Смена открыта' : 'Смена закрыта'}
            </Text>
          </View>

          {status.openedShift ? (
            <>
              <Text style={styles.subtitle}>Магазин: {shiftShopDisplay}</Text>
              <Text style={styles.subtitle}>Открытие: {shiftOpenedAtDisplay}</Text>
            </>
          ) : null}

          {!status.openedShift ? (
            <Text style={styles.smallText}>Сейчас смена закрыта. Нажмите «Открыть смену» для старта.</Text>
          ) : null}

          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.rowButton,
                !canStartOpening && styles.buttonSecondary,
                !canStartOpening && styles.buttonDisabled,
              ]}
              onPress={actions.startOpening}
              disabled={!canStartOpening || isSubmitting || isLoading}>
              <Text style={styles.buttonText}>Открыть смену</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.rowButton,
                !canStartClosing && styles.buttonSecondary,
                !canStartClosing && styles.buttonDisabled,
              ]}
              onPress={actions.startClosing}
              disabled={!canStartClosing || isSubmitting || isLoading}>
              <Text style={styles.buttonText}>Закрыть смену</Text>
            </TouchableOpacity>
          </View>

        </View>

        {isLoading ? (
          <View style={styles.card}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : null}

        {error ? (
          <View style={styles.alertError}>
            <Text style={styles.alertText}>{error}</Text>
          </View>
        ) : null}

        {notice ? (
          <TouchableOpacity style={styles.alertNotice} onPress={actions.clearNotice}>
            <Text style={styles.alertText}>{notice}</Text>
          </TouchableOpacity>
        ) : null}

        {mode === 'opening' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Открытие смены</Text>

            {openStep === 'shop' ? (
              <View style={[styles.stack, styles.shopStepContainer]}>
                <Text style={styles.subtitle}>С какого магазина отчёт?</Text>
                <TouchableOpacity
                  style={[
                    styles.shopSelectTrigger,
                    isShopDropdownOpen && styles.shopSelectTriggerActive,
                  ]}
                  onPress={() => setIsShopDropdownOpen(prev => !prev)}
                  disabled={isSubmitting}>
                  <Text
                    style={[
                      styles.shopSelectTriggerText,
                      openDraft.shopId ? styles.shopSelectTriggerTextActive : null,
                    ]}>
                    {openDraft.shopName || 'Выберите магазин'}
                  </Text>
                  <Text style={styles.shopSelectChevron}>{isShopDropdownOpen ? '▴' : '▾'}</Text>
                </TouchableOpacity>

              </View>
            ) : null}

            {openStep === 'openingReceipt' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Сфотографируйте чек открытия.</Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() =>
                    takePhoto(uri => {
                      actions.setOpeningReceiptAndGoToUniform(uri)
                    })
                  }
                  disabled={isSubmitting}>
                  <Text style={styles.buttonText}>Сфотографировать чек</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {openStep === 'uniformPhoto' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Сфотографируйте форму.</Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() =>
                    takePhoto(uri => {
                      actions.setUniformPhotoAndGoToCash(uri)
                    }, 'front')
                  }
                  disabled={isSubmitting}>
                  <Text style={styles.buttonText}>Сфотографировать форму</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {openStep === 'cash' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Введите сумму размена в кассе.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#7A7A7A"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={Keyboard.dismiss}
                  inputAccessoryViewID={Platform.OS === 'ios' ? cashAccessoryId : undefined}
                  value={openDraft.cashAtOpening}
                  onChangeText={actions.setCashAtOpening}
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={[styles.button, isSubmitting && styles.buttonDisabled]}
                  onPress={actions.submitOpenShift}
                  disabled={isSubmitting}>
                  <Text style={styles.buttonText}>
                    {isSubmitting ? 'Отправка...' : 'Отправить отчёт'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {openStep === 'review' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Проверьте данные перед отправкой.</Text>
                <Text style={styles.smallText}>Магазин: {openDraft.shopName}</Text>
                <Text style={styles.smallText}>Чек открытия: {openDraft.openingReceiptPhotoId}</Text>
                <Text style={styles.smallText}>Фото формы: {openDraft.uniformPhotoId}</Text>
                <Text style={styles.smallText}>Размен: {openDraft.cashAtOpening}</Text>

                <TouchableOpacity
                  style={[styles.button, isSubmitting && styles.buttonDisabled]}
                  onPress={actions.submitOpenShift}
                  disabled={isSubmitting}>
                  <Text style={styles.buttonText}>
                    {isSubmitting ? 'Отправка...' : 'Открыть смену'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={actions.cancelFlow}
              disabled={isSubmitting}>
              <Text style={styles.buttonText}>Отменить</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {mode === 'closing' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Закрытие смены</Text>

            {closeStep === 'confirmShop' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>
                  Вы открывали магазин: {status.openedShift?.shopName ?? '-'}. Подтверждаете?
                </Text>

                <TouchableOpacity style={styles.button} onPress={() => actions.confirmCloseShop(true)}>
                  <Text style={styles.buttonText}>Уверен</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.buttonDanger]}
                  onPress={actions.resetWrongOpenedShop}
                  disabled={isSubmitting}>
                  <Text style={styles.buttonText}>Неправильно открыл смену</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {closeStep === 'revenue' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Введите общую сумму выручки.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#7A7A7A"
                  keyboardType="decimal-pad"
                  value={closeDraft.revenueTotal}
                  onChangeText={actions.setRevenueTotal}
                  editable={!isSubmitting}
                />
                <TouchableOpacity style={styles.button} onPress={actions.toAverageCheckStep}>
                  <Text style={styles.buttonText}>Дальше</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {closeStep === 'averageCheck' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Введите средний чек.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#7A7A7A"
                  keyboardType="decimal-pad"
                  value={closeDraft.averageCheck}
                  onChangeText={actions.setAverageCheck}
                  editable={!isSubmitting}
                />
                <TouchableOpacity style={styles.button} onPress={actions.toCommentStep}>
                  <Text style={styles.buttonText}>Дальше</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {closeStep === 'comment' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Комментарий для сменщика (опционально).</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Комментарий"
                  placeholderTextColor="#7A7A7A"
                  value={closeDraft.comment}
                  onChangeText={actions.setComment}
                  editable={!isSubmitting}
                />
                <TouchableOpacity style={styles.button} onPress={actions.toClosingReceiptStep}>
                  <Text style={styles.buttonText}>Дальше</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {closeStep === 'closingReceipt' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Введите ID/название фото чека закрытия.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Например: close-2026-03-01-001"
                  placeholderTextColor="#7A7A7A"
                  value={closeDraft.closingReceiptPhotoId}
                  onChangeText={actions.setClosingReceiptPhotoId}
                  editable={!isSubmitting}
                />
                <TouchableOpacity style={styles.button} onPress={actions.toCloseReview}>
                  <Text style={styles.buttonText}>Проверить отчёт</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {closeStep === 'review' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Проверьте отчёт перед отправкой.</Text>
                <Text style={styles.smallText}>Магазин: {status.openedShift?.shopName}</Text>
                <Text style={styles.smallText}>Выручка: {closeDraft.revenueTotal}</Text>
                <Text style={styles.smallText}>Средний чек: {closeDraft.averageCheck}</Text>
                <Text style={styles.smallText}>Комментарий: {closeDraft.comment || '-'}</Text>
                <Text style={styles.smallText}>Чек закрытия: {closeDraft.closingReceiptPhotoId}</Text>

                <TouchableOpacity
                  style={[styles.button, isSubmitting && styles.buttonDisabled]}
                  onPress={actions.submitCloseShift}
                  disabled={isSubmitting}>
                  <Text style={styles.buttonText}>
                    {isSubmitting ? 'Отправка...' : 'Закрыть смену'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={actions.cancelFlow}
              disabled={isSubmitting}>
              <Text style={styles.buttonText}>Отменить</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        </ScrollView>

        <Modal
          visible={isShopDropdownOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setIsShopDropdownOpen(false)}>
          <Pressable style={styles.shopModalOverlay} onPress={() => setIsShopDropdownOpen(false)}>
            <Pressable style={styles.shopModalCard} onPress={() => {}}>
              <Text style={styles.shopModalTitle}>Выберите магазин</Text>
              <ScrollView
                style={styles.shopDropdownScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator>
                {availableShops.map(shop => (
                  <TouchableOpacity
                    key={shop.id}
                    style={[
                      styles.shopOptionRow,
                      openDraft.shopId === shop.id && styles.shopOptionRowActive,
                    ]}
                    onPress={() => {
                      actions.selectShop(shop.id, shop.name)
                      setIsShopDropdownOpen(false)
                    }}>
                    <Text
                      style={[
                        styles.shopOptionText,
                        openDraft.shopId === shop.id && styles.shopOptionTextActive,
                      ]}>
                      {shop.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={cashAccessoryId}>
            <View style={styles.keyboardAccessory}>
              <TouchableOpacity onPress={Keyboard.dismiss} style={styles.keyboardAccessoryButton}>
                <Text style={styles.keyboardAccessoryText}>Готово</Text>
              </TouchableOpacity>
            </View>
          </InputAccessoryView>
        ) : null}
      </KeyboardAvoidingView>

      {showTabBar ? (
        <LiquidTabBar
          activeTab={activeTab}
          onTabChange={switchTab}
          homeIcon={homeIcon}
          profileIcon={profileIcon}
          mailIcon={mailIcon}
          trashIcon={trashIcon}
        />
      ) : null}
      </View>
    </SafeAreaView>
  )
}
