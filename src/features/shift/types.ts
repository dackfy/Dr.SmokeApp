export type OpenedShift = {
  shopName: string
  openedAt: string
  cashAtOpening: number
}

export type ShiftStatus = {
  openedShift: OpenedShift | null
}

export type OpenShiftPayload = {
  shopName: string
  openingReceiptPhotoId: string
  uniformPhotoId: string
  cashAtOpening: number
}

export type CloseShiftPayload = {
  revenueTotal: number
  averageCheck: number
  comment?: string
  closingReceiptPhotoId: string
}

export type ShiftFlowMode = 'idle' | 'opening' | 'closing'

export type OpenFlowStep = 'shop' | 'openingReceipt' | 'uniformPhoto' | 'cash' | 'review'

export type CloseFlowStep =
  | 'confirmShop'
  | 'revenue'
  | 'averageCheck'
  | 'comment'
  | 'closingReceipt'
  | 'review'

export type ShiftOpenDraft = {
  shopName: string | null
  openingReceiptPhotoId: string
  uniformPhotoId: string
  cashAtOpening: string
}

export type ShiftCloseDraft = {
  revenueTotal: string
  averageCheck: string
  comment: string
  closingReceiptPhotoId: string
}
