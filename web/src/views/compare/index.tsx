import { useCallback, useMemo, useState } from 'react'
import type { ViewProps } from '../../app/scenario'
import './compare.css'
import ScenarioCard from './ScenarioCard'
import {
  columnBests,
  emptyMetrics,
  sameMetrics,
  type ScenarioMetrics,
} from './metrics'

// Porównanie scenariuszy (zadanie 008). Powłoka zarządza listą; tu tylko metryki i pasy.

export default function CompareView({ scenarios, active, selectScenario }: ViewProps) {
  const [metricsById, setMetricsById] = useState<Record<string, ScenarioMetrics | null>>({})

  const onMetrics = useCallback((scenarioId: string, metrics: ScenarioMetrics | null) => {
    setMetricsById((previous) => {
      const current = previous[scenarioId]
      if (sameMetrics(current, metrics)) return previous
      return { ...previous, [scenarioId]: metrics }
    })
  }, [])

  const orderedMetrics = useMemo(
    () => scenarios.map((scenario) => metricsById[scenario.id] ?? emptyMetrics()),
    [scenarios, metricsById],
  )
  const bests = useMemo(() => columnBests(orderedMetrics), [orderedMetrics])

  if (scenarios.length < 2) {
    return (
      <div className="compare compare-empty">
        <h2>Compare</h2>
        <p>
          Add a second scenario in the shell (different site or start time) to compare solar power
          and Earth line-of-sight side by side.
        </p>
        <ScenarioCard
          scenario={scenarios[0]}
          active
          onSelect={() => selectScenario(scenarios[0].id)}
          columnBest={{
            sunFraction: false,
            earthFraction: false,
            sunMaxEl: false,
            earthMaxEl: false,
          }}
          onMetrics={onMetrics}
        />
      </div>
    )
  }

  return (
    <div className="compare">
      <h2>Compare scenarios</h2>
      <p className="compare-hint">
        Hours on the tracks are measured from each scenario&apos;s own start. Click a card to make
        it active.
      </p>
      <div className="compare-grid">
        {scenarios.map((scenario, index) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            active={scenario.id === active.id}
            onSelect={() => selectScenario(scenario.id)}
            columnBest={{
              sunFraction: bests.sunFraction[index] ?? false,
              earthFraction: bests.earthFraction[index] ?? false,
              sunMaxEl: bests.sunMaxEl[index] ?? false,
              earthMaxEl: bests.earthMaxEl[index] ?? false,
            }}
            onMetrics={onMetrics}
          />
        ))}
      </div>
    </div>
  )
}
