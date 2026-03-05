import React from 'react'
import {
  Alert,
  ActivityIndicator,
  Image,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { launchCamera } from 'react-native-image-picker'
import type { AuthSession } from '../features/auth/types'
import { useShiftFlow } from '../features/shift/useShiftFlow'
import { styles } from './ShiftScreen.styles'

type ShiftScreenProps = {
  session: AuthSession
  onLogout: () => void
  onBack?: () => void
}

function formatDateTime(value?: string) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

async function ensureCameraPermission() {
  if (Platform.OS !== 'android') {
    return true
  }

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA)
  return granted === PermissionsAndroid.RESULTS.GRANTED
}

async function takePhoto(onSuccess: (uri: string) => void) {
  try {
    const hasPermission = await ensureCameraPermission()
    if (!hasPermission) {
      Alert.alert('Нет доступа к камере', 'Разрешите доступ к камере в настройках устройства.')
      return
    }

    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'back',
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

export default function ShiftScreen({ session, onLogout, onBack }: ShiftScreenProps) {
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Привет, {displayName}</Text>
          <Text style={styles.subtitle}>
            После входа здесь повторяется основной flow бота: открытие и закрытие смены.
          </Text>

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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Статус смены</Text>

          <View style={status.openedShift ? styles.badgeOpen : styles.badgeClosed}>
            <Text style={styles.badgeText}>
              {status.openedShift ? 'Смена открыта' : 'Смена закрыта'}
            </Text>
          </View>

          <Text style={styles.subtitle}>Магазин: {status.openedShift?.shopName ?? '-'}</Text>
          <Text style={styles.subtitle}>Открыта: {formatDateTime(status.openedShift?.openedAt)}</Text>

          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.button, !canStartOpening && styles.buttonDisabled]}
              onPress={actions.startOpening}
              disabled={!canStartOpening || isSubmitting || isLoading}>
              <Text style={styles.buttonText}>Открыть смену</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonSecondary,
                !canStartClosing && styles.buttonDisabled,
              ]}
              onPress={actions.startClosing}
              disabled={!canStartClosing || isSubmitting || isLoading}>
              <Text style={styles.buttonText}>Закрыть смену</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={actions.refresh}
            disabled={isSubmitting || isLoading}>
            <Text style={styles.buttonText}>Обновить данные</Text>
          </TouchableOpacity>
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
              <View style={styles.stack}>
                <Text style={styles.subtitle}>С какого магазина отчёт?</Text>
                {availableShops.map(shop => (
                  <TouchableOpacity
                    key={shop}
                    style={[
                      styles.shopButton,
                      openDraft.shopName === shop && styles.shopButtonActive,
                    ]}
                    onPress={() => actions.selectShop(shop)}>
                    <Text style={styles.shopButtonText}>{shop}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {openStep === 'openingReceipt' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Сфотографируйте чек открытия.</Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => takePhoto(actions.setOpeningReceiptPhotoId)}
                  disabled={isSubmitting}>
                  <Text style={styles.buttonText}>
                    {openDraft.openingReceiptPhotoId ? 'Переснять чек' : 'Сфотографировать чек'}
                  </Text>
                </TouchableOpacity>
                {openDraft.openingReceiptPhotoId ? (
                  <Image
                    source={{ uri: openDraft.openingReceiptPhotoId }}
                    style={styles.photoPreview}
                  />
                ) : (
                  <Text style={styles.smallText}>Фото пока не добавлено.</Text>
                )}
                <TouchableOpacity style={styles.button} onPress={actions.toUniformStep}>
                  <Text style={styles.buttonText}>Дальше</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {openStep === 'uniformPhoto' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Сфотографируйте форму.</Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => takePhoto(actions.setUniformPhotoId)}
                  disabled={isSubmitting}>
                  <Text style={styles.buttonText}>
                    {openDraft.uniformPhotoId ? 'Переснять фото формы' : 'Сфотографировать форму'}
                  </Text>
                </TouchableOpacity>
                {openDraft.uniformPhotoId ? (
                  <Image source={{ uri: openDraft.uniformPhotoId }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.smallText}>Фото пока не добавлено.</Text>
                )}
                <TouchableOpacity style={styles.button} onPress={actions.toCashStep}>
                  <Text style={styles.buttonText}>Дальше</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {openStep === 'cash' ? (
              <View style={styles.stack}>
                <Text style={styles.subtitle}>Введите сумму размена на открытии.</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="#7A7A7A"
                  keyboardType="decimal-pad"
                  value={openDraft.cashAtOpening}
                  onChangeText={actions.setCashAtOpening}
                  editable={!isSubmitting}
                />
                <TouchableOpacity style={styles.button} onPress={actions.toOpenReview}>
                  <Text style={styles.buttonText}>Проверить отчёт</Text>
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
    </View>
  )
}
