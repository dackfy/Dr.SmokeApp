import { buildApiUrl } from '../../config/api'
import type {
  CertificateActionResponse,
  CertificateRecord,
  CertificateRedeemPreview,
  CertificateRedeemPreviewResponse,
  CertificateResponse,
  CertificatesAccessStatus,
  CertificatesStatusResponse,
  RedeemCertificatePayload,
  SellCertificatePayload,
} from './types'

export interface CertificatesApi {
  getStatus(employeeId: string): Promise<CertificatesAccessStatus>
  getCertificate(employeeId: string, certificateNumber: string): Promise<CertificateRecord>
  sell(employeeId: string, payload: SellCertificatePayload): Promise<CertificateRecord>
  previewRedeem(
    employeeId: string,
    payload: RedeemCertificatePayload,
  ): Promise<CertificateRedeemPreview>
  redeem(employeeId: string, payload: RedeemCertificatePayload): Promise<CertificateRecord>
}

class CertificatesApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function normalizeStatus(data: CertificatesStatusResponse | null | undefined): CertificatesAccessStatus {
  return {
    available: Boolean(data?.available),
    shopId: readNumber(data?.shopId ?? data?.shop_id),
    shiftStatus: data?.shiftStatus ?? data?.shift_status ?? null,
  }
}

function normalizeCertificate(data: CertificateResponse | null | undefined): CertificateRecord {
  return {
    certificateNumber: String(data?.certificateNumber ?? data?.certificate_number ?? ''),
    shopId: readNumber(data?.shopId ?? data?.shop_id),
    status: String(data?.status ?? ''),
    partnerPhone: data?.partnerPhone ?? data?.partner_phone ?? null,
    nominal: readNumber(data?.nominal),
    employeeId: readNumber(data?.employeeId ?? data?.employee_id),
    saleDate: data?.saleDate ?? data?.sale_date ?? null,
    cashedDate: data?.cashedDate ?? data?.cashed_date ?? null,
    cashedEmployeeId: readNumber(data?.cashedEmployeeId ?? data?.cashed_employee_id),
  }
}

function normalizeRedeemPreview(
  data: CertificateRedeemPreviewResponse | null | undefined,
): CertificateRedeemPreview {
  return {
    certificateNumber: String(data?.certificateNumber ?? data?.certificate_number ?? ''),
    nominal: readNumber(data?.nominal),
    status: String(data?.status ?? ''),
    canRedeem: Boolean(data?.canRedeem ?? data?.can_redeem),
  }
}

function getErrorMessage(status: number, code?: string) {
  if (code === 'shift_not_open') {
    return 'Работа с сертификатами доступна только при открытой смене'
  }
  if (code === 'certificate_not_found') {
    return 'Сертификат не найден'
  }
  if (code === 'certificate_shop_mismatch') {
    return 'Сертификат не относится к магазину текущей смены'
  }
  if (code === 'certificate_not_active') {
    return 'Этот сертификат уже продан и недоступен для продажи'
  }
  if (code === 'certificate_not_sold') {
    return 'Этот сертификат ещё не продан'
  }
  if (code === 'invalid_partner_phone') {
    return 'Телефон партнёра должен начинаться с 8 и содержать 11 цифр'
  }
  if (code === 'invalid_certificate_nominal') {
    return 'Номинал сертификата должен быть целым числом от 1000'
  }
  if (code === 'certificate_sale_failed') {
    return 'Не удалось продать сертификат. Попробуй снова'
  }
  if (code === 'certificate_redeem_failed') {
    return 'Не удалось обналичить сертификат. Попробуй снова'
  }
  if (code === 'certificate_number_required') {
    return 'Нужно указать номер сертификата'
  }
  if (code === 'invalid_employee_id') {
    return 'Не удалось определить сотрудника для работы с сертификатами'
  }
  if (code === 'employee_not_registered') {
    return 'Сотрудник не зарегистрирован'
  }
  if (code === 'employee_inactive') {
    return 'Аккаунт сотрудника деактивирован'
  }
  if (status === 404) {
    return 'API сертификатов пока не подключено на сервере'
  }
  if (status === 403) {
    return 'Доступ к сертификатам недоступен для этого аккаунта'
  }
  return 'Не удалось выполнить действие с сертификатом'
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const code = (data as { error?: string } | null)?.error
    throw new CertificatesApiError(getErrorMessage(response.status, code), response.status, code)
  }

  return data as T
}

export const certificatesApi: CertificatesApi = {
  async getStatus(employeeId) {
    const data = await requestJson<CertificatesStatusResponse>(
      `/employees/${encodeURIComponent(employeeId)}/certificates/status`,
    )
    return normalizeStatus(data)
  },

  async getCertificate(employeeId, certificateNumber) {
    const data = await requestJson<CertificateResponse>(
      `/employees/${encodeURIComponent(employeeId)}/certificates/${encodeURIComponent(certificateNumber)}`,
    )
    return normalizeCertificate(data)
  },

  async sell(employeeId, payload) {
    const data = await requestJson<CertificateActionResponse>(
      `/employees/${encodeURIComponent(employeeId)}/certificates/sell`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )

    return normalizeCertificate(data.certificate)
  },

  async previewRedeem(employeeId, payload) {
    const data = await requestJson<CertificateRedeemPreviewResponse>(
      `/employees/${encodeURIComponent(employeeId)}/certificates/redeem/preview`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )

    return normalizeRedeemPreview(data)
  },

  async redeem(employeeId, payload) {
    const data = await requestJson<CertificateActionResponse>(
      `/employees/${encodeURIComponent(employeeId)}/certificates/redeem`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    )

    return normalizeCertificate(data.certificate)
  },
}

export { CertificatesApiError }
