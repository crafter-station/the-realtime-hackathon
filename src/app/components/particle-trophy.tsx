"use client";

import { useEffect, useRef } from "react";

const trophyParticleCount = 9_200;

export function ParticleTrophy() {
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
          alpha: true,
          antialias: false,
          canvas,
          powerPreference: "high-performance",
        });
      } catch {
        return;
      }

      renderer.setClearColor(0x090909, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
      camera.position.set(0, 0.15, 8.5);

      const starts = new Float32Array(trophyParticleCount * 3);
      const targets = new Float32Array(trophyParticleCount * 3);
      const colors = new Float32Array(trophyParticleCount * 3);
      const delays = new Float32Array(trophyParticleCount);
      const phases = new Float32Array(trophyParticleCount);
      const sizes = new Float32Array(trophyParticleCount);
      const particleColor = new THREE.Color(getComputedStyle(stage).color);
      let particleIndex = 0;
      let randomSeed = 0x25a4c91d;

      const random = () => {
        randomSeed = (Math.imul(randomSeed, 1_664_525) + 1_013_904_223) | 0;
        return (randomSeed >>> 0) / 4_294_967_296;
      };

      const addParticle = (x: number, y: number, z: number) => {
        if (particleIndex >= trophyParticleCount) return;

        const offset = particleIndex * 3;
        const angle = random() * Math.PI * 2;
        const startRadius = 3.8 + random() * 4.5;

        starts[offset] = Math.cos(angle) * startRadius;
        starts[offset + 1] = (random() - 0.5) * 7;
        starts[offset + 2] = Math.sin(angle) * startRadius;
        targets[offset] = x;
        targets[offset + 1] = y;
        targets[offset + 2] = z;
        colors[offset] = particleColor.r;
        colors[offset + 1] = particleColor.g;
        colors[offset + 2] = particleColor.b;
        delays[particleIndex] = random();
        phases[particleIndex] = random() * Math.PI * 2;
        sizes[particleIndex] = 0.7 + random() * 1.8;
        particleIndex += 1;
      };

      // Cup shell: a curved open bowl, wider at the rim than at the stem.
      for (let index = 0; index < 3_650; index += 1) {
        const heightProgress = random();
        const angle = random() * Math.PI * 2;
        const radius =
          0.47 +
          1.04 * Math.sin((heightProgress * Math.PI) / 2) ** 0.72 +
          (random() - 0.5) * 0.035;
        addParticle(
          Math.cos(angle) * radius,
          0.28 + heightProgress * 2.02,
          Math.sin(angle) * radius,
        );
      }

      // Dense torus at the lip keeps the cup silhouette crisp while it turns.
      for (let index = 0; index < 800; index += 1) {
        const angle = random() * Math.PI * 2;
        const tubeAngle = random() * Math.PI * 2;
        const radius = 1.51 + Math.cos(tubeAngle) * 0.075;
        addParticle(
          Math.cos(angle) * radius,
          2.3 + Math.sin(tubeAngle) * 0.075,
          Math.sin(angle) * radius,
        );
      }

      for (let index = 0; index < 600; index += 1) {
        const angle = random() * Math.PI * 2;
        const radius = 0.13 + (random() - 0.5) * 0.025;
        addParticle(
          Math.cos(angle) * radius,
          -0.94 + random() * 1.25,
          Math.sin(angle) * radius,
        );
      }

      // Layered plinth: top disk, edge, and lower foot.
      for (let index = 0; index < 950; index += 1) {
        const angle = random() * Math.PI * 2;
        const topSurface = index % 3 === 0;
        const radius = topSurface
          ? Math.sqrt(random()) * 0.9
          : 0.7 + random() * 0.2;
        const y = topSurface
          ? -1.04 + random() * 0.04
          : -1.28 + random() * 0.24;
        addParticle(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      }

      // Two C-shaped handles, sampled as tubes around their center curves.
      for (const side of [-1, 1]) {
        for (let index = 0; index < 1_600; index += 1) {
          const curveAngle = -Math.PI / 2 + random() * Math.PI;
          const tubeAngle = random() * Math.PI * 2;
          const centerX = side * (1.3 + Math.cos(curveAngle) * 0.9);
          const centerY = 1.35 + Math.sin(curveAngle) * 0.82;
          addParticle(
            centerX + side * Math.cos(tubeAngle) * 0.1,
            centerY + Math.cos(curveAngle) * Math.cos(tubeAngle) * 0.065,
            Math.sin(tubeAngle) * 0.1,
          );
        }
      }

      // A loose halo gives the assembled object depth without changing its form.
      while (particleIndex < trophyParticleCount) {
        const angle = random() * Math.PI * 2;
        const radius = 2.25 + random() * 0.9;
        addParticle(
          Math.cos(angle) * radius,
          0.55 + (random() - 0.5) * 3.8,
          Math.sin(angle) * radius * 0.62,
        );
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(starts, 3));
      geometry.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
      geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("aDelay", new THREE.BufferAttribute(delays, 1));
      geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        depthWrite: false,
        transparent: true,
        uniforms: {
          uPixelRatio: { value: 1 },
          uProgress: { value: 0 },
          uTime: { value: 0 },
        },
        vertexShader: `
          attribute vec3 aTarget;
          attribute vec3 aColor;
          attribute float aDelay;
          attribute float aPhase;
          attribute float aSize;

          uniform float uPixelRatio;
          uniform float uProgress;
          uniform float uTime;

          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            float localProgress = smoothstep(aDelay * 0.42, 0.72 + aDelay * 0.2, uProgress);
            localProgress = 1.0 - pow(1.0 - localProgress, 3.0);
            vec3 transformed = mix(position, aTarget, localProgress);
            transformed.y += sin(uTime * 1.4 + aPhase) * 0.008 * localProgress;
            transformed.z += cos(uTime * 1.1 + aPhase) * 0.012 * localProgress;

            vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = clamp(
              aSize * uPixelRatio * (11.0 / max(1.0, -viewPosition.z)),
              1.0 * uPixelRatio,
              5.0 * uPixelRatio
            );

            vColor = aColor;
            vAlpha = mix(0.25, 0.92, localProgress);
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            float distanceToCenter = length(gl_PointCoord - vec2(0.5));
            float alpha = 1.0 - smoothstep(0.22, 0.5, distanceToCenter);
            if (alpha < 0.02) discard;
            gl_FragColor = vec4(vColor, alpha * vAlpha);
          }
        `,
      });

      const trophy = new THREE.Points(geometry, material);
      trophy.position.y = -0.05;
      trophy.rotation.x = -0.08;
      scene.add(trophy);

      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      let animationFrame = 0;
      let inView = false;
      let lastTimestamp = 0;
      let reducedMotion = motionQuery.matches;
      let rotationX = -0.08;
      let rotationY = -0.12;
      let targetRotationX = -0.08;
      let targetRotationY = -0.12;
      const introStartedAt = performance.now();

      const renderFrame = (timestamp: number) => {
        const delta = lastTimestamp
          ? Math.min((timestamp - lastTimestamp) / 1000, 0.08)
          : 0.016;
        lastTimestamp = timestamp;
        rotationX = THREE.MathUtils.damp(rotationX, targetRotationX, 5, delta);
        rotationY = THREE.MathUtils.damp(rotationY, targetRotationY, 5, delta);

        const introProgress = reducedMotion
          ? 1
          : THREE.MathUtils.clamp((timestamp - introStartedAt) / 2_000, 0, 1);
        material.uniforms.uProgress.value = introProgress;
        material.uniforms.uTime.value = reducedMotion ? 0 : timestamp * 0.001;
        trophy.rotation.x = rotationX;
        trophy.rotation.y =
          rotationY +
          (reducedMotion
            ? 0
            : Math.sin((timestamp - introStartedAt) * 0.00045) * 0.14);
        renderer.render(scene, camera);

        if (stage.dataset.renderer !== "ready") {
          stage.dataset.renderer = "ready";
        }
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
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.8);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        material.uniforms.uPixelRatio.value = pixelRatio;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        const visibleHeight =
          2 *
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
          camera.position.z;
        const visibleWidth = visibleHeight * camera.aspect;
        const scale = Math.min(1.05, (visibleWidth * 0.88) / 4.8) * 0.82;
        trophy.scale.setScalar(Math.max(0.46, scale));
        start();
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (reducedMotion || event.pointerType === "touch") return;
        const bounds = stage.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
        targetRotationY = -0.12 + x * 0.52;
        targetRotationX = -0.08 + y * 0.16;
      };

      const handlePointerLeave = () => {
        targetRotationX = -0.08;
        targetRotationY = -0.12;
      };

      const handleMotionChange = (event: MediaQueryListEvent) => {
        reducedMotion = event.matches;
        handlePointerLeave();
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
      stage.addEventListener("pointerleave", handlePointerLeave);
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
        stage.removeEventListener("pointerleave", handlePointerLeave);
        motionQuery.removeEventListener("change", handleMotionChange);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        delete stage.dataset.renderer;
      };
    }

    void mountScene(stage, canvas).catch(() => undefined);

    return () => {
      disposed = true;
      teardown?.();
    };
  }, []);

  return (
    <div ref={stageRef} className="trophy-particles" aria-hidden="true">
      <canvas ref={canvasRef} />
      <svg
        className="trophy-particles__fallback"
        viewBox="0 0 240 240"
        fill="none"
      >
        <title>First-place trophy</title>
        <path d="M75 35h90v32c0 35-19 59-45 59S75 102 75 67V35Z" />
        <path d="M76 55H48v13c0 28 18 43 39 43M164 55h28v13c0 28-18 43-39 43M120 126v43M88 196h64M101 169h38v27h-38z" />
      </svg>
    </div>
  );
}
