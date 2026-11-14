import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Site } from '../../api/types'
import type { Scenario } from '../../app/scenario'
import { latLonToVector3, type Vec3, vectorToLatLon } from './geo'

// Tekstura: NASA SVS "CGI Moon Kit" (SVS 4720), mapa barwna z mozaiki LROC WAC.
// https://svs.gsfc.nasa.gov/4720/ - dane NASA, domena publiczna, kadr 2048x1024.
const TEXTURE_URL = '/moon_lroc_color_2k.jpg'
const SITE_COLOR = 0x9aa4b5
const SCENARIO_COLOR = 0xd0a640
const ACTIVE_COLOR = 0xf2c14e

export interface MoonGlobeProps {
  sites: Site[]
  scenarios: Scenario[]
  activeId: string
  /** Kierunek do Słońca w chwili kursora; `null`, dopóki nie ma danych. */
  sunDir: Vec3 | null
  onSelect: (id: string) => void
  onPick: (lat_deg: number, lon_deg: number) => void
  /** Każda zmiana wartości przenosi kamerę nad biegun południowy. */
  southPoleRequest: number
}

interface GlobeApi {
  setMarkers(sites: Site[], scenarios: Scenario[], activeId: string): void
  setSun(dir: Vec3 | null): void
  lookSouth(): void
}

export default function MoonGlobe({
  sites,
  scenarios,
  activeId,
  sunDir,
  onSelect,
  onPick,
  southPoleRequest,
}: MoonGlobeProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeApi | null>(null)
  // Akcje powłoki w ref, żeby scena three.js powstała raz, a nie przy każdym renderze.
  const actions = useRef({ onSelect, onPick })

  useEffect(() => {
    actions.current = { onSelect, onPick }
  }, [onSelect, onPick])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50)
    camera.position.set(3.4, 0.5, 0)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.minDistance = 1.4
    controls.maxDistance = 6
    controls.rotateSpeed = 0.6
    controls.update()

    // Mapa NASA ma długość 0° na środku i rośnie na wschód, a SphereGeometry
    // kładzie u = 0.75 na −Z - w naszym układzie to wschód. Kadr pasuje bez odbicia;
    // odbicie lustrzane przestawia Mare Crisium na zachodnią stronę.
    const texture = new THREE.TextureLoader().load(TEXTURE_URL, requestRender)
    texture.colorSpace = THREE.SRGBColorSpace

    const globeGeometry = new THREE.SphereGeometry(1, 96, 64)
    const globeMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 })
    const globe = new THREE.Mesh(globeGeometry, globeMaterial)
    scene.add(globe)

    // Słońce rzeźbi dzień i noc; słabe, chłodne światło otoczenia to "poświata Ziemi",
    // dzięki której nocna strona nie jest czarną plamą i widać na niej morza.
    // Intensywność dobrana tak, żeby jasne wyżyny nie wypalały się do bieli.
    const sunLight = new THREE.DirectionalLight(0xfff3e0, 1.3)
    scene.add(sunLight, new THREE.AmbientLight(0xa8bcd8, 0.3))

    const markers = new THREE.Group()
    scene.add(markers)

    let frame = 0
    function requestRender() {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        controls.update()
        renderer.render(scene, camera)
      })
    }

    function resize() {
      // `host` jest już sprawdzony wyżej; TS nie przenosi tego zawężenia do domknięcia.
      const width = host!.clientWidth
      const height = host!.clientHeight
      if (!width || !height) return
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      requestRender()
    }

    function disposeMarkers() {
      for (const child of [...markers.children]) {
        const mesh = child as THREE.Mesh
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      }
      markers.clear()
    }

    function marker(lat_deg: number, lon_deg: number, size: number, color: number, data: object) {
      const position = latLonToVector3(lat_deg, lon_deg, 1 + size)
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 12),
        new THREE.MeshBasicMaterial({ color }),
      )
      mesh.position.set(position.x, position.y, position.z)
      mesh.userData = data
      return mesh
    }

    globeRef.current = {
      setMarkers(nextSites, nextScenarios, nextActiveId) {
        disposeMarkers()
        for (const site of nextSites) {
          markers.add(
            marker(site.lat_deg, site.lon_deg, 0.008, SITE_COLOR, {
              lat_deg: site.lat_deg,
              lon_deg: site.lon_deg,
            }),
          )
        }
        for (const scenario of nextScenarios) {
          const isActive = scenario.id === nextActiveId
          const size = isActive ? 0.022 : 0.014
          const data = { scenarioId: scenario.id }
          markers.add(
            marker(scenario.lat_deg, scenario.lon_deg, size, isActive ? ACTIVE_COLOR : SCENARIO_COLOR, data),
          )
        }
        requestRender()
      },
      setSun(dir) {
        // Bez danych zostawiamy Słońce nad punktem (0°, 0°), żeby globus nie był czarny.
        const light = dir ?? { x: 1, y: 0, z: 0 }
        sunLight.position.set(light.x * 8, light.y * 8, light.z * 8)
        requestRender()
      },
      lookSouth() {
        // 60°S, nie sam biegun: nad biegunem kamera z `up = +Y` jest zdegenerowana.
        const position = latLonToVector3(-60, 0, camera.position.length())
        camera.position.set(position.x, position.y, position.z)
        controls.update()
        requestRender()
      },
    }

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let downX = 0
    let downY = 0
    let dragged = false

    function onPointerDown(event: PointerEvent) {
      downX = event.clientX
      downY = event.clientY
      dragged = false
    }

    function onPointerMove(event: PointerEvent) {
      if (Math.hypot(event.clientX - downX, event.clientY - downY) > 4) dragged = true
    }

    function onClick(event: MouseEvent) {
      if (dragged) return // to było obracanie globusa, nie kliknięcie
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)

      // Najbliższe trafienie wygrywa: znacznik po drugiej stronie kuli jest zasłonięty.
      const hit = raycaster.intersectObjects(markers.children, false)[0]
      const surface = raycaster.intersectObject(globe, false)[0]
      if (hit && (!surface || hit.distance <= surface.distance)) {
        const data = hit.object.userData
        if (typeof data.scenarioId === 'string') actions.current.onSelect(data.scenarioId)
        else actions.current.onPick(Number(data.lat_deg), Number(data.lon_deg))
        return
      }
      if (surface) {
        const { lat_deg, lon_deg } = vectorToLatLon(surface.point)
        actions.current.onPick(lat_deg, lon_deg)
      }
    }

    const canvas = renderer.domElement
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('click', onClick)
    controls.addEventListener('change', requestRender)

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    return () => {
      if (frame) cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('click', onClick)
      controls.removeEventListener('change', requestRender)
      disposeMarkers()
      globeGeometry.dispose()
      globeMaterial.dispose()
      texture.dispose()
      sunLight.dispose()
      renderer.dispose()
      host.removeChild(canvas)
      globeRef.current = null
    }
  }, [])

  useEffect(() => {
    globeRef.current?.setMarkers(sites, scenarios, activeId)
  }, [sites, scenarios, activeId])

  useEffect(() => {
    globeRef.current?.setSun(sunDir)
  }, [sunDir])

  useEffect(() => {
    if (southPoleRequest > 0) globeRef.current?.lookSouth()
  }, [southPoleRequest])

  return (
    <div
      className="map-globe"
      ref={hostRef}
      role="img"
      aria-label="Rotatable 3D globe of the Moon with landing sites"
    />
  )
}
