// View registry. A new view: a directory in src/views/ + one entry here.

import { lazy, type ComponentType } from 'react'
import CompareView from '../views/compare'
import SkyView from '../views/sky'
import TimelineView from '../views/timeline'
import WindowsView from '../views/windows'
import type { ViewProps } from './scenario'

const MapView = lazy(() => import('../views/map'))

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
  { id: 'windows', label: 'Windows', component: WindowsView },
]
