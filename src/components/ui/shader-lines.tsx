"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    THREE: any
  }
}

export function ShaderAnimation() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    camera: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scene: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderer: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uniforms: any
    animationId: number | null
    resizeHandler: (() => void) | null
  }>({
    camera: null,
    scene: null,
    renderer: null,
    uniforms: null,
    animationId: null,
    resizeHandler: null,
  })

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/89/three.min.js"
    script.onload = () => {
      if (containerRef.current && window.THREE) {
        initThreeJS()
      }
    }
    document.head.appendChild(script)

    return () => {
      if (sceneRef.current.animationId) {
        cancelAnimationFrame(sceneRef.current.animationId)
      }
      if (sceneRef.current.resizeHandler) {
        window.removeEventListener("resize", sceneRef.current.resizeHandler)
      }
      if (sceneRef.current.renderer) {
        sceneRef.current.renderer.dispose()
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initThreeJS = () => {
    if (!containerRef.current || !window.THREE) return

    const THREE = window.THREE
    const container = containerRef.current

    container.innerHTML = ""

    const camera = new THREE.Camera()
    camera.position.z = 1

    const scene = new THREE.Scene()
    const geometry = new THREE.PlaneBufferGeometry(2, 2)

    const uniforms = {
      time: { type: "f", value: 1.0 },
      resolution: { type: "v2", value: new THREE.Vector2() },
    }

    const vertexShader = `
      void main() {
        gl_Position = vec4( position, 1.0 );
      }
    `

    // NXT//LINK themed shader — cyan (#00d4ff) + orange (#ff6600) flowing lines
    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;

      float random(in float x) {
        return fract(sin(x) * 1e4);
      }

      void main(void) {
        vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);

        vec2 fMosaicScal = vec2(4.0, 2.0);
        vec2 vScreenSize = vec2(256.0, 256.0);
        uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
        uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);

        float t = time * 0.06 + random(uv.x) * 0.4;
        float lineWidth = 0.0008;

        vec3 color = vec3(0.0);
        for (int j = 0; j < 3; j++) {
          for (int i = 0; i < 5; i++) {
            color[j] += lineWidth * float(i * i) /
              abs(fract(t - 0.01 * float(j) + float(i) * 0.01) * 1.0 - length(uv));
          }
        }

        // Remap: R→cyan-blue, G→cyan-green, B→orange
        // Original color[2]=R, color[1]=G, color[0]=B
        float cyan_r = color[1] * 0.0;
        float cyan_g = color[1] * 0.83;
        float cyan_b = color[1] * 1.0;

        float orange_r = color[2] * 1.0;
        float orange_g = color[2] * 0.4;
        float orange_b = color[2] * 0.0;

        float base_r = color[0] * 0.07;
        float base_g = color[0] * 0.08;
        float base_b = color[0] * 0.1;

        vec3 final_color = vec3(
          cyan_r + orange_r + base_r,
          cyan_g + orange_g + base_g,
          cyan_b + orange_b + base_b
        );

        gl_FragColor = vec4(final_color, 1.0);
      }
    `

    const material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const renderer = new THREE.WebGLRenderer()
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    const onWindowResize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(rect.width, rect.height)
      uniforms.resolution.value.x = renderer.domElement.width
      uniforms.resolution.value.y = renderer.domElement.height
    }

    sceneRef.current = {
      camera,
      scene,
      renderer,
      uniforms,
      animationId: null,
      resizeHandler: onWindowResize,
    }

    onWindowResize()
    window.addEventListener("resize", onWindowResize, false)

    const animate = () => {
      sceneRef.current.animationId = requestAnimationFrame(animate)
      uniforms.time.value += 0.05
      renderer.render(scene, camera)
    }

    animate()
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0"
    />
  )
}
