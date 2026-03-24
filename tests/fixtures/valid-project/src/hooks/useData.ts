import { fetchItems } from '../lib/api'
import type { Item } from '../types'
export function useData() { return { items: [] as Item[] } }
