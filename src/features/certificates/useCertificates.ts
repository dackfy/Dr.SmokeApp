import React from 'react'
import {
  certificatesApi,
  type CertificatesApi,
} from './certificatesApi'
import type {
  CertificateRecord,
  CertificateRedeemPreview,
  CertificatesAccessStatus,
  RedeemCertificatePayload,
  SellCertificatePayload,
} from './types'

type UseCertificatesOptions = {
  employeeId?: string
  api?: CertificatesApi
  enabled?: boolean
}

const emptyStatus: CertificatesAccessStatus = {
  available: false,
  shopId: null,
  shiftStatus: null,
}

export function useCertificates(options: UseCertificatesOptions) {
  const {
    employeeId,
    api = certificatesApi,
    enabled = true,
  } = options

  const [status, setStatus] = React.useState<CertificatesAccessStatus>(emptyStatus)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [lastCertificate, setLastCertificate] = React.useState<CertificateRecord | null>(null)
  const [redeemPreview, setRedeemPreview] = React.useState<CertificateRedeemPreview | null>(null)

  const refresh = React.useCallback(async () => {
    if (!enabled || !employeeId) {
      return
    }

    setIsRefreshing(true)
    setError(null)

    try {
      const nextStatus = await api.getStatus(employeeId)
      setStatus(nextStatus)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Не удалось получить статус сертификатов',
      )
    } finally {
      setIsRefreshing(false)
    }
  }, [api, employeeId, enabled])

  React.useEffect(() => {
    if (!enabled || !employeeId) {
      return
    }

    setIsLoading(true)
    setError(null)

    api
      .getStatus(employeeId)
      .then(nextStatus => {
        setStatus(nextStatus)
      })
      .catch(requestError => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось получить статус сертификатов',
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [api, employeeId, enabled])

  const sell = React.useCallback(
    async (payload: SellCertificatePayload) => {
      if (!employeeId || !enabled) {
        return null
      }

      setIsSubmitting(true)
      setError(null)
      setSuccessMessage(null)
      setRedeemPreview(null)

      try {
        const certificate = await api.sell(employeeId, payload)
        setLastCertificate(certificate)
        setSuccessMessage('Сертификат успешно продан')
        return certificate
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось продать сертификат',
        )
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [api, employeeId, enabled],
  )

  const loadRedeemPreview = React.useCallback(
    async (payload: RedeemCertificatePayload) => {
      if (!employeeId || !enabled) {
        return null
      }

      setIsSubmitting(true)
      setError(null)
      setSuccessMessage(null)
      setLastCertificate(null)

      try {
        const preview = await api.previewRedeem(employeeId, payload)
        setRedeemPreview(preview)
        return preview
      } catch (requestError) {
        setRedeemPreview(null)
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось проверить сертификат',
        )
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [api, employeeId, enabled],
  )

  const redeem = React.useCallback(
    async (payload: RedeemCertificatePayload) => {
      if (!employeeId || !enabled) {
        return null
      }

      setIsSubmitting(true)
      setError(null)
      setSuccessMessage(null)

      try {
        const certificate = await api.redeem(employeeId, payload)
        setLastCertificate(certificate)
        setRedeemPreview(null)
        setSuccessMessage('Сертификат успешно обналичен')
        return certificate
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Не удалось обналичить сертификат',
        )
        return null
      } finally {
        setIsSubmitting(false)
      }
    },
    [api, employeeId, enabled],
  )

  const clearFeedback = React.useCallback(() => {
    setError(null)
    setSuccessMessage(null)
  }, [])

  return {
    status,
    isLoading,
    isRefreshing,
    isSubmitting,
    error,
    successMessage,
    lastCertificate,
    redeemPreview,
    refresh,
    sell,
    loadRedeemPreview,
    redeem,
    clearFeedback,
  }
}
