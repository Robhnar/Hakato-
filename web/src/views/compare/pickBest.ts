/** Wybór najlepszej wartości w kolumnie metryk (porównanie scenariuszy). */

export type MetricDirection = 'max' | 'min'

/**
 * Zwraca indeksy pozycji z najlepszą wartością.
 * `null`/`undefined`/NaN pomija. Remis → wszystkie remisujące indeksy.
 * Brak danych → pusta tablica.
 */
export function pickBestIndices(
  values: Array<number | null | undefined>,
  direction: MetricDirection = 'max',
): number[] {
  let best: number | null = null
  const winners: number[] = []

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]
    if (value === null || value === undefined || Number.isNaN(value)) continue
    if (best === null) {
      best = value
      winners.push(i)
      continue
    }
    const better = direction === 'max' ? value > best : value < best
    const tie = value === best
    if (better) {
      best = value
      winners.length = 0
      winners.push(i)
    } else if (tie) {
      winners.push(i)
    }
  }

  return winners
}

export function isBest(
  values: Array<number | null | undefined>,
  index: number,
  direction: MetricDirection = 'max',
): boolean {
  return pickBestIndices(values, direction).includes(index)
}
