import { Platform } from 'react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AuthUser } from '../auth/types'
import { shiftApi, type ShiftApi } from './shiftApi'
import {
  cancelShiftProgressNotification,
  showOrUpdateShiftProgressNotification,
} from '../push/shiftProgressNotification'
import type {
  CloseFlowStep,
  OpenFlowStep,
  ShopOption,
  ShiftCloseDraft,
  ShiftFlowMode,
  ShiftOpenDraft,
  ShiftStatus,
} from './types'

const initialOpenDraft: ShiftOpenDraft = {
  shopId: null,
  shopName: null,
  openingReceiptPhotoId: '',
  uniformPhotoId: '',
  cashAtOpening: '',
}

const initialCloseDraft: ShiftCloseDraft = {
  revenueTotal: '',
  checksCount: '',
  cashlessPayment: '',
  sealNumber: '',
  cashDenomination: '',
  comment: '',
  closingReceiptPhotoId: '',
}

type UseShiftFlowOptions = {
  api?: ShiftApi
}

type RefreshOptions = {
  silent?: boolean
}

type CloseEditTarget = 'none' | 'revenue' | 'checksCount' | 'cashlessPayment' | 'cashDenomination'

const generatedSealNumbers = new Set<string>()
const DAY_SECONDS = 24 * 60 * 60
const formatterByTimezone = new Map<string, Intl.DateTimeFormat>()

function generateUniqueSealNumber() {
  for (let i = 0; i < 20; i += 1) {
    const value = String(Math.floor(100000000 + Math.random() * 900000000))
    if (!generatedSealNumbers.has(value)) {
      generatedSealNumbers.add(value)
      return value
    }
  }
  const fallback = String(Date.now()).slice(-9).padStart(9, '0')
  generatedSealNumbers.add(fallback)
  return fallback
}

function parseClockTimeToSeconds(value?: string | null) {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] || '0')
  if (
    !Number.isFinite(hours)
    || !Number.isFinite(minutes)
    || !Number.isFinite(seconds)
    || hours < 0
    || hours > 23
    || minutes < 0
    || minutes > 59
    || seconds < 0
    || seconds > 59
  ) {
    return null
  }
  return hours * 3600 + minutes * 60 + seconds
}

function getNowSecondsInTimezone(timezone: string) {
  try {
    let formatter = formatterByTimezone.get(timezone)
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
      formatterByTimezone.set(timezone, formatter)
    }

    const parts = formatter.formatToParts(new Date())
    const hour = Number(parts.find(part => part.type === 'hour')?.value ?? '0')
    const minute = Number(parts.find(part => part.type === 'minute')?.value ?? '0')
    const second = Number(parts.find(part => part.type === 'second')?.value ?? '0')

    if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) {
      return null
    }

    return hour * 3600 + minute * 60 + second
  } catch {
    return null
  }
}

