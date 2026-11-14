// Rejestr widoków. Nowy widok: katalog w src/views/ + jeden wpis tutaj.

import type { ComponentType } from 'react'
import CompareView from '../views/compare'
import MapView from '../views/map'
import SkyView from '../views/sky'
import TimelineView from '../views/timeline'
import type { ViewProps } from './scenario'

export interface ViewEntry {
  id: string
  label: string
  component: ComponentType<ViewProps>
}

export const VIEWS: ViewEntry[] = [
  { id: 'sky', label: 'Sky', component: SkyView },
  { id: 'timeline', label: 'Timeline', component: TimelineView },
  { id: 'compare', label: 'Compare', component: CompareView },
  { id: 'map', label: 'Map', component: MapView },
]
