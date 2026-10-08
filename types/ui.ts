export interface UIShipment {
  id: string
  code: string
  produce: string
  emoji: string
  origin: string
  destination: string
  totalHours: number
  remainingHours: number
  temperature: number
  tempStatus: 'normal' | 'high'
  progress: number // 0-100
  basePrice: number
  currentPrice: number
  isNew?: boolean
  status: string
}

export interface UIAlert {
  id: string
  severity: string
  message: string
  timeAgo: string
}

export interface UIListing {
  id: string
  produce: string
  emoji: string
  category: 'fruit' | 'vegetable' | 'other'
  quantityStr: string
  originalPrice: number
  discountedPrice: number
  discountPct: number
  freshnessHours: number
  aiLine: string
  isFlashSale: boolean
  isNew: boolean
  availableKg: number
}
