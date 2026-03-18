import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthUser } from '../auth/types'
import { shiftApi, type ShiftApi } from './shiftApi'
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

export function useShiftFlow(user: AuthUser, options: UseShiftFlowOptions = {}) {
  const api = options.api ?? shiftApi

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

  const actions = useMemo(
    () => ({
      async startOpening() {
        if (!canStartOpening) return

        setMode('opening')
        setOpenStep('shop')
        setNotice(null)
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
          setNotice(null)
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
    actions,
  }
}
