export type OpenedShift = {
  shopId?: number
  shopName: string
  openedAt: string
  cashAtOpening: number
}

export type ShiftStatus = {
  openedShift: OpenedShift | null
}

export type OpenShiftPayload = {
  shopId: number
  shopName: string
  openingReceiptPhotoId: string
  uniformPhotoId: string
  cashAtOpening: number
}

export type ShopOption = {
  id: number
  name: string
}

export type CloseShiftPayload = {
  revenueTotal: number
  checksCount: number
  cashlessPayment: number
  sealNumber: string
  cashDenomination: number
  comment?: string
  closingReceiptPhotoId: string
}

export type ShiftFlowMode = 'idle' | 'opening' | 'closing'

export type OpenFlowStep = 'shop' | 'openingReceipt' | 'uniformPhoto' | 'cash' | 'review'

export type CloseFlowStep =
  | 'confirmShop'
  | 'revenue'
  | 'checksCount'
  | 'cashlessPayment'
  | 'sealNumber'
  | 'cashDenomination'
  | 'comment'
  | 'closingReceipt'
  | 'review'

export type ShiftOpenDraft = {
  shopId: number | null
  shopName: string | null
  openingReceiptPhotoId: string
  uniformPhotoId: string
  cashAtOpening: string
}

export type ShiftCloseDraft = {
  revenueTotal: string
  checksCount: string
  cashlessPayment: string
  sealNumber: string
  cashDenomination: string
  comment: string
  closingReceiptPhotoId: string
}
