"use client";

import { useEffect, useRef } from "react";
import type { BufferGeometry, Material, Object3D } from "three";

const particleCount = 6800;

export function SignalEngine() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let disposed = false;
    let teardown: (() => void) | undefined;

    async function mountScene(
      stage: HTMLDivElement,
      canvas: HTMLCanvasElement,
    ) {
      const THREE = await import("three");
      if (disposed) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        });
      } catch {
        return;
      }

      renderer.setClearColor(0x090909, 1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x090909);

      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 30);
      camera.position.set(0, 0, 9.2);
      camera.lookAt(0, 0, 0);

      const positions = new Float32Array(particleCount * 3);
      const targets = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const delays = new Float32Array(particleCount);
      const phases = new Float32Array(particleCount);
      const sizes = new Float32Array(particleCount);
      const particleColor = new THREE.Color(0xb8b8b8);
      const target = new THREE.Vector3();
      const fullTurn = Math.PI * 2;
      let randomSeed = 0x2f6e2b1;

      const random = () => {
        randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) | 0;
        return (randomSeed >>> 0) / 4294967296;
      };

      for (let index = 0; index < particleCount; index += 1) {
        const offset = index * 3;
        const cloudY = random() * 2 - 1;
        const cloudAngle = random() * fullTurn;
        const cloudRadius = 3.2 + random() ** 0.38 * 3.5;
        const cloudWidth = Math.sqrt(1 - cloudY * cloudY);
        positions[offset] =
          Math.cos(cloudAngle) * cloudWidth * cloudRadius * 1.18;
        positions[offset + 1] = cloudY * cloudRadius * 0.78;
        positions[offset + 2] = Math.sin(cloudAngle) * cloudWidth * cloudRadius;

        const around = random() * fullTurn;
        const tube = random() * fullTurn;
        const majorRadius = 1.25 + (random() - 0.5) * 0.045;
        const tubeRadius = 0.32 + (random() - 0.5) * 0.055;
        target.set(
          (majorRadius + tubeRadius * Math.cos(tube)) * Math.cos(around),
          (majorRadius + tubeRadius * Math.cos(tube)) * Math.sin(around),
          tubeRadius * Math.sin(tube),
        );

        targets[offset] = target.x;
        targets[offset + 1] = target.y;
        targets[offset + 2] = target.z;

        colors[offset] = particleColor.r;
        colors[offset + 1] = particleColor.g;
        colors[offset + 2] = particleColor.b;
        delays[index] = random();
        phases[index] = random() * fullTurn;
        sizes[index] = 0.8 + random() * 1.35;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      geometry.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
      geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("aDelay", new THREE.BufferAttribute(delays, 1));
      geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

      const particleMaterial = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uBurst: { value: 0 },
          uMorph: { value: 0 },
          uPixelRatio: { value: 1 },
          uTime: { value: 0 },
        },
        vertexShader: `
          attribute vec3 aTarget;
          attribute vec3 aColor;
          attribute float aDelay;
          attribute float aPhase;
          attribute float aSize;

          uniform float uBurst;
          uniform float uMorph;
          uniform float uPixelRatio;
          uniform float uTime;

          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            float localStart = aDelay * 0.24;
            float localEnd = 0.68 + aDelay * 0.32;
            float morph = smoothstep(localStart, localEnd, uMorph);
            morph = morph * morph * (3.0 - 2.0 * morph);

            vec3 cloud = position;
            float driftAngle = uTime * (0.025 + aDelay * 0.02);
            mat2 drift = mat2(
              cos(driftAngle), -sin(driftAngle),
              sin(driftAngle), cos(driftAngle)
            );
            cloud.xz = drift * cloud.xz;
            cloud.y += sin(uTime * 0.32 + aPhase) * 0.06;

            vec3 targetDirection = normalize(aTarget + vec3(0.001));
            vec3 assembled = aTarget +
              targetDirection * sin(uTime * 1.8 + aPhase) * 0.008;
            vec3 transformed = mix(cloud, assembled, morph);
            transformed += targetDirection * uBurst * (0.45 + aDelay * 1.45);

            vec4 modelPosition = modelMatrix * vec4(transformed, 1.0);
            vec4 viewPosition = viewMatrix * modelPosition;
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = clamp(
              aSize * uPixelRatio * (16.0 / max(1.0, -viewPosition.z)),
              0.8 * uPixelRatio,
              4.5 * uPixelRatio
            );

            vColor = aColor;
            vAlpha = mix(0.58, 1.0, morph) *
              smoothstep(17.0, 2.0, -viewPosition.z);
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            gl_FragColor = vec4(vColor, vAlpha);
          }
        `,
      });

      const particleField = new THREE.Points(geometry, particleMaterial);
      particleField.rotation.x = -0.1;
      particleField.position.y = -0.1;
      scene.add(particleField);

      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      let reducedMotion = motionQuery.matches;
      let animationFrame = 0;
      let inView = true;
      let lastTimestamp = 0;
      const pointerTarget = new THREE.Vector2();
      const pointerCurrent = new THREE.Vector2();
      const assemblyStartedAt = performance.now();

      const ease = (progress: number) =>
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - (-2 * progress + 2) ** 3 / 2;

      const renderFrame = (timestamp: number) => {
        const elapsed = reducedMotion
          ? 4.2
          : Math.max(0, timestamp - assemblyStartedAt) * 0.001;
        const delta = lastTimestamp
          ? Math.min((timestamp - lastTimestamp) / 1000, 0.08)
          : 0.016;
        lastTimestamp = timestamp;

        pointerCurrent.x = THREE.MathUtils.damp(
          pointerCurrent.x,
          pointerTarget.x,
          3.8,
          delta,
        );
        pointerCurrent.y = THREE.MathUtils.damp(
          pointerCurrent.y,
          pointerTarget.y,
          3.8,
          delta,
        );

        const assemblyAge = Math.max(0, timestamp - assemblyStartedAt);
        const morph = reducedMotion
          ? 1
          : ease(THREE.MathUtils.clamp((assemblyAge - 250) / 2450, 0, 1));

        particleMaterial.uniforms.uTime.value = elapsed;
        particleMaterial.uniforms.uMorph.value = morph;
        particleMaterial.uniforms.uBurst.value = 0;
        particleField.rotation.x =
          -0.1 + Math.sin(elapsed * 0.16) * 0.04 + pointerCurrent.y * 0.13;
        particleField.rotation.y = elapsed * 0.14 + pointerCurrent.x * 0.36;
        particleField.rotation.z = Math.sin(elapsed * 0.11) * 0.025;
        camera.position.x = pointerCurrent.x * 0.14;
        camera.position.y = pointerCurrent.y * 0.1;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
      };

      const tick = (timestamp: number) => {
        renderFrame(timestamp);
        animationFrame = window.requestAnimationFrame(tick);
      };

      const start = () => {
        window.cancelAnimationFrame(animationFrame);
        lastTimestamp = 0;
        if (reducedMotion || !inView || document.hidden) {
          renderFrame(performance.now());
          return;
        }
        animationFrame = window.requestAnimationFrame(tick);
      };

      const resize = () => {
        const bounds = stage.getBoundingClientRect();
        const width = Math.max(1, Math.floor(bounds.width));
        const height = Math.max(1, Math.floor(bounds.height));
        const pixelRatio = Math.min(
          window.devicePixelRatio || 1,
          width < 520 ? 1.5 : 1.8,
        );
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        particleMaterial.uniforms.uPixelRatio.value = pixelRatio;
        camera.aspect = width / height;
        camera.position.z =
          camera.aspect < 0.8 ? Math.max(9.2, 6.7 / camera.aspect) : 9.2;
        camera.updateProjectionMatrix();
        start();
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (reducedMotion) return;
        const bounds = stage.getBoundingClientRect();
        pointerTarget.set(
          ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
          -((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
        );
      };
      const resetPointer = () => pointerTarget.set(0, 0);
      const handleMotionChange = (event: MediaQueryListEvent) => {
        reducedMotion = event.matches;
        if (reducedMotion) {
          pointerTarget.set(0, 0);
          pointerCurrent.set(0, 0);
        }
        start();
      };
      const handleVisibilityChange = () => start();

      const resizeObserver = new ResizeObserver(resize);
      const intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          start();
        },
        { rootMargin: "120px" },
      );

      stage.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      stage.addEventListener("pointerleave", resetPointer);
      motionQuery.addEventListener("change", handleMotionChange);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      resizeObserver.observe(stage);
      intersectionObserver.observe(stage);
      resize();

      teardown = () => {
        window.cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        stage.removeEventListener("pointermove", handlePointerMove);
        stage.removeEventListener("pointerleave", resetPointer);
        motionQuery.removeEventListener("change", handleMotionChange);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );

        const geometries = new Set<BufferGeometry>();
        const materials = new Set<Material>();
        scene.traverse((object: Object3D) => {
          const renderable = object as Object3D & {
            geometry?: BufferGeometry;
            material?: Material | Material[];
          };
          if (renderable.geometry) geometries.add(renderable.geometry);
          if (Array.isArray(renderable.material)) {
            for (const material of renderable.material) materials.add(material);
          } else if (renderable.material) {
            materials.add(renderable.material);
          }
        });
        for (const sceneGeometry of geometries) sceneGeometry.dispose();
        for (const sceneMaterial of materials) sceneMaterial.dispose();
        renderer.dispose();
      };
    }

    void mountScene(stage, canvas).catch(() => undefined);

    return () => {
      disposed = true;
      teardown?.();
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="portal-particles"
      role="img"
      aria-label="Thousands of gray particles assembling into a rotating three-dimensional donut"
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
