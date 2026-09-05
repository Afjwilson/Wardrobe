import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Item, Outfit, PairVerdict } from '../types'

/**
 * IndexedDB cannot index boolean values, so `retired` is persisted as 0 | 1.
 * The wrappers in this folder convert to and from the domain `Item` type, so
 * nothing outside src/db ever sees the row shape.
 */
export type ItemRow = Omit<Item, 'retired'> & { retired: 0 | 1 }

export type MetaValue = unknown

export interface WardrobeDB extends DBSchema {
  items: {
    key: string
    value: ItemRow
    indexes: { category: string; retired: number }
  }
  outfits: {
    key: string
    value: Outfit
    indexes: { createdAt: number }
  }
  pairs: {
    key: [string, string]
    value: PairVerdict
    indexes: { a: string; b: string }
  }
  blobs: {
    key: string
    value: Blob
  }
  meta: {
    key: string
    value: MetaValue
  }
}

export const DB_NAME = 'wardrobe'
export const DB_VERSION = 1

/** Bumped independently of DB_VERSION; written into every export file. */
export const SCHEMA_VERSION = 1

let dbPromise: Promise<IDBPDatabase<WardrobeDB>> | null = null

export function getDB(): Promise<IDBPDatabase<WardrobeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<WardrobeDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const items = db.createObjectStore('items', { keyPath: 'id' })
          items.createIndex('category', 'category')
          items.createIndex('retired', 'retired')

          const outfits = db.createObjectStore('outfits', { keyPath: 'id' })
          outfits.createIndex('createdAt', 'createdAt')

          const pairs = db.createObjectStore('pairs', { keyPath: ['a', 'b'] })
          pairs.createIndex('a', 'a')
          pairs.createIndex('b', 'b')

          db.createObjectStore('blobs')
          db.createObjectStore('meta')
        }
      },
    })
  }
  return dbPromise
}

export function toRow(item: Item): ItemRow {
  return { ...item, retired: item.retired ? 1 : 0 }
}

export function fromRow(row: ItemRow): Item {
  return { ...row, retired: row.retired === 1 }
}
