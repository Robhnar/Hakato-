import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { OptimalSiteResponse, Site } from '../../api/types'
import type { Scenario } from '../../app/scenario'
import { scoreColor } from '../../app/scale'
import type { RankedCandidate } from './candidates'
import { GRATICULE, horizonCircle, meridianPoints, parallelPoints, type GlobePoint } from './circles'
import { latLonToVector3, vectorToLatLon } from './geo'
import { buildOverlayPixels } from './heatmap'

// Texture: NASA SVS "CGI Moon Kit" (SVS 4720), a color map from the LROC WAC mosaic.
// https://svs.gsfc.nasa.gov/4720/ - NASA data, public domain, 2048x1024 crop.
const TEXTURE_URL = '/moon_lroc_color_2k.jpg'

// Colors from the shell tokens (index.css).
const SITE_COLOR = 0xb9b6ae
const SCENARIO_COLOR = 0xe9e6df
const ACTIVE_COLOR = 0xffffff
const SUN_COLOR = 0xe9b44c
const EARTH_COLOR = 0x5aa2e0

// Marker sizes (sphere radius in globe units).
const SITE_RADIUS = 0.01
const SCENARIO_RADIUS = 0.016
const ACTIVE_RADIUS = 0.022

// Grid and circle lines lie just above the surface so they do not z-fight.
const GRATICULE_RADIUS = 1.002
const HORIZON_RADIUS = 1.004
const LABEL_RADIUS = 1.01
const HORIZON_SEGMENTS = 180

const MIN_DISTANCE = 1.15
const MAX_DISTANCE = 6
// Below this camera distance the catalog labels and grid labels are visible.
const CLOSE_UP_DISTANCE = 2.4
const FLY_MS = 600
const ZOOM_MS = 200
const ZOOM_IN = 0.8
const ZOOM_OUT = 1.25

// ON/OFF overlay (task 019): an equirectangular buffer; opacity is carried by the pixel alpha.
const OVERLAY_WIDTH = 1024
const OVERLAY_HEIGHT = 512
const OVERLAY_OPACITY = 1

// Candidates layer (task 021): discs on the score scale, winners larger.
const CANDIDATE_RADIUS = 1.006
const CANDIDATE_SMALL = 0.007
const CANDIDATE_TOP = 0.012
const CANDIDATE_TOP_RANKS = 5
const CANDIDATE_OUTLINE = 0.002

export type { GlobePoint }

/** Where the camera flies: over a pole, to the Earth-facing side or over a specific point. */
export type ViewTarget = 'south' | 'north' | 'near' | GlobePoint

export interface ViewRequest {
  target: ViewTarget
  /** An increasing counter - the same target can be chosen twice in a row. */
  seq: number
}

export interface ZoomRequest {
  /** 1 = closer, −1 = farther. */
  direction: 1 | -1
  seq: number
}

export interface HoverInfo {
  lat_deg: number
  lon_deg: number
  label?: string
}

export interface MoonGlobeProps {
  sites: Site[]
  scenarios: Scenario[]
  activeId: string
  /** Subsolar point - lighting, terminator and the "Sun overhead" label. */
  subsolar: GlobePoint | null
  /** Sub-Earth point - Earth visibility limit and the "Earth overhead" label. */
  subearth: GlobePoint | null
  onSelect: (id: string) => void
  onPick: (lat_deg: number, lon_deg: number) => void
  viewRequest: ViewRequest | null
  zoomRequest: ZoomRequest | null
  onHover?: (info: HoverInfo | null) => void
  /** Layer of power/communication zones and the optimal-point marker (019). */
  overlayEnabled?: boolean
  /** Result of `/api/optimal-site`; `null` until there is data. */
  optimalSite?: OptimalSiteResponse | null
  /** Overlay candidates with positions; an empty list = no layer. */
  candidates?: RankedCandidate[]
  highlightId?: string | null
  selectedId?: string | null
  onCandidateHover?: (id: string | null) => void
  onCandidateSelect?: (id: string) => void
}

interface GlobeApi {
  setMarkers(sites: Site[], scenarios: Scenario[], activeId: string): void
  setBodies(subsolar: GlobePoint | null, subearth: GlobePoint | null): void
  flyTo(target: ViewTarget): void
  zoom(direction: 1 | -1): void
  setOverlay(enabled: boolean, site: OptimalSiteResponse | null): void
  setCandidates(candidates: RankedCandidate[]): void
  setCandidateFocus(highlightId: string | null, selectedId: string | null): void
}