function formatDuration(totalSeconds: number) {
  const normalized = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(normalized / 3600)
  const minutes = Math.floor((normalized % 3600) / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function buildShiftProgressPayload(args: {
  shopName?: string
  shopOpeningTime?: string
  shopClosingTime?: string
  regionTimezone?: string
}) {
  const openSec = parseClockTimeToSeconds(args.shopOpeningTime)
  const closeSec = parseClockTimeToSeconds(args.shopClosingTime)
  const timezone = String(args.regionTimezone || '').trim()

  if (openSec === null || closeSec === null || !timezone) {
    return null
  }

  let duration = closeSec - openSec
  if (duration <= 0) {
    duration += DAY_SECONDS
  }
  if (duration <= 0) {
    return null
  }

  const nowSec = getNowSecondsInTimezone(timezone)
  if (nowSec === null) {
    return null
  }

  let normalizedNow = nowSec
  if (closeSec <= openSec && nowSec < openSec) {
    normalizedNow += DAY_SECONDS
  }

  const elapsed = Math.max(0, Math.min(duration, normalizedNow - openSec))
  const progress = (elapsed / duration) * 100
  const remaining = Math.max(0, duration - elapsed)
  const title = args.shopName ? `Смена • ${args.shopName}` : 'Смена'
  const body =
    remaining > 0
      ? `До конца смены: ${formatDuration(remaining)}`
      : 'Смена близка к завершению'

  return {
    title,
    body,
    progress,
  }
}

export function useShiftFlow(user: AuthUser, options: UseShiftFlowOptions = {}) {
  const api = options.api ?? shiftApi
  const shiftEndPushKeyRef = useRef<string | null>(null)

  const [status, setStatus] = useState<ShiftStatus>({ openedShift: null })
  const [availableShops, setAvailableShops] = useState<ShopOption[]>([])
  const [mode, setMode] = useState<ShiftFlowMode>('idle')
  const [openStep, setOpenStep] = useState<OpenFlowStep>('shop')
  const [closeStep, setCloseStep] = useState<CloseFlowStep>('confirmShop')
  const [closeEditTarget, setCloseEditTarget] = useState<CloseEditTarget>('none')
  const [closeDraftBeforeEdit, setCloseDraftBeforeEdit] = useState<ShiftCloseDraft | null>(null)
  const [openDraft, setOpenDraft] = useState<ShiftOpenDraft>(initialOpenDraft)
  const [closeDraft, setCloseDraft] = useState<ShiftCloseDraft>(initialCloseDraft)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeVariant, setNoticeVariant] = useState<'success' | 'warning' | 'error' | 'info' | null>(null)

  const canStartOpening = mode === 'idle' && !status.openedShift
  const canStartClosing = mode === 'idle' && !!status.openedShift

  const resetOpenFlow = useCallback(() => {
    setOpenDraft(initialOpenDraft)
    setOpenStep('shop')
  }, [])

  const resetCloseFlow = useCallback(() => {
    setCloseDraft(initialCloseDraft)
    setCloseStep('confirmShop')
    setCloseEditTarget('none')
    setCloseDraftBeforeEdit(null)
  }, [])

  const cancelFlow = useCallback(() => {
    if (mode === 'closing' && closeEditTarget !== 'none') {
      if (closeDraftBeforeEdit) {
        setCloseDraft(closeDraftBeforeEdit)
      }
      setCloseStep('review')
      setCloseEditTarget('none')
      setCloseDraftBeforeEdit(null)
      setError(null)
      return
    }

    setMode('idle')
    resetOpenFlow()
    resetCloseFlow()
    setError(null)
    setNotice(null)
    setNoticeVariant(null)
  }, [closeDraftBeforeEdit, closeEditTarget, mode, resetCloseFlow, resetOpenFlow])

  const refresh = useCallback(async (refreshOptions: RefreshOptions = {}) => {
    const { silent = false } = refreshOptions

    if (!silent) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const [nextStatus, shops] = await Promise.all([
        api.getShiftStatus(user.id),
        api.getAvailableShops(user.id),
      ])

      setStatus(nextStatus)
      setAvailableShops(shops)
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Не удалось обновить данные смены'
      setError(message)
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [api, user.id])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const openedShift = status.openedShift

    if (!openedShift) {
      shiftEndPushKeyRef.current = null
      return
    }

    const key = `${openedShift.shopId ?? 'shop'}:${openedShift.openedAt || 'opened'}`
    if (shiftEndPushKeyRef.current === key) {
      return
    }

    shiftEndPushKeyRef.current = key
    void api.ensureShiftEndPush(user.id)
  }, [api, status.openedShift, user.id])

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return
    }

    const openedShift = status.openedShift
    if (!openedShift) {
      cancelShiftProgressNotification()
      return
    }

    let isActive = true

    const updateProgressNotification = async () => {
      const payload = buildShiftProgressPayload({
        shopName: openedShift.shopName,
        shopOpeningTime: openedShift.shopOpeningTime,
        shopClosingTime: openedShift.shopClosingTime,
        regionTimezone: openedShift.regionTimezone,
      })

      if (payload) {
        if (!isActive) return
        showOrUpdateShiftProgressNotification(payload.title, payload.body, payload.progress)
        return
      }

      const remotePayload = await api.getShiftEndPushPayload(user.id)
      if (!isActive) return

      if (!remotePayload || typeof remotePayload.progress !== 'number') {
        showOrUpdateShiftProgressNotification(
          openedShift.shopName ? `Смена • ${openedShift.shopName}` : 'Смена',
          'Идет смена',
          1,
          false,
        )
        return
      }

      const remainingMs = Number(remotePayload.remainingMs ?? 0)
      const remainingSec = remainingMs > 0 ? Math.floor(remainingMs / 1000) : 0
      const body =
        remainingSec > 0
          ? `До конца смены: ${formatDuration(remainingSec)}`
          : 'Смена близка к завершению'

      showOrUpdateShiftProgressNotification(
        remotePayload.shopName ? `Смена • ${remotePayload.shopName}` : 'Смена',
        body,
        remotePayload.progress,
      )
    }

    void updateProgressNotification()
    const intervalId = setInterval(() => {
      void updateProgressNotification()
    }, 30_000)

    return () => {
      isActive = false
      clearInterval(intervalId)
    }
  }, [api, status.openedShift, user.id])

  const actions = useMemo(
    () => ({
      async startOpening() {
        if (!canStartOpening) return

        setMode('opening')
        setOpenStep('shop')
        setNotice(null)
        setNoticeVariant(null)
        setError(null)

        try {
          await refresh({ silent: true })
        } catch {
          // refresh already sets error state
        }
      },

      startClosing() {
        if (!canStartClosing) return

        const nextSeal = generateUniqueSealNumber()
        setMode('closing')
        setCloseStep('confirmShop')
        setCloseEditTarget('none')
        setCloseDraftBeforeEdit(null)
        setCloseDraft(prev => ({ ...prev, sealNumber: nextSeal }))
        setNotice(null)
        setNoticeVariant(null)
        setError(null)
      },

      selectShop(shopId: number, shopName: string) {
        setOpenDraft(prev => ({ ...prev, shopId, shopName }))
        setOpenStep('openingReceipt')
        setError(null)
      },

      setOpeningReceiptPhotoId(value: string) {
        setOpenDraft(prev => ({ ...prev, openingReceiptPhotoId: value }))
      },

      setOpeningReceiptAndGoToUniform(value: string) {
        if (!value.trim()) {
          setError('Добавьте фото чека открытия.')
          return
        }

        setOpenDraft(prev => ({ ...prev, openingReceiptPhotoId: value }))
        setOpenStep('uniformPhoto')
        setError(null)
      },

      toUniformStep() {
        if (!openDraft.openingReceiptPhotoId.trim()) {
          setError('Добавьте ID/название фото чека открытия.')
          return
        }

        setOpenStep('uniformPhoto')
        setError(null)
      },

      setUniformPhotoId(value: string) {
        setOpenDraft(prev => ({ ...prev, uniformPhotoId: value }))
      },

      setUniformPhotoAndGoToCash(value: string) {
        if (!value.trim()) {
          setError('Добавьте фото формы.')
          return
        }

        setOpenDraft(prev => ({ ...prev, uniformPhotoId: value }))
        setOpenStep('cash')
        setError(null)
      },

      toCashStep() {
        if (!openDraft.uniformPhotoId.trim()) {
          setError('Добавьте ID/название фото формы.')
          return
        }

        setOpenStep('cash')
        setError(null)
      },

      setCashAtOpening(value: string) {
        setOpenDraft(prev => ({ ...prev, cashAtOpening: value }))
      },

      toOpenReview() {
        const cash = Number(openDraft.cashAtOpening.replace(',', '.'))

        if (!Number.isFinite(cash) || cash < 0) {
          setError('Введите корректную сумму размена (0 или больше).')
          return
        }

        setOpenStep('review')
        setError(null)
      },

      async submitOpenShift() {
        if (!openDraft.shopId || !openDraft.shopName) {
          setError('Сначала выберите магазин.')
          return
        }

        const cashAtOpening = Number(openDraft.cashAtOpening.replace(',', '.'))
        if (!Number.isFinite(cashAtOpening) || cashAtOpening < 0) {
          setError('Введите корректную сумму размена.')
          return
        }

        setIsSubmitting(true)
        setError(null)

        try {
          const nextStatus = await api.openShift(user.id, {
            shopId: openDraft.shopId,
            shopName: openDraft.shopName,
            openingReceiptPhotoId: openDraft.openingReceiptPhotoId.trim(),
            uniformPhotoId: openDraft.uniformPhotoId.trim(),
            cashAtOpening,
          })

          setStatus(nextStatus)
          setMode('idle')
          resetOpenFlow()
          setNotice(nextStatus.notice ?? null)
          setNoticeVariant(nextStatus.noticeVariant ?? null)
        } catch (requestError) {
          const message =
            requestError instanceof Error ? requestError.message : 'Не удалось открыть смену'
          setError(message)
        } finally {
          setIsSubmitting(false)
        }
      },

      confirmCloseShop(isConfirmed: boolean) {
        if (!isConfirmed) {
          setError('Если магазин выбран неверно, используйте кнопку сброса открытой смены.')
          return
        }

        setCloseStep('revenue')
        setError(null)
      },

      async resetWrongOpenedShop() {
        setIsSubmitting(true)
        setError(null)

        try {
          const nextStatus = await api.resetOpenedShift(user.id)
          setStatus(nextStatus)
          setMode('idle')
          resetCloseFlow()
          setNotice('Откройте смену в правильном магазине и повторите попытку.')
          setNoticeVariant('warning')
        } catch (requestError) {
          const message =
            requestError instanceof Error ? requestError.message : 'Не удалось сбросить открытую смену'
          setError(message)
        } finally {
          setIsSubmitting(false)
        }
      },

      setRevenueTotal(value: string) {
        setCloseDraft(prev => ({ ...prev, revenueTotal: value }))
      },

      toChecksCountStep() {
        const revenue = Number(closeDraft.revenueTotal.replace(',', '.'))
        const cashlessPayment = Number(closeDraft.cashlessPayment.replace(',', '.'))

        if (!Number.isFinite(revenue) || revenue <= 0) {
          setError('Введите корректную выручку.')
          return
        }

        if (
          closeEditTarget === 'revenue' &&
          Number.isFinite(cashlessPayment) &&
          cashlessPayment > revenue
        ) {
          setError('Сумма безналичного расчета не может быть больше суммы выручки.')
          return
        }

        if (closeEditTarget === 'revenue') {
          setCloseStep('review')
          setCloseEditTarget('none')
          setCloseDraftBeforeEdit(null)
        } else {
          setCloseStep('checksCount')
        }
        setError(null)
      },

      setChecksCount(value: string) {
        setCloseDraft(prev => ({ ...prev, checksCount: value }))
      },

      toCashlessPaymentStep() {
        const checksCount = Number(closeDraft.checksCount.replace(',', '.'))

        if (!Number.isFinite(checksCount) || checksCount <= 0 || !Number.isInteger(checksCount)) {
          setError('Введите корректное количество чеков (целое число больше 0).')
          return
        }

        if (closeEditTarget === 'checksCount') {
          setCloseStep('review')
          setCloseEditTarget('none')
          setCloseDraftBeforeEdit(null)
        } else {
          setCloseStep('cashlessPayment')
        }
        setError(null)
      },

      setCashlessPayment(value: string) {
        setCloseDraft(prev => ({ ...prev, cashlessPayment: value }))
      },

      toSealNumberStep() {
        const revenueTotal = Number(closeDraft.revenueTotal.replace(',', '.'))
        const cashlessPayment = Number(closeDraft.cashlessPayment.replace(',', '.'))

        if (!Number.isFinite(cashlessPayment) || cashlessPayment < 0) {
          setError('Введите корректную сумму по безналичному расчету.')
          return
        }

        if (Number.isFinite(revenueTotal) && cashlessPayment > revenueTotal) {
          setError('Сумма безналичного расчета не может быть больше суммы выручки.')
          return
        }

        if (closeEditTarget === 'cashlessPayment') {
          setCloseStep('review')
          setCloseEditTarget('none')
          setCloseDraftBeforeEdit(null)
        } else {
          setCloseStep('sealNumber')
        }
        setError(null)
      },

      toCashDenominationStep() {
        if (!/^\d{9}$/.test(closeDraft.sealNumber.trim())) {
          setError('Номер пломбы должен состоять из 9 цифр.')
          return
        }

        setCloseStep('cashDenomination')
        setError(null)
      },

      setCashDenomination(value: string) {
        setCloseDraft(prev => ({ ...prev, cashDenomination: value }))
      },

      toCommentStep() {
        const cashDenomination = Number(closeDraft.cashDenomination.replace(',', '.'))

        if (!Number.isFinite(cashDenomination) || cashDenomination < 0) {
          setError('Введите корректную сумму размена в кассе (0 или больше).')
          return
        }

        if (closeEditTarget === 'cashDenomination') {
          setCloseStep('review')
          setCloseEditTarget('none')
          setCloseDraftBeforeEdit(null)
        } else {
          setCloseStep('comment')
        }
        setError(null)
      },

      setComment(value: string) {
        setCloseDraft(prev => ({ ...prev, comment: value }))
      },

      toClosingReceiptStep() {
        setCloseStep('closingReceipt')
        setError(null)
      },

      setClosingReceiptPhotoId(value: string) {
        setCloseDraft(prev => ({ ...prev, closingReceiptPhotoId: value }))
      },

      setClosingReceiptAndGoToReview(value: string) {
        if (!value.trim()) {
          setError('Добавьте фото чека закрытия.')
          return
        }

        setCloseDraft(prev => ({ ...prev, closingReceiptPhotoId: value }))
        setCloseStep('review')
        setError(null)
      },

      toCloseReview() {
        if (!closeDraft.closingReceiptPhotoId.trim()) {
          setError('Добавьте ID/название фото чека закрытия.')
          return
        }

        setCloseStep('review')
        setError(null)
      },

      editCloseRevenue() {
        setCloseDraftBeforeEdit(closeDraft)
        setCloseEditTarget('revenue')
        setCloseDraft(prev => ({ ...prev, revenueTotal: '' }))
        setCloseStep('revenue')
        setError(null)
      },

      editCloseChecksCount() {
        setCloseDraftBeforeEdit(closeDraft)
        setCloseEditTarget('checksCount')
        setCloseDraft(prev => ({ ...prev, checksCount: '' }))
        setCloseStep('checksCount')
        setError(null)
      },

      editCloseCashlessPayment() {
        setCloseDraftBeforeEdit(closeDraft)
        setCloseEditTarget('cashlessPayment')
        setCloseDraft(prev => ({ ...prev, cashlessPayment: '' }))
        setCloseStep('cashlessPayment')
        setError(null)
      },

      editCloseCashDenomination() {
        setCloseDraftBeforeEdit(closeDraft)
        setCloseEditTarget('cashDenomination')
        setCloseDraft(prev => ({ ...prev, cashDenomination: '' }))
        setCloseStep('cashDenomination')
        setError(null)
      },

      async submitCloseShift() {
        const revenueTotal = Number(closeDraft.revenueTotal.replace(',', '.'))
        const checksCount = Number(closeDraft.checksCount.replace(',', '.'))
        const cashlessPayment = Number(closeDraft.cashlessPayment.replace(',', '.'))
        const cashDenomination = Number(closeDraft.cashDenomination.replace(',', '.'))
        const sealNumber = closeDraft.sealNumber.trim()

        if (!Number.isFinite(revenueTotal) || revenueTotal <= 0) {
          setError('Введите корректную выручку.')
          return
        }

        if (!Number.isFinite(checksCount) || checksCount <= 0 || !Number.isInteger(checksCount)) {
          setError('Введите корректное количество чеков (целое число больше 0).')
          return
        }

        if (!Number.isFinite(cashlessPayment) || cashlessPayment < 0) {
          setError('Введите корректную сумму по безналичному расчету.')
          return
        }

        if (cashlessPayment > revenueTotal) {
          setError('Сумма безналичного расчета не может быть больше суммы выручки.')
          return
        }

        if (!/^\d{9}$/.test(sealNumber)) {
          setError('Номер пломбы должен состоять из 9 цифр.')
          return
        }

        if (!Number.isFinite(cashDenomination) || cashDenomination < 0) {
          setError('Введите корректную сумму размена в кассе (0 или больше).')
          return
        }

        if (!closeDraft.closingReceiptPhotoId.trim()) {
          setError('Добавьте фото чека закрытия.')
          return
        }

        setIsSubmitting(true)
        setError(null)

        try {
          const nextStatus = await api.closeShift(user.id, {
            revenueTotal,
            checksCount,
            cashlessPayment,
            sealNumber,
            cashDenomination,
            comment: closeDraft.comment.trim(),
            closingReceiptPhotoId: closeDraft.closingReceiptPhotoId.trim(),
          })

          setStatus(nextStatus)
          setMode('idle')
          resetCloseFlow()
          setNotice('Смена успешно закрыта.')
          setNoticeVariant('success')
        } catch (requestError) {
          const message =
            requestError instanceof Error ? requestError.message : 'Не удалось закрыть смену'
          setError(message)
        } finally {
          setIsSubmitting(false)
        }
      },

      clearNotice() {
        setNotice(null)
        setNoticeVariant(null)
      },

      clearError() {
        setError(null)
      },

      cancelFlow,
      refresh,
    }),
    [
      api,
      canStartClosing,
      canStartOpening,
      cancelFlow,
      closeDraft,
      closeEditTarget,
      openDraft.cashAtOpening,
      openDraft.openingReceiptPhotoId,
      openDraft.shopId,
      openDraft.shopName,
      openDraft.uniformPhotoId,
      refresh,
      resetCloseFlow,
      resetOpenFlow,
      user.id,
    ]
  )

  return {
    mode,
    openStep,
    closeStep,
    closeEditTarget,
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
    noticeVariant,
    actions,
  }
}
