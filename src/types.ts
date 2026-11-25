import type { Timestamp } from 'firebase/firestore'

// Shape of what POST /api/analyze returns (api/analyze.ts) and of a saved scan.

export interface Label {
  readable: boolean
  garmentType: string | null
  brand: string | null
  madeIn: string | null
  fibres: { name: string; share: number; material: string | null }[]
  rn: string | null
  ca: string | null
  certifications: string[]
  care: {
    maxWashTempC: number | null
    tumbleDry: boolean | null
    iron: boolean | null
    bleach: boolean | null
    dryClean: boolean | null
  }
}

type Unavailable = { status: 'unavailable'; reason: string }

export interface Analysis {
  id?: string
  /** Missing on analyses saved before results came from reference sources. */
  version?: number
  label?: Label
  environment?: Unavailable | {
    status: 'ok'
    ecs: number
    massKg: number
    countryModelled: boolean
    webUrl: string | null
  }
  labour?: { edition: string; entries: { good: string; childLabour: boolean; forcedLabour: boolean }[] } | null
  factories?: Unavailable | {
    status: 'ok'
    contributor: string
    count: number
    sample: { name: string; address: string; osId: string }[]
  }
  /** Thumbnails as data URLs, stored with the scan. */
  photos?: string[]
  createdAt?: Timestamp
}
