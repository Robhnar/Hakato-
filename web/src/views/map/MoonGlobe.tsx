import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { OptimalSiteResponse, Site } from '../../api/types'
import type { Scenario } from '../../app/scenario'
import { latLonToVector3, type Vec3, vectorToLatLon } from './geo'
import { buildOverlayPixels } from './heatmap'

// Tekstura: NASA SVS "CGI Moon Kit" (SVS 4720), mapa barwna z mozaiki LROC WAC.
// https://svs.gsfc.nasa.gov/4720/ - dane NASA, domena publiczna, kadr 2048x1024.
const TEXTURE_URL = '/moon_lroc_color_2k.jpg'
const SITE_COLOR = 0x9aa4b5
const SCENARIO_COLOR = 0xd0a640
const ACTIVE_COLOR = 0xf2c14e

// Nakładka ON/OFF (zadanie 019): bufor equirectangular 512x256 i znacznik.
const OVERLAY_WIDTH = 512
const OVERLAY_HEIGHT = 256
const OVERLAY_OPACITY = 0.48
const OPTIMAL_COLOR = 0x3ce08a
const OPTIMAL_RING_COLOR = 0x8bf3c0

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
  /** Warstwa stref zasilania/łączności i znacznika optymalnego punktu (019). */
  overlayEnabled?: boolean
  /** Wynik `/api/optimal-site`; `null` dopóki nie ma danych. */
  optimalSite?: OptimalSiteResponse | null
}

interface GlobeApi {
  setMarkers(sites: Site[], scenarios: Scenario[], activeId: string): void
  setSun(dir: Vec3 | null): void
  lookSouth(): void
  setOverlay(enabled: boolean, site: OptimalSiteResponse | null): void
}

export default function MoonGlobe({
  sites,
  scenarios,
  activeId,
  sunDir,
  onSelect,
  onPick,
  southPoleRequest,
  overlayEnabled = false,
  optimalSite = null,
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

    // Nakładka stref zasilania/łączności (zadanie 019). Sferę, teksturę i
    // materiały tworzymy razem ze sceną; przy zmianie propsów podmieniamy tylko
    // zawartość tekstury i widoczność - nigdy nie odtwarzamy renderera ani sceny.
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

    // Znacznik optymalnego punktu: szmaragdowa kula + pierścień pulsujący
    // w pętli animacji. Oba elementy istnieją od początku, tylko się ukrywają.
    const optimalMarker = new THREE.Group()
    const optimalGeometry = new THREE.SphereGeometry(0.03, 20, 16)
    const optimalMaterial = new THREE.MeshBasicMaterial({ color: OPTIMAL_COLOR })
    const optimalCore = new THREE.Mesh(optimalGeometry, optimalMaterial)
    optimalCore.userData = { optimal: true }
    optimalCore.renderOrder = 2
    const optimalRingGeometry = new THREE.RingGeometry(0.045, 0.065, 40)
    const optimalRingMaterial = new THREE.MeshBasicMaterial({
      color: OPTIMAL_RING_COLOR,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const optimalRing = new THREE.Mesh(optimalRingGeometry, optimalRingMaterial)
    optimalRing.userData = { optimal: true }
    optimalRing.renderOrder = 2
    optimalMarker.add(optimalCore, optimalRing)
    optimalMarker.visible = false
    scene.add(optimalMarker)

    function drawOverlay(site: OptimalSiteResponse) {
      if (!overlayContext) return
      const pixels = buildOverlayPixels(
        OVERLAY_WIDTH,
        OVERLAY_HEIGHT,
        site.cursor_bodies,
        site.ranking,
      )
      const image = overlayContext.createImageData(OVERLAY_WIDTH, OVERLAY_HEIGHT)
      image.data.set(pixels)
      overlayContext.putImageData(image, 0, 0)
      overlayTexture.needsUpdate = true
    }

    function clearOverlay() {
      overlayContext?.clearRect(0, 0, OVERLAY_WIDTH, OVERLAY_HEIGHT)
      overlayTexture.needsUpdate = true
    }

    function placeOptimal(lat_deg: number, lon_deg: number) {
      const position = latLonToVector3(lat_deg, lon_deg, 1.018)
      optimalMarker.position.set(position.x, position.y, position.z)
      optimalMarker.userData = { optimal: true, lat_deg, lon_deg }
      // Pierścień leży w płaszczyźnie XY - obracamy go wzdłuż normalnej kuli.
      const normal = new THREE.Vector3(position.x, position.y, position.z).normalize()
      optimalRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    }

    let pulseFrame = 0
    function stopPulse() {
      if (pulseFrame) cancelAnimationFrame(pulseFrame)
      pulseFrame = 0
      optimalRing.scale.setScalar(1)
    }

    function startPulse() {
      if (pulseFrame) return
      const tick = (time: number) => {
        if (!optimalMarker.visible) {
          pulseFrame = 0
          return
        }
        const wave = 0.5 + 0.5 * Math.sin(time / 320)
        optimalRing.scale.setScalar(1 + 0.28 * wave)
        requestRender()
        pulseFrame = requestAnimationFrame(tick)
      }
      pulseFrame = requestAnimationFrame(tick)
    }

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
      setOverlay(enabled, site) {
        overlay.visible = enabled
        optimalMarker.visible = enabled && site !== null

        if (site) {
          drawOverlay(site)
          placeOptimal(site.optimal.lat_deg, site.optimal.lon_deg)
        } else {
          // Bez danych nie pokazujemy starej tekstury (np. po błędzie zapytania).
          clearOverlay()
        }

        if (enabled && site) startPulse()
        else stopPulse()
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
      const targets: THREE.Object3D[] = [...markers.children]
      if (optimalMarker.visible) targets.push(optimalMarker)
      const hit = raycaster.intersectObjects(targets, true)[0]
      const surface = raycaster.intersectObject(globe, false)[0]
      if (hit && (!surface || hit.distance <= surface.distance)) {
        const data = hit.object.userData
        if (data.optimal === true) {
          // Kliknięcie znacznika przenosi aktywny scenariusz w punkt optymalny.
          const marker = optimalMarker.userData
          actions.current.onPick(Number(marker.lat_deg), Number(marker.lon_deg))
        } else if (typeof data.scenarioId === 'string') {
          actions.current.onSelect(data.scenarioId)
        } else {
          actions.current.onPick(Number(data.lat_deg), Number(data.lon_deg))
        }
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
      stopPulse()
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
      overlayGeometry.dispose()
      overlayMaterial.dispose()
      overlayTexture.dispose()
      optimalGeometry.dispose()
      optimalMaterial.dispose()
      optimalRingGeometry.dispose()
      optimalRingMaterial.dispose()
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

  useEffect(() => {
    globeRef.current?.setOverlay(overlayEnabled, optimalSite)
  }, [overlayEnabled, optimalSite])

  return (
    <div
      className="map-globe"
      ref={hostRef}
      role="img"
      aria-label="Rotatable 3D globe of the Moon with landing sites"
    />
  )
}