interface MarkerData {
  key: string
  lat_deg: number
  lon_deg: number
  label: string
  scenarioId?: string
  candidateId?: string
}

interface LabelSpec {
  key: string
  el: HTMLDivElement
  position: THREE.Vector3
  width: number
  height: number
  priority: number
  /** `true` = always visible; `false` = only after zooming in or under the cursor. */
  always: boolean
}

interface Rect {
  left: number
  top: number
  right: number
  bottom: number
}

export default function MoonGlobe({
  sites,
  scenarios,
  activeId,
  subsolar,
  subearth,
  onSelect,
  onPick,
  viewRequest,
  zoomRequest,
  onHover,
  overlayEnabled = false,
  optimalSite = null,
  candidates = [],
  highlightId = null,
  selectedId = null,
  onCandidateHover,
  onCandidateSelect,
}: MoonGlobeProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeApi | null>(null)
  // Shell actions in a ref so the three.js scene is created once, not on every render.
  const actions = useRef({ onSelect, onPick, onHover, onCandidateHover, onCandidateSelect })

  useEffect(() => {
    actions.current = { onSelect, onPick, onHover, onCandidateHover, onCandidateSelect }
  }, [onSelect, onPick, onHover, onCandidateHover, onCandidateSelect])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const stage = host

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const canvas = renderer.domElement
    stage.appendChild(canvas)

    // Labels are HTML elements over the canvas - three.js does not draw text.
    const labelLayer = document.createElement('div')
    labelLayer.className = 'map-labels'
    stage.appendChild(labelLayer)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)
    camera.position.set(3.4, 0.5, 0)

    const controls = new OrbitControls(camera, canvas)
    controls.enablePan = false
    // We handle the wheel ourselves: it zooms only over the globe disc, outside it
    // it scrolls the page (a finding from review 021).
    controls.enableZoom = false
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = MIN_DISTANCE
    controls.maxDistance = MAX_DISTANCE
    controls.rotateSpeed = 0.6
    controls.update()

    // The NASA map has longitude 0° in the center and increases east, and SphereGeometry
    // puts u = 0.75 on −Z - in our frame that is east. The crop fits without mirroring;
    // mirroring would move Mare Crisium to the western side.
    const texture = new THREE.TextureLoader().load(TEXTURE_URL, requestRender)
    texture.colorSpace = THREE.SRGBColorSpace

    const globeGeometry = new THREE.SphereGeometry(1, 96, 64)
    const globeMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 })
    const globe = new THREE.Mesh(globeGeometry, globeMaterial)
    scene.add(globe)

    // The Sun sculpts day and night; the weak, cool ambient light is "earthshine",
    // so the night side is not a black blob and the maria are visible on it.
    const sunLight = new THREE.DirectionalLight(0xfff3e0, 1.3)
    scene.add(sunLight, new THREE.AmbientLight(0xa8bcd8, 0.3))

    let siteRows: Site[] = []
    let scenarioRows: Scenario[] = []
    let activeScenarioId = ''
    let sunPoint: GlobePoint | null = null
    let earthPoint: GlobePoint | null = null

    // --- Coordinate grid ------------------------------------------------

    const graticule = new THREE.Group()
    scene.add(graticule)

    function polyline(points: GlobePoint[], radius: number, color: number, opacity: number): THREE.Line {
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array(points.length * 3)
      points.forEach((point, index) => {
        const vector = latLonToVector3(point.lat_deg, point.lon_deg, radius)
        positions[index * 3] = vector.x
        positions[index * 3 + 1] = vector.y
        positions[index * 3 + 2] = vector.z
      })
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      return new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity }))
    }

    for (const lat_deg of GRATICULE.parallels) {
      graticule.add(polyline(parallelPoints(lat_deg), GRATICULE_RADIUS, 0xffffff, lat_deg === 0 ? 0.25 : 0.12))
    }
    for (const lon_deg of GRATICULE.meridians) {
      graticule.add(polyline(meridianPoints(lon_deg), GRATICULE_RADIUS, 0xffffff, lon_deg === 0 ? 0.25 : 0.12))
    }

    // --- Terminator and Earth visibility limit ------------------------------

    function horizonLine(color: number, dashed: boolean): THREE.Line {
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array((HORIZON_SEGMENTS + 1) * 3), 3),
      )
      const material = dashed
        ? new THREE.LineDashedMaterial({ color, transparent: true, opacity: 0.9, dashSize: 0.04, gapSize: 0.03 })
        : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
      const line = new THREE.Line(geometry, material)
      line.renderOrder = 3
      line.visible = false
      line.frustumCulled = false
      line.userData = { dashed }
      return line
    }

    function setHorizon(line: THREE.Line, center: GlobePoint | null) {
      line.visible = center !== null
      if (!center) return
      const attribute = line.geometry.getAttribute('position') as THREE.BufferAttribute
      horizonCircle(center, HORIZON_SEGMENTS).forEach((point, index) => {
        const vector = latLonToVector3(point.lat_deg, point.lon_deg, HORIZON_RADIUS)
        attribute.setXYZ(index, vector.x, vector.y, vector.z)
      })
      attribute.needsUpdate = true
      line.geometry.computeBoundingSphere()
      if (line.userData.dashed === true) line.computeLineDistances()
    }

    const terminator = horizonLine(SUN_COLOR, false)
    const earthLimit = horizonLine(EARTH_COLOR, true)
    scene.add(terminator, earthLimit)

    // --- Markers on the surface --------------------------------------------

    const markers = new THREE.Group()
    scene.add(markers)

    const siteGeometry = new THREE.SphereGeometry(SITE_RADIUS, 10, 8)
    const siteMaterial = new THREE.MeshBasicMaterial({ color: SITE_COLOR })
    const scenarioGeometry = new THREE.SphereGeometry(SCENARIO_RADIUS, 14, 10)
    const scenarioMaterial = new THREE.MeshBasicMaterial({ color: SCENARIO_COLOR })
    const activeGeometry = new THREE.SphereGeometry(ACTIVE_RADIUS, 18, 14)
    const activeMaterial = new THREE.MeshBasicMaterial({ color: ACTIVE_COLOR })
    const activeRingGeometry = new THREE.RingGeometry(0.03, 0.036, 40)
    const activeRingMaterial = new THREE.MeshBasicMaterial({
      color: ACTIVE_COLOR,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })

    const bodyMarkers = new THREE.Group()
    scene.add(bodyMarkers)

    function dotMarker(color: number): THREE.Mesh {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 14, 10),
        new THREE.MeshBasicMaterial({ color }),
      )
      mesh.renderOrder = 2
      mesh.visible = false
      return mesh
    }

    const sunMarker = dotMarker(SUN_COLOR)
    const earthMarker = dotMarker(EARTH_COLOR)
    bodyMarkers.add(sunMarker, earthMarker)

    function placeOnSphere(object: THREE.Object3D, lat_deg: number, lon_deg: number, lift: number) {
      const position = latLonToVector3(lat_deg, lon_deg, 1 + lift)
      object.position.set(position.x, position.y, position.z)
    }

    let activeRing: THREE.Mesh | null = null
    let flownToOptimal = false

    // --- HTML labels --------------------------------------------------------

    let labels: LabelSpec[] = []
    let hoveredKey: string | null = null

    function addLabel(
      key: string,
      text: string,
      lat_deg: number,
      lon_deg: number,
      priority: number,
      always: boolean,
      className: string,
    ) {
      const el = document.createElement('div')
      el.className = className
      el.textContent = text
      labelLayer.appendChild(el)
      const position = latLonToVector3(lat_deg, lon_deg, LABEL_RADIUS)
      labels.push({
        key,
        el,
        position: new THREE.Vector3(position.x, position.y, position.z),
        width: 0,
        height: 0,
        priority,
        always,
      })
    }

    function rebuildLabels() {
      for (const label of labels) label.el.remove()
      labels = []

      for (const site of siteRows) {
        addLabel(`site:${site.id}`, site.name, site.lat_deg, site.lon_deg, 40, false, 'map-label')
      }
      for (const scenario of scenarioRows) {
        const active = scenario.id === activeScenarioId
        addLabel(
          `scenario:${scenario.id}`,
          scenario.name,
          scenario.lat_deg,
          scenario.lon_deg,
          active ? 120 : 110,
          true,
          active ? 'map-label map-label-scenario is-active' : 'map-label map-label-scenario',
        )
      }
      if (sunPoint) {
        addLabel('sun', 'Sun overhead', sunPoint.lat_deg, sunPoint.lon_deg, 100, true, 'map-label map-label-sun')
      }
      if (earthPoint) {
        addLabel(
          'earth',
          'Earth overhead',
          earthPoint.lat_deg,
          earthPoint.lon_deg,
          100,
          true,
          'map-label map-label-earth',
        )
      }
      for (const row of candidateRows) {
        if (row.candidate.id === selectedCandidateId) {
          addLabel(`cand:${row.candidate.id}`, row.label, row.candidate.lat_deg, row.candidate.lon_deg, 115, true, 'map-label map-label-scenario is-active')
        } else if (row.rank <= CANDIDATE_TOP_RANKS) {
          addLabel(`cand:${row.candidate.id}`, String(row.rank), row.candidate.lat_deg, row.candidate.lon_deg, 130, true, 'map-label map-label-pole map-rank num')
        }
      }
      addLabel('pole-s', 'S', -90, 0, 90, true, 'map-label map-label-pole')
      addLabel('pole-n', 'N', 90, 0, 90, true, 'map-label map-label-pole')
      addLabel('grid-80s', '80°S', -80, 0, 60, false, 'map-label map-label-grid')
      addLabel('grid-85s', '85°S', -85, 0, 60, false, 'map-label map-label-grid')

      // One forced layout for all labels instead of one for each.
      for (const label of labels) {
        label.width = label.el.offsetWidth
        label.height = label.el.offsetHeight
        label.el.style.display = 'none'
      }
    }

    function updateLabels() {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (!width || !height) return

      const cameraDirection = camera.position.clone().normalize()
      const closeUp = camera.position.length() < CLOSE_UP_DISTANCE
      const placed: Rect[] = []
      const ordered = [...labels].sort((a, b) => b.priority - a.priority)

      for (const label of ordered) {
        // A label on the globe's far hemisphere is hidden by the globe itself.
        const facing = label.position.dot(cameraDirection)
        const wanted = label.always || closeUp || label.key === hoveredKey
        if (facing <= 0.02 || !wanted) {
          label.el.style.display = 'none'
          continue
        }

        const projected = label.position.clone().project(camera)
        const x = (projected.x * 0.5 + 0.5) * width
        const y = (-projected.y * 0.5 + 0.5) * height
        const rect: Rect = {
          left: x - label.width / 2,
          top: y - label.height / 2,
          right: x + label.width / 2,
          bottom: y + label.height / 2,
        }
        if (rect.left < 0 || rect.right > width || rect.top < 0 || rect.bottom > height) {
          label.el.style.display = 'none'
          continue
        }

        // Greedy: a lower-priority label disappears when it overlaps a higher one.
        const collides = placed.some(
          (other) =>
            rect.left < other.right &&
            rect.right > other.left &&
            rect.top < other.bottom &&
            rect.bottom > other.top,
        )
        if (collides) {
          label.el.style.display = 'none'
          continue
        }
        placed.push(rect)

        label.el.style.display = ''
        label.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      }
    }

    // --- Zone overlay (task 019) ---------------------------------------

    const overlayCanvas = document.createElement('canvas')
    overlayCanvas.width = OVERLAY_WIDTH
    overlayCanvas.height = OVERLAY_HEIGHT
    const overlayContext = overlayCanvas.getContext('2d')
    const overlayTexture = new THREE.CanvasTexture(overlayCanvas)
    overlayTexture.colorSpace = THREE.SRGBColorSpace
    overlayTexture.magFilter = THREE.LinearFilter
    overlayTexture.minFilter = THREE.LinearFilter

    const overlayGeometry = new THREE.SphereGeometry(1.003, 96, 64)
    const overlayMaterial = new THREE.MeshBasicMaterial({
      map: overlayTexture,
      transparent: true,
      opacity: OVERLAY_OPACITY,
      depthWrite: false,
    })
    const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
    overlay.visible = false
    scene.add(overlay)

    overlay.renderOrder = 1

    // --- Candidates layer --------------------------------------------------

    const candidateMarkers = new THREE.Group()
    candidateMarkers.visible = false
    scene.add(candidateMarkers)
    const candidateGeometries = new Map<number, THREE.CircleGeometry>()
    const candidateMaterials: THREE.Material[] = []
    const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x0c0c0d })
    const focusGeometry = new THREE.RingGeometry(0.026, 0.032, 40)
    const focusMaterial = new THREE.MeshBasicMaterial({
      color: ACTIVE_COLOR,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const highlightRing = new THREE.Mesh(focusGeometry, focusMaterial)
    const selectedRing = new THREE.Mesh(focusGeometry, focusMaterial)
    for (const ring of [highlightRing, selectedRing]) {
      ring.renderOrder = 3
      ring.visible = false
      scene.add(ring)
    }
    let candidateRows: RankedCandidate[] = []
    let selectedCandidateId: string | null = null
    let hoveredCandidateId: string | null = null

    function discGeometry(radius: number): THREE.CircleGeometry {
      let geometry = candidateGeometries.get(radius)
      if (!geometry) {
        geometry = new THREE.CircleGeometry(radius, 24)
        candidateGeometries.set(radius, geometry)
      }
      return geometry
    }

    function faceOutward(object: THREE.Object3D, lat_deg: number, lon_deg: number, radius: number) {
      const p = latLonToVector3(lat_deg, lon_deg, radius)
      object.position.set(p.x, p.y, p.z)
      object.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(p.x, p.y, p.z).normalize(),
      )
    }

    function clearCandidates() {
      candidateMarkers.clear()
      for (const material of candidateMaterials) material.dispose()
      candidateMaterials.length = 0
    }

    function placeFocus() {
      for (const [ring, id] of [
        [highlightRing, hoveredId],
        [selectedRing, selectedCandidateId],
      ] as const) {
        const row = candidateRows.find((r) => r.candidate.id === id)
        ring.visible = candidateMarkers.visible && row !== undefined
        if (row) faceOutward(ring, row.candidate.lat_deg, row.candidate.lon_deg, CANDIDATE_RADIUS + 0.002)
      }
    }
    let hoveredId: string | null = null

    function drawOverlay(site: OptimalSiteResponse) {
      if (!overlayContext) return
      const pixels = buildOverlayPixels(OVERLAY_WIDTH, OVERLAY_HEIGHT, site.cursor_bodies)
      const image = overlayContext.createImageData(OVERLAY_WIDTH, OVERLAY_HEIGHT)
      image.data.set(pixels)
      overlayContext.putImageData(image, 0, 0)
      overlayTexture.needsUpdate = true
    }

    function clearOverlay() {
      overlayContext?.clearRect(0, 0, OVERLAY_WIDTH, OVERLAY_HEIGHT)
      overlayTexture.needsUpdate = true
    }

    // --- Render loop -----------------------------------------------------

    let frame = 0

    function renderScene() {
      // The active scenario's ring always faces the camera.
      if (activeRing) activeRing.quaternion.copy(camera.quaternion)
      if (highlightRing.visible) highlightRing.quaternion.copy(camera.quaternion)
      if (selectedRing.visible) selectedRing.quaternion.copy(camera.quaternion)
      renderer.render(scene, camera)
      updateLabels()
    }

    function draw() {
      frame = 0
      // `update()` returns `true` while rotation damping lasts - so
      // the loop does not stop mid-motion and does not burn frames when the scene is still.
      const moving = controls.update()
      renderScene()
      if (moving) requestRender()
    }

    function requestRender() {
      if (frame) return
      frame = requestAnimationFrame(draw)
    }

    function resize() {
      const width = stage.clientWidth
      const height = stage.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      requestRender()
    }

    // --- Camera: fly-over and zoom -------------------------------------

    let flyFrame = 0
    let zoomGoal = 0

    function applySpherical(spherical: THREE.Spherical) {
      camera.position.setFromSpherical(spherical)
      camera.lookAt(controls.target)
    }

    function animateTo(goal: THREE.Spherical, duration: number, done?: () => void) {
      if (flyFrame) cancelAnimationFrame(flyFrame)
      flyFrame = 0
      const start = new THREE.Spherical().setFromVector3(camera.position)
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (reduceMotion || duration <= 0) {
        applySpherical(goal)
        done?.()
        requestRender()
        return
      }

      // By the shorter way in longitude so the camera does not circle the globe.
      let deltaTheta = goal.theta - start.theta
      if (deltaTheta > Math.PI) deltaTheta -= 2 * Math.PI
      if (deltaTheta < -Math.PI) deltaTheta += 2 * Math.PI

      const begin = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - begin) / duration)
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
        applySpherical(
          new THREE.Spherical(
            start.radius + (goal.radius - start.radius) * eased,
            start.phi + (goal.phi - start.phi) * eased,
            start.theta + deltaTheta * eased,
          ),
        )
        renderScene()
        if (t < 1) {
          flyFrame = requestAnimationFrame(step)
        } else {
          flyFrame = 0
          done?.()
          requestRender()
        }
      }
      flyFrame = requestAnimationFrame(step)
    }

    function flyTo(target: ViewTarget) {
      zoomGoal = 0
      const goal: { lat_deg: number; lon_deg: number; distance: number } =
        target === 'south'
          ? { lat_deg: -89.5, lon_deg: 0, distance: 1.9 }
          : target === 'north'
            ? { lat_deg: 89.5, lon_deg: 0, distance: 1.9 }
            : target === 'near'
              ? { lat_deg: 0, lon_deg: 0, distance: 3.4 }
              : { lat_deg: target.lat_deg, lon_deg: target.lon_deg, distance: 1.9 }
      const position = latLonToVector3(goal.lat_deg, goal.lon_deg, goal.distance)
      animateTo(new THREE.Spherical().setFromVector3(new THREE.Vector3(position.x, position.y, position.z)), FLY_MS)
    }

    function zoom(direction: 1 | -1) {
      const current = new THREE.Spherical().setFromVector3(camera.position)
      const factor = direction === 1 ? ZOOM_IN : ZOOM_OUT
      const base = zoomGoal || current.radius
      zoomGoal = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, base * factor))
      animateTo(new THREE.Spherical(zoomGoal, current.phi, current.theta), ZOOM_MS, () => {
        zoomGoal = 0
      })
    }

    // --- Pointer, hover, click, wheel -----------------------------

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let downX = 0
    let downY = 0
    let dragged = false
    let hoverFrame = 0
    let lastHoverEvent: PointerEvent | null = null

    function setPointer(event: MouseEvent) {
      const rect = canvas.getBoundingClientRect()
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
    }

    function hitTest() {
      const markerHit = raycaster.intersectObjects(markers.children, true)[0] ?? null
      const candidateHit = candidateMarkers.visible
        ? (raycaster.intersectObjects(candidateMarkers.children, false)[0] ?? null)
        : null
      const surfaceHit = raycaster.intersectObject(globe, false)[0] ?? null
      const best =
        candidateHit && (!markerHit || candidateHit.distance < markerHit.distance) ? candidateHit : markerHit
      const onMarker = best !== null && (surfaceHit === null || best.distance <= surfaceHit.distance)
      return { marker: onMarker ? best : null, surface: surfaceHit }
    }

    function markerData(object: THREE.Object3D): Partial<MarkerData> {
      return object.userData as Partial<MarkerData>
    }

    function updateHover(event: PointerEvent) {
      setPointer(event)
      const { marker, surface } = hitTest()
      const data = marker ? markerData(marker.object) : null

      const nextCandidate = typeof data?.candidateId === 'string' ? data.candidateId : null
      if (nextCandidate !== hoveredCandidateId) {
        hoveredCandidateId = nextCandidate
        actions.current.onCandidateHover?.(nextCandidate)
      }

      const nextKey = typeof data?.key === 'string' ? data.key : null
      if (nextKey !== hoveredKey) {
        hoveredKey = nextKey
        requestRender()
      }

      if (data && typeof data.lat_deg === 'number' && typeof data.lon_deg === 'number') {
        actions.current.onHover?.({ lat_deg: data.lat_deg, lon_deg: data.lon_deg, label: data.label })
        return
      }
      if (surface) {
        const { lat_deg, lon_deg } = vectorToLatLon(surface.point)
        actions.current.onHover?.({ lat_deg, lon_deg })
        return
      }
      actions.current.onHover?.(null)
    }

    function onPointerDown(event: PointerEvent) {
      downX = event.clientX
      downY = event.clientY
      dragged = false
      stage.classList.add('is-dragging')
    }

    function onPointerUp() {
      stage.classList.remove('is-dragging')
    }

    function onPointerMove(event: PointerEvent) {
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > 4) dragged = true
      if (event.buttons !== 0) return
      lastHoverEvent = event
      if (hoverFrame) return
      hoverFrame = requestAnimationFrame(() => {
        hoverFrame = 0
        if (lastHoverEvent) updateHover(lastHoverEvent)
      })
    }

    function onPointerLeave() {
      if (hoveredCandidateId !== null) {
        hoveredCandidateId = null
        actions.current.onCandidateHover?.(null)
      }
      if (hoveredKey !== null) {
        hoveredKey = null
        requestRender()
      }
      actions.current.onHover?.(null)
    }

    function onClick(event: MouseEvent) {
      if (dragged) return // that was rotating the globe, not a click
      setPointer(event)
      const { marker, surface } = hitTest()
      if (marker) {
        const data = markerData(marker.object)
        if (typeof data.candidateId === 'string') {
          actions.current.onCandidateSelect?.(data.candidateId)
        } else if (typeof data.scenarioId === 'string') {
          actions.current.onSelect(data.scenarioId)
        } else if (typeof data.lat_deg === 'number' && typeof data.lon_deg === 'number') {
          actions.current.onPick(data.lat_deg, data.lon_deg)
        }
        return
      }
      if (surface) {
        const { lat_deg, lon_deg } = vectorToLatLon(surface.point)
        actions.current.onPick(lat_deg, lon_deg)
      }
    }

    function onWheel(event: WheelEvent) {
      setPointer(event)
      // Outside the globe disc we do not take the wheel - the page scrolls normally.
      if (raycaster.intersectObject(globe, false).length === 0) return
      event.preventDefault()
      zoom(event.deltaY > 0 ? -1 : 1)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    // Releasing the button may happen outside the canvas (dragging); we remove
    // the cursor class globally so the "hand" does not stay.
    window.addEventListener('pointerup', onPointerUp)
    controls.addEventListener('change', requestRender)

    const observer = new ResizeObserver(resize)
    observer.observe(stage)
    resize()

    globeRef.current = {
      setMarkers(nextSites, nextScenarios, nextActiveId) {
        siteRows = nextSites
        scenarioRows = nextScenarios
        activeScenarioId = nextActiveId
        // Geometries and materials are shared - clearing the group does not dispose them.
        markers.clear()
        activeRing = null

        for (const site of nextSites) {
          const mesh = new THREE.Mesh(siteGeometry, siteMaterial)
          placeOnSphere(mesh, site.lat_deg, site.lon_deg, SITE_RADIUS)
          mesh.userData = {
            key: `site:${site.id}`,
            lat_deg: site.lat_deg,
            lon_deg: site.lon_deg,
            label: site.name,
          } satisfies MarkerData
          markers.add(mesh)
        }

        for (const scenario of nextScenarios) {
          const active = scenario.id === nextActiveId
          const mesh = new THREE.Mesh(
            active ? activeGeometry : scenarioGeometry,
            active ? activeMaterial : scenarioMaterial,
          )
          placeOnSphere(mesh, scenario.lat_deg, scenario.lon_deg, active ? ACTIVE_RADIUS : SCENARIO_RADIUS)
          mesh.userData = {
            key: `scenario:${scenario.id}`,
            lat_deg: scenario.lat_deg,
            lon_deg: scenario.lon_deg,
            label: scenario.name,
            scenarioId: scenario.id,
          } satisfies MarkerData
          markers.add(mesh)

          if (active) {
            const ring = new THREE.Mesh(activeRingGeometry, activeRingMaterial)
            placeOnSphere(ring, scenario.lat_deg, scenario.lon_deg, 0.004)
            ring.userData = mesh.userData
            ring.renderOrder = 2
            markers.add(ring)
            activeRing = ring
          }
        }

        rebuildLabels()
        requestRender()
      },
      setBodies(nextSubsolar, nextSubearth) {
        sunPoint = nextSubsolar
        earthPoint = nextSubearth

        // Without data we leave the Sun over the point (0°, 0°) so the globe is not black.
        const light = nextSubsolar
          ? latLonToVector3(nextSubsolar.lat_deg, nextSubsolar.lon_deg, 8)
          : { x: 8, y: 0, z: 0 }
        sunLight.position.set(light.x, light.y, light.z)

        setHorizon(terminator, nextSubsolar)
        setHorizon(earthLimit, nextSubearth)

        sunMarker.visible = nextSubsolar !== null
        if (nextSubsolar) placeOnSphere(sunMarker, nextSubsolar.lat_deg, nextSubsolar.lon_deg, 0.012)
        earthMarker.visible = nextSubearth !== null
        if (nextSubearth) placeOnSphere(earthMarker, nextSubearth.lat_deg, nextSubearth.lon_deg, 0.012)

        rebuildLabels()
        requestRender()
      },
      flyTo(target) {
        flyTo(target)
      },
      zoom(direction) {
        zoom(direction)
      },
      setOverlay(enabled, site) {
        overlay.visible = enabled
        candidateMarkers.visible = enabled
        if (site) drawOverlay(site)
        // Without data we do not show the old texture (e.g. after a request error).
        else clearOverlay()

        // First switch-on with data: camera to the best point.
        if (enabled && site && !flownToOptimal) {
          flownToOptimal = true
          flyTo({ lat_deg: site.optimal.lat_deg, lon_deg: site.optimal.lon_deg })
        }
        if (!enabled) flownToOptimal = false
        placeFocus()
        requestRender()
      },
      setCandidates(rows) {
        candidateRows = rows
        clearCandidates()
        for (const row of rows) {
          const { candidate } = row
          const radius = row.rank <= CANDIDATE_TOP_RANKS ? CANDIDATE_TOP : CANDIDATE_SMALL
          const data = {
            key: `cand:${candidate.id}`,
            candidateId: candidate.id,
            lat_deg: candidate.lat_deg,
            lon_deg: candidate.lon_deg,
            label: `${row.label} · score ${candidate.score.toFixed(1)}`,
          } satisfies MarkerData
          const fill = new THREE.MeshBasicMaterial({ color: scoreColor(candidate.score / 100) })
          candidateMaterials.push(fill)
          const outline = new THREE.Mesh(discGeometry(radius + CANDIDATE_OUTLINE), outlineMaterial)
          const disc = new THREE.Mesh(discGeometry(radius), fill)
          faceOutward(outline, candidate.lat_deg, candidate.lon_deg, CANDIDATE_RADIUS - 0.0005)
          faceOutward(disc, candidate.lat_deg, candidate.lon_deg, CANDIDATE_RADIUS)
          outline.renderOrder = 2
          disc.renderOrder = 2
          outline.userData = data
          disc.userData = data
          candidateMarkers.add(outline, disc)
        }
        rebuildLabels()
        placeFocus()
        requestRender()
      },
      setCandidateFocus(highlight, selected) {
        const selectionChanged = selected !== selectedCandidateId
        hoveredId = highlight
        selectedCandidateId = selected
        if (selectionChanged) rebuildLabels()
        placeFocus()
        requestRender()
      },
    }

    return () => {
      if (frame) cancelAnimationFrame(frame)
      if (flyFrame) cancelAnimationFrame(flyFrame)
      if (hoverFrame) cancelAnimationFrame(hoverFrame)
      observer.disconnect()
      controls.dispose()

      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('wheel', onWheel)
      window.removeEventListener('pointerup', onPointerUp)
      controls.removeEventListener('change', requestRender)

      for (const label of labels) label.el.remove()
      labelLayer.remove()
      markers.clear()
      activeRing = null

      for (const child of [...graticule.children]) {
        const line = child as THREE.Line
        line.geometry.dispose()
        ;(line.material as THREE.Material).dispose()
      }
      graticule.clear()
      for (const line of [terminator, earthLimit]) {
        line.geometry.dispose()
        ;(line.material as THREE.Material).dispose()
      }
      for (const mesh of [sunMarker, earthMarker]) {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
      bodyMarkers.clear()

      siteGeometry.dispose()
      siteMaterial.dispose()
      scenarioGeometry.dispose()
      scenarioMaterial.dispose()
      activeGeometry.dispose()
      activeMaterial.dispose()
      activeRingGeometry.dispose()
      activeRingMaterial.dispose()

      globeGeometry.dispose()
      globeMaterial.dispose()
      texture.dispose()
      overlayGeometry.dispose()
      overlayMaterial.dispose()
      overlayTexture.dispose()
      clearCandidates()
      for (const geometry of candidateGeometries.values()) geometry.dispose()
      outlineMaterial.dispose()
      focusGeometry.dispose()
      focusMaterial.dispose()
      sunLight.dispose()

      renderer.forceContextLoss()
      renderer.dispose()
      canvas.remove()
      globeRef.current = null
    }
  }, [])

  useEffect(() => {
    globeRef.current?.setMarkers(sites, scenarios, activeId)
  }, [sites, scenarios, activeId])

  useEffect(() => {
    globeRef.current?.setBodies(subsolar, subearth)
  }, [subsolar, subearth])

  useEffect(() => {
    if (viewRequest) globeRef.current?.flyTo(viewRequest.target)
  }, [viewRequest])

  useEffect(() => {
    if (zoomRequest) globeRef.current?.zoom(zoomRequest.direction)
  }, [zoomRequest])

  useEffect(() => {
    globeRef.current?.setOverlay(overlayEnabled, optimalSite)
  }, [overlayEnabled, optimalSite])

  useEffect(() => {
    globeRef.current?.setCandidates(overlayEnabled ? candidates : [])
  }, [overlayEnabled, candidates])

  useEffect(() => {
    globeRef.current?.setCandidateFocus(highlightId, selectedId)
  }, [highlightId, selectedId, candidates, overlayEnabled])

  return (
    <div
      className="map-globe"
      ref={hostRef}
      role="img"
      aria-label="Rotatable 3D globe of the Moon with landing sites"
      title="Drag to rotate · scroll to zoom · click to place the scenario"
    />
  )
}
