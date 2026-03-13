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
  averageCheck: '',
  comment: '',
  closingReceiptPhotoId: '',
}

type UseShiftFlowOptions = {
  api?: ShiftApi
}

type RefreshOptions = {
  silent?: boolean
}

export function useShiftFlow(user: AuthUser, options: UseShiftFlowOptions = {}) {
  const api = options.api ?? shiftApi

  const [status, setStatus] = useState<ShiftStatus>({ openedShift: null })
  const [availableShops, setAvailableShops] = useState<ShopOption[]>([])
  const [mode, setMode] = useState<ShiftFlowMode>('idle')
  const [openStep, setOpenStep] = useState<OpenFlowStep>('shop')
  const [closeStep, setCloseStep] = useState<CloseFlowStep>('confirmShop')
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
  }, [])

  const cancelFlow = useCallback(() => {
    setMode('idle')
    resetOpenFlow()
    resetCloseFlow()
    setError(null)
    setNotice('Действие отменено.')
  }, [resetCloseFlow, resetOpenFlow])

  const refresh = useCallback(async (options: RefreshOptions = {}) => {
    const { silent = false } = options

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
      startOpening() {
        if (!canStartOpening) return

        setMode('opening')
        setOpenStep('shop')
        setNotice(null)
        setError(null)
      },

      startClosing() {
        if (!canStartClosing) return

        setMode('closing')
        setCloseStep('confirmShop')
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
          setNotice('Смена успешно открыта.')
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
          setNotice('Открытая смена сброшена. Откройте смену в правильном магазине.')
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

      toAverageCheckStep() {
        const revenue = Number(closeDraft.revenueTotal.replace(',', '.'))

        if (!Number.isFinite(revenue) || revenue <= 0) {
          setError('Введите корректную выручку.')
          return
        }

        setCloseStep('averageCheck')
        setError(null)
      },

      setAverageCheck(value: string) {
        setCloseDraft(prev => ({ ...prev, averageCheck: value }))
      },

      toCommentStep() {
        const averageCheck = Number(closeDraft.averageCheck.replace(',', '.'))

        if (!Number.isFinite(averageCheck) || averageCheck <= 0) {
          setError('Введите корректный средний чек.')
          return
        }

        setCloseStep('comment')
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

      toCloseReview() {
        if (!closeDraft.closingReceiptPhotoId.trim()) {
          setError('Добавьте ID/название фото чека закрытия.')
          return
        }

        setCloseStep('review')
        setError(null)
      },

      async submitCloseShift() {
        const revenueTotal = Number(closeDraft.revenueTotal.replace(',', '.'))
        const averageCheck = Number(closeDraft.averageCheck.replace(',', '.'))

        if (!Number.isFinite(revenueTotal) || revenueTotal <= 0) {
          setError('Введите корректную выручку.')
          return
        }

        if (!Number.isFinite(averageCheck) || averageCheck <= 0) {
          setError('Введите корректный средний чек.')
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
            averageCheck,
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

      cancelFlow,
      refresh,
    }),
    [
      api,
      canStartClosing,
      canStartOpening,
      cancelFlow,
      closeDraft.averageCheck,
      closeDraft.closingReceiptPhotoId,
      closeDraft.comment,
      closeDraft.revenueTotal,
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
