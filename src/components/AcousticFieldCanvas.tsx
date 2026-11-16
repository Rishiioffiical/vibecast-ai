import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

interface AcousticFieldCanvasProps {
  accentColor: string;
  secondaryColor: string;
  canvasBg: string;
  isGenerating: boolean;
  isPlaying: boolean;
  speed: number;
  visualMode: 'full' | 'wireframe' | 'particles' | 'minimal';
}

export const AcousticFieldCanvas: React.FC<AcousticFieldCanvasProps> = ({
  accentColor,
  secondaryColor,
  canvasBg,
  isGenerating,
  isPlaying,
  speed,
  visualMode,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Store reactive props in a ref so React updates never tear down or recreate the WebGL context
  const stateRef = useRef({
    accentColor,
    secondaryColor,
    canvasBg,
    isGenerating,
    isPlaying,
    speed,
    visualMode,
  });

  useEffect(() => {
    stateRef.current = {
      accentColor,
      secondaryColor,
      canvasBg,
      isGenerating,
      isPlaying,
      speed,
      visualMode,
    };
  }, [accentColor, secondaryColor, canvasBg, isGenerating, isPlaying, speed, visualMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection from GPU renderer string
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const domCanvas = renderer.domElement;
    domCanvas.style.display = 'block';
    domCanvas.style.width = '100%';
    domCanvas.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(domCanvas);

    // 2. Scene, Fog & Camera
    const scene = new THREE.Scene();
    const bgCol = new THREE.Color(stateRef.current.canvasBg || '#0B100D');
    scene.fog = new THREE.FogExp2(bgCol, 0.065);

    const camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.1,
      100
    );
    camera.position.set(0, 0, 7.2);

    // 3. Studio Environment Map & Warm/Cool 3-Point Lighting Rig
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x09120d, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff3e0, 1.8);
    keyLight.position.set(5, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38d9a9, 1.4);
    rimLight.position.set(-5, -3, -4);
    scene.add(rimLight);

    // 4. Composite 3D Acoustic Group (Harmonic Core + Geodesic Wireframe + Orbital Rings + Acoustic Nodes)
    const group = new THREE.Group();
    // Position slightly to the right-center on wide viewports for balanced composition
    group.position.set(0, 0.15, 0);
    scene.add(group);

    // (A) Inner Harmonic Core ("blob" with organic acoustic shader displacement)
    const blobGeo = new THREE.IcosahedronGeometry(1.38, isSoftwareGl ? 3 : 5);
    const blobMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uEnergy: { value: 0.22 },
        uColorPrimary: { value: new THREE.Color(stateRef.current.accentColor) },
        uColorSecondary: { value: new THREE.Color(stateRef.current.secondaryColor) },
        uOpacity: { value: 0.42 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uEnergy;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying float vDisp;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          float wave1 = sin(position.x * 3.2 + uTime * 1.7) * cos(position.y * 2.8 + uTime * 1.3);
          float wave2 = sin(position.z * 4.1 - uTime * 2.1) * 0.5;
          float disp = (wave1 + wave2) * uEnergy;
          vDisp = disp;
          vec3 displaced = position + normal * disp;
          vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
          vViewPos = -mvPos.xyz;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorPrimary;
        uniform vec3 uColorSecondary;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying float vDisp;

        void main() {
          vec3 n = normalize(vNormal);
          vec3 v = normalize(vViewPos);
          float fresnel = pow(1.0 - max(0.0, dot(n, v)), 2.6);
          float mixFactor = clamp(vDisp * 2.2 + 0.5, 0.0, 1.0);
          vec3 baseCol = mix(uColorSecondary * 0.35, uColorPrimary, mixFactor);
          vec3 finalCol = baseCol + mix(uColorSecondary, uColorPrimary, 0.5) * fresnel * 1.35;
          float alpha = clamp((0.18 + fresnel * 0.72) * uOpacity, 0.0, 0.85);
          gl_FragColor = vec4(finalCol, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const blob = new THREE.Mesh(blobGeo, blobMat);
    group.add(blob);

    // (B) Outer Geodesic Wireframe Shell ("wire")
    const wireGeo = new THREE.IcosahedronGeometry(1.92, 2);
    const wireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(stateRef.current.secondaryColor),
      wireframe: true,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    group.add(wire);

    // (C) Secondary Acoustic Gimbal Rings (Composite silhouette parts)
    const ringGroup = new THREE.Group();
    const ringGeo1 = new THREE.TorusGeometry(2.38, 0.008, 12, 96);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: new THREE.Color(stateRef.current.accentColor),
      metalness: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.35,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI * 0.38;
    ringGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(2.72, 0.006, 12, 96);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: new THREE.Color(stateRef.current.secondaryColor),
      metalness: 0.85,
      roughness: 0.45,
      transparent: true,
      opacity: 0.24,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI * 0.28;
    ring2.rotation.x = -Math.PI * 0.22;
    ringGroup.add(ring2);
    group.add(ringGroup);

    // (D) Instanced Harmonic Nodes along Equatorial Orbit (>20 repeated elements -> InstancedMesh)
    const nodeCount = 36;
    const nodeGeo = new THREE.OctahedronGeometry(0.032, 0);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.8,
    });
    const nodeInstanced = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    const dummyScale = new THREE.Vector3();
    const dummyCol = new THREE.Color();

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const radius = 2.38 + (i % 2 === 0 ? 0.0 : 0.34);
      dummyPos.set(
        Math.cos(angle) * radius,
        Math.sin(angle * 2) * 0.28,
        Math.sin(angle) * radius
      );
      const s = 0.85 + (i % 3) * 0.15;
      dummyScale.set(s, s, s);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      nodeInstanced.setMatrixAt(i, dummyMatrix);
      dummyCol.set(i % 2 === 0 ? stateRef.current.accentColor : stateRef.current.secondaryColor);
      nodeInstanced.setColorAt(i, dummyCol);
    }
    nodeInstanced.instanceMatrix.needsUpdate = true;
    if (nodeInstanced.instanceColor) nodeInstanced.instanceColor.needsUpdate = true;
    nodeInstanced.computeBoundingSphere();
    group.add(nodeInstanced);

    // (E) Custom Shader Particle Field ("pMat.uniforms.uAlpha.value = S.alpha")
    const particleCount = isSoftwareGl ? 420 : 950;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    const pScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const r = 2.1 + Math.random() * 5.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pPositions[i * 3 + 2] = r * Math.cos(phi);
      pScales[i] = 0.4 + Math.random() * 1.4;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('aScale', new THREE.BufferAttribute(pScales, 1));

    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAlpha: { value: 0.65 },
        uColor: { value: new THREE.Color(stateRef.current.secondaryColor) },
      },
      vertexShader: `
        attribute float aScale;
        uniform float uTime;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          pos.y += sin(uTime * 0.45 + position.x * 0.8) * 0.14;
          pos.x += cos(uTime * 0.35 + position.z * 0.8) * 0.12;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = clamp(aScale * (14.0 / -mvPosition.z), 1.0, 5.5);
          vAlpha = smoothstep(10.0, 2.2, -mvPosition.z);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uAlpha;
        varying float vAlpha;

        void main() {
          vec2 cxy = 2.0 * gl_PointCoord - 1.0;
          float r = dot(cxy, cxy);
          if (r > 1.0) discard;
          float soft = 1.0 - r;
          gl_FragColor = vec4(uColor, soft * vAlpha * uAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 5. Mouse, Scroll & State Kinematic Variables (Zero GC in loop)
    const mouseTarget = { x: 0, y: 0 };
    const mouseS = { x: 0, y: 0 };
    const S = {
      alpha: 0.62,
      blob: 1.0,
      wire: 0.28,
      rot: 0,
      energy: 0.14,
    };

    const handlePointerMove = (e: PointerEvent) => {
      mouseTarget.x = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      mouseTarget.y = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
    };

    const handleScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      S.rot = progress * Math.PI * 2;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    // WebGL Context Lost / Restored safety
    let contextLost = false;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const onContextRestored = () => {
      contextLost = false;
    };
    domCanvas.addEventListener('webglcontextlost', onContextLost);
    domCanvas.addEventListener('webglcontextrestored', onContextRestored);

    // 6. Render Loop with Software WebGL Fence Pacing
    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;

    const targetColorA = new THREE.Color();
    const targetColorB = new THREE.Color();

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isDisposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (isDisposed) return;
      const dt = Math.min(0.1, clock.getDelta());
      const t = clock.getElapsedTime();
      const current = stateRef.current;

      if (!contextLost && current.visualMode !== 'minimal') {
        // Smoothly damp mouse & visual state parameters
        mouseS.x = THREE.MathUtils.damp(mouseS.x, mouseTarget.x, 4.5, dt);
        mouseS.y = THREE.MathUtils.damp(mouseS.y, mouseTarget.y, 4.5, dt);

        const activeBoost = current.isGenerating ? 1.55 : current.isPlaying ? 1.28 : 1.0;
        const targetBlob =
          current.visualMode === 'full' ? 0.95 * activeBoost : current.visualMode === 'wireframe' ? 0.35 : 0.0;
        const targetWire =
          current.visualMode === 'full'
            ? 0.32 * activeBoost
            : current.visualMode === 'wireframe'
            ? 0.55
            : 0.08;
        const targetAlpha = current.visualMode === 'particles' ? 0.85 : 0.58;
        const targetEnergy = current.isGenerating
          ? 0.28
          : current.isPlaying
          ? 0.21 * Math.max(0.7, current.speed)
          : 0.11;

        S.blob = THREE.MathUtils.damp(S.blob, targetBlob, 4.0, dt);
        S.wire = THREE.MathUtils.damp(S.wire, targetWire, 4.0, dt);
        S.alpha = THREE.MathUtils.damp(S.alpha, targetAlpha, 4.0, dt);
        S.energy = THREE.MathUtils.damp(S.energy, targetEnergy, 5.0, dt);

        // Sync Theme Colors smoothly
        targetColorA.set(current.accentColor || '#E65C6E');
        targetColorB.set(current.secondaryColor || '#38D9A9');
        blobMat.uniforms.uColorPrimary.value.lerp(targetColorA, 0.08);
        blobMat.uniforms.uColorSecondary.value.lerp(targetColorB, 0.08);
        pMat.uniforms.uColor.value.lerp(targetColorB, 0.08);
        wireMat.color.lerp(targetColorB, 0.08);

        // Apply inspired kinetic & shader transforms from reference
        pMat.uniforms.uTime.value = t;
        pMat.uniforms.uAlpha.value = S.alpha;

        blobMat.uniforms.uTime.value = t * Math.max(0.6, current.speed);
        blobMat.uniforms.uEnergy.value = S.energy;
        blob.scale.setScalar(Math.max(S.blob, 0.0001));
        blob.visible = S.blob > 0.01;

        wireMat.opacity = S.wire * 0.8;
        wire.rotation.set(t * 0.1, t * 0.15, 0);

        ringGroup.rotation.z = -t * 0.08;
        ringGroup.rotation.y = t * 0.12;
        nodeInstanced.rotation.y = t * 0.14;

        group.rotation.y = S.rot * 0.25 + mouseS.x * 0.35 + t * 0.05;
        group.rotation.x = mouseS.y * -0.25;

        particles.rotation.y = -t * 0.02 + mouseS.x * 0.08;

        renderer.render(scene, camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      domCanvas.removeEventListener('webglcontextlost', onContextLost);
      domCanvas.removeEventListener('webglcontextrestored', onContextRestored);

      blobGeo.dispose();
      blobMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      pGeo.dispose();
      pMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-0 transition-opacity duration-500 ${
        visualMode === 'minimal' ? 'opacity-0' : 'opacity-100'
      }`}
    />
  );
};
