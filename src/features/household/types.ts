export type HouseholdOrderItem = {
  id?: number
  name: string
  quantity: number
  unit?: 'шт' | 'уп'
}

export type HouseholdOrderPayload = {
  shop_name: string
  priority: 'normal' | 'urgent'
  comment: string
  items: HouseholdOrderItem[]
  source: 'mobile_app'
}

export type ExchangeOrderPayload = {
  shop_name: string
  urgency: 'Терпимо 1 день' | 'Терпимо 2 дня' | 'Надо срочно'
  priority?: 'normal' | 'urgent'
  amount?: number
  comment?: string
  source: 'mobile_app'
}

export type HouseholdOrderResponse = {
  id?: number
  order_id?: number
  created_at?: string | null
  createdAt?: string | null
  success?: boolean
}

export type HouseholdOrderResult = {
  id: number | null
  createdAt: string | null
}

export type HouseholdCatalogItem = {
  id: number
  name: string
}
