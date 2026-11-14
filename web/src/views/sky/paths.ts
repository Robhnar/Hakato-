import { azToX, elToY, plotInner, type PlotLayout, toSvgPoint } from './project'

export interface AzElSeries {
  az_deg: number[]
  el_deg: number[]
}

/**
 * Dzieli ślad na segmenty przy przejściu przez północ (skok azymutu > 180°),
 * żeby nie rysować poziomej kreski przez cały wykres.
 */
export function splitTrailByAzimuthWrap(series: AzElSeries): AzElSeries[] {
  const { az_deg, el_deg } = series
  const n = Math.min(az_deg.length, el_deg.length)
  if (n === 0) return []

  const segments: AzElSeries[] = []
  let azSeg = [az_deg[0]]
  let elSeg = [el_deg[0]]

  for (let i = 1; i < n; i++) {
    const jump = Math.abs(az_deg[i] - az_deg[i - 1])
    if (jump > 180) {
      segments.push({ az_deg: azSeg, el_deg: elSeg })
      azSeg = [az_deg[i]]
      elSeg = [el_deg[i]]
    } else {
      azSeg.push(az_deg[i])
      elSeg.push(el_deg[i])
    }
  }
  segments.push({ az_deg: azSeg, el_deg: elSeg })
  return segments
}

export function polylinePath(az_deg: number[], el_deg: number[], layout: PlotLayout): string {
  const n = Math.min(az_deg.length, el_deg.length)
  if (n === 0) return ''
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const { x, y } = toSvgPoint(az_deg[i], el_deg[i], layout)
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return parts.join(' ')
}

/** Wypełniona sylwetka terenu: profil horyzontu + zamknięcie wzdłuż dolnej krawędzi wykresu. */
export function horizonSilhouettePath(
  elevation_deg: number[],
  azimuth_step_deg: number,
  layout: PlotLayout,
): string {
  if (elevation_deg.length === 0 || azimuth_step_deg <= 0) return ''

  const parts: string[] = []
  for (let i = 0; i < elevation_deg.length; i++) {
    const az = i * azimuth_step_deg
    const x = azToX(az, layout)
    const y = elToY(elevation_deg[i], layout)
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
  }

  // Domknij do prawej krawędzi panoramy (az 360°), potem w dół do elMin i w lewo.
  // azToX(360) zawija do 0°, więc prawą krawędź bierzemy z geometrii wykresu.
  const lastEl = elevation_deg[elevation_deg.length - 1]
  const inner = plotInner(layout)
  const x360 = inner.x + inner.w
  const yLast = elToY(lastEl, layout)
  const yFloor = elToY(layout.elMin, layout)
  const x0 = inner.x
  parts.push(`L${x360.toFixed(2)} ${yLast.toFixed(2)}`)
  parts.push(`L${x360.toFixed(2)} ${yFloor.toFixed(2)}`)
  parts.push(`L${x0.toFixed(2)} ${yFloor.toFixed(2)}`)
  parts.push('Z')
  return parts.join(' ')
}

export function trailPaths(series: AzElSeries, layout: PlotLayout): string[] {
  return splitTrailByAzimuthWrap(series)
    .map((segment) => polylinePath(segment.az_deg, segment.el_deg, layout))
    .filter((d) => d.length > 0)
}
