export type CertificatesAccessStatus = {
  available: boolean
  shopId: number | null
  shiftStatus: string | null
}

export type CertificateRecord = {
  certificateNumber: string
  shopId: number | null
  status: string
  partnerPhone: string | null
  nominal: number | null
  employeeId: number | null
  saleDate: string | null
  cashedDate: string | null
  cashedEmployeeId: number | null
}

export type CertificateRedeemPreview = {
  certificateNumber: string
  nominal: number | null
  status: string
  canRedeem: boolean
}

export type SellCertificatePayload = {
  certificateNumber: string
  partnerPhone: string
  nominal: number
}

export type RedeemCertificatePayload = {
  certificateNumber: string
}

export type CertificatesStatusResponse = {
  available?: boolean
  shop_id?: number | null
  shopId?: number | null
  shift_status?: string | null
  shiftStatus?: string | null
}

export type CertificateResponse = {
  certificate_number?: string
  certificateNumber?: string
  shop_id?: number | null
  shopId?: number | null
  status?: string
  partner_phone?: string | null
  partnerPhone?: string | null
  nominal?: number | null
  employee_id?: number | null
  employeeId?: number | null
  sale_date?: string | null
  saleDate?: string | null
  cashed_date?: string | null
  cashedDate?: string | null
  cashed_employee_id?: number | null
  cashedEmployeeId?: number | null
}

export type CertificateActionResponse = {
  success?: boolean
  certificate?: CertificateResponse | null
}

export type CertificateRedeemPreviewResponse = {
  certificate_number?: string
  certificateNumber?: string
  nominal?: number | null
  status?: string
  can_redeem?: boolean
  canRedeem?: boolean
}
