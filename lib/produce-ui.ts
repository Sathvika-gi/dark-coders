export interface ProduceUI {
  label: string
  emoji: string
  category: 'fruit' | 'vegetable' | 'other'
}

export const PRODUCE_UI_DICT: Record<string, ProduceUI> = {
  tomato: {
    label: 'Cherry Tomatoes',
    emoji: '🍅',
    category: 'vegetable'
  },
  spinach: {
    label: 'Baby Spinach',
    emoji: '🥬',
    category: 'vegetable'
  },
  mango: {
    label: 'Alphonso Mangoes',
    emoji: '🥭',
    category: 'fruit'
  },
  green_peas: {
    label: 'Green Peas',
    emoji: '🫛',
    category: 'vegetable'
  },
  banana: {
    label: 'Bananas',
    emoji: '🍌',
    category: 'fruit'
  },
  strawberry: {
    label: 'Strawberries',
    emoji: '🍓',
    category: 'fruit'
  }
}

export function getProduceUI(type: string): ProduceUI {
  return PRODUCE_UI_DICT[type] ?? {
    label: type,
    emoji: '📦',
    category: 'other'
  }
}
