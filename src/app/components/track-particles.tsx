"use client";

import { useEffect, useRef } from "react";

type TrackParticleVariant = "cooperative" | "crowd";

const variantLabels: Record<TrackParticleVariant, string> = {
  cooperative:
    "Two synchronized particle streams exchanging through a shared live core",
  crowd: "A particle crowd broadcasting expanding three-dimensional signals",
};

export function TrackParticles({ variant }: { variant: TrackParticleVariant }) {
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

      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
      camera.position.set(0, 0, 8.4);

      const particleCount = variant === "cooperative" ? 2_600 : 4_200;
      const specialStart = variant === "cooperative" ? 2_150 : 3_180;
      const positions = new Float32Array(particleCount * 3);
      const starts = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const phases = new Float32Array(particleCount);
      const delays = new Float32Array(particleCount);
      const lanes = new Float32Array(particleCount);
      const kinds = new Float32Array(particleCount);
      const radii = new Float32Array(particleCount);
      const sizes = new Float32Array(particleCount);
      const baseColor = new THREE.Color(
        variant === "cooperative" ? 0xff5c14 : 0xff8a48,
      );
      const fullTurn = Math.PI * 2;
      let randomSeed = variant === "cooperative" ? 0x4a72c31d : 0x19d3e7b5;

      const random = () => {
        randomSeed = (Math.imul(randomSeed, 1_664_525) + 1_013_904_223) | 0;
        return (randomSeed >>> 0) / 4_294_967_296;
      };

      for (let index = 0; index < particleCount; index += 1) {
        const offset = index * 3;
        const phase = random() * fullTurn;
        const cloudAngle = random() * fullTurn;
        const cloudY = random() * 2 - 1;
        const cloudRadius = 3.8 + random() * 3.8;
        const cloudWidth = Math.sqrt(1 - cloudY * cloudY);
        const isSpecial = index >= specialStart;
        const lane = index % 2 === 0 ? -1 : 1;

        starts[offset] = Math.cos(cloudAngle) * cloudWidth * cloudRadius * 1.15;
        starts[offset + 1] = cloudY * cloudRadius * 0.75;
        starts[offset + 2] = Math.sin(cloudAngle) * cloudWidth * cloudRadius;

        if (variant === "cooperative") {
          if (isSpecial) {
            const radius = Math.cbrt(random()) * 0.68;
            const y = random() * 2 - 1;
            const angle = random() * fullTurn;
            const width = Math.sqrt(1 - y * y);
            positions[offset] = Math.cos(angle) * width * radius;
            positions[offset + 1] = y * radius;
            positions[offset + 2] = Math.sin(angle) * width * radius;
          } else {
            positions[offset] = Math.cos(phase) * 2.85;
            positions[offset + 1] = Math.sin(phase * 2 + lane * 0.8) * 0.78;
            positions[offset + 2] = Math.sin(phase) * 0.95 + lane * 0.18;
          }
        } else if (isSpecial) {
          const ring = (index - specialStart) % 3;
          const radius = 1.1 + ring * 1.15;
          positions[offset] = Math.cos(phase) * radius;
          positions[offset + 1] = Math.sin(phase) * radius * 0.58;
          positions[offset + 2] = (random() - 0.5) * 0.18;
        } else {
          const radius = Math.cbrt(random());
          const y = random() * 2 - 1;
          const angle = random() * fullTurn;
          const width = Math.sqrt(1 - y * y);
          positions[offset] =
            Math.cos(angle) * width * radius * (2.05 + random() * 0.35);
          positions[offset + 1] = y * radius * 1.45;
          positions[offset + 2] =
            Math.sin(angle) * width * radius * (1.3 + random() * 0.3);
        }

        colors[offset] = baseColor.r;
        colors[offset + 1] = baseColor.g;
        colors[offset + 2] = baseColor.b;
        phases[index] = phase;
        delays[index] =
          variant === "crowd" && isSpecial
            ? ((index - specialStart) % 3) / 3
            : random();
        lanes[index] = lane;
        kinds[index] = isSpecial ? 1 : 0;
        radii[index] = 0.7 + random() * 0.6;
        sizes[index] = 0.7 + random() * 1.65;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      geometry.setAttribute("aStart", new THREE.BufferAttribute(starts, 3));
      geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
      geometry.setAttribute("aDelay", new THREE.BufferAttribute(delays, 1));
      geometry.setAttribute("aLane", new THREE.BufferAttribute(lanes, 1));
      geometry.setAttribute("aKind", new THREE.BufferAttribute(kinds, 1));
      geometry.setAttribute("aRadius", new THREE.BufferAttribute(radii, 1));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        depthWrite: false,
        transparent: true,
        uniforms: {
          uIntro: { value: 0 },
          uMode: { value: variant === "cooperative" ? 0 : 1 },
          uPixelRatio: { value: 1 },
          uTime: { value: 0 },
        },
        vertexShader: `
          attribute vec3 aStart;
          attribute vec3 aColor;
          attribute float aPhase;
          attribute float aDelay;
          attribute float aLane;
          attribute float aKind;
          attribute float aRadius;
          attribute float aSize;

          uniform float uIntro;
          uniform float uMode;
          uniform float uPixelRatio;
          uniform float uTime;

          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            vec3 target = position;
            float alpha = 1.0;

            if (uMode < 0.5) {
              if (aKind < 0.5) {
                float angle = aPhase + uTime * (0.18 + aDelay * 0.07) * aLane;
                target = vec3(
                  cos(angle) * 2.85,
                  sin(angle * 2.0 + aLane * 0.8) * 0.78,
                  sin(angle) * 0.95 + aLane * 0.18
                );
              } else {
                float pulse = 1.0 + sin(uTime * 1.8 + aPhase) * 0.08;
                target *= pulse;
              }
            } else {
              if (aKind < 0.5) {
                target.x += sin(uTime * 0.42 + aPhase) * 0.08 * aRadius;
                target.y += cos(uTime * 0.36 + aPhase * 1.7) * 0.06;
                target.z += sin(uTime * 0.3 + aPhase * 0.7) * 0.1;

                float wave = sin(length(position.xy) * 2.7 - uTime * 2.1);
                target.z += wave * 0.045;
              } else {
                float cycle = fract(uTime * 0.115 + aDelay);
                float signalRadius = mix(0.45, 4.35, cycle);
                target = vec3(
                  cos(aPhase) * signalRadius,
                  sin(aPhase) * signalRadius * 0.58,
                  sin(aPhase * 2.0 + uTime * 0.25) * 0.1
                );
                alpha = sin(cycle * 3.14159265);
              }
            }

            float localIntro = smoothstep(
              aDelay * 0.28,
              0.65 + aDelay * 0.2,
              uIntro
            );
            localIntro = 1.0 - pow(1.0 - localIntro, 3.0);
            vec3 transformed = mix(aStart, target, localIntro);

            vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = clamp(
              aSize * uPixelRatio * (12.0 / max(1.0, -viewPosition.z)),
              0.9 * uPixelRatio,
              4.6 * uPixelRatio
            );

            vColor = aColor;
            vAlpha = alpha * mix(0.18, 0.95, localIntro);
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            float distanceToCenter = length(gl_PointCoord - vec2(0.5));
            float alpha = 1.0 - smoothstep(0.24, 0.5, distanceToCenter);
            if (alpha * vAlpha < 0.02) discard;
            gl_FragColor = vec4(vColor, alpha * vAlpha);
          }
        `,
      });

      const field = new THREE.Points(geometry, material);
      field.scale.setScalar(1.2);
      field.rotation.x = variant === "cooperative" ? -0.12 : -0.08;
      scene.add(field);

      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const pointerTarget = new THREE.Vector2();
      const pointerCurrent = new THREE.Vector2();
      let animationFrame = 0;
      let hasEntered = false;
      let inView = false;
      let introStartedAt = 0;
      let lastTimestamp = 0;
      let reducedMotion = motionQuery.matches;

      const renderFrame = (timestamp: number) => {
        const delta = lastTimestamp
          ? Math.min((timestamp - lastTimestamp) / 1000, 0.08)
          : 0.016;
        lastTimestamp = timestamp;

        pointerCurrent.x = THREE.MathUtils.damp(
          pointerCurrent.x,
          pointerTarget.x,
          4.5,
          delta,
        );
        pointerCurrent.y = THREE.MathUtils.damp(
          pointerCurrent.y,
          pointerTarget.y,
          4.5,
          delta,
        );

        const intro = reducedMotion
          ? 1
          : THREE.MathUtils.clamp((timestamp - introStartedAt) / 1_700, 0, 1);
        const time = reducedMotion
          ? variant === "cooperative"
            ? 2.4
            : 4.1
          : timestamp * 0.001;
        material.uniforms.uIntro.value = intro;
        material.uniforms.uTime.value = time;

        const autoRotation = reducedMotion
          ? 0
          : time * (variant === "cooperative" ? 0.06 : 0.04);
        field.rotation.x =
          (variant === "cooperative" ? -0.12 : -0.08) + pointerCurrent.y * 0.12;
        field.rotation.y = pointerCurrent.x * 0.2 + autoRotation;
        field.rotation.z =
          variant === "cooperative"
            ? 0.08 + pointerCurrent.x * 0.025
            : pointerCurrent.x * 0.018;
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
          renderFrame(
            reducedMotion
              ? performance.now()
              : Math.max(performance.now(), introStartedAt),
          );
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
          width < 520 ? 1.4 : 1.8,
        );
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(width, height, false);
        material.uniforms.uPixelRatio.value = pixelRatio;
        camera.aspect = width / height;
        camera.position.z = camera.aspect < 0.9 ? 9.6 : 8.4;
        camera.updateProjectionMatrix();
        start();
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (reducedMotion || event.pointerType === "touch") return;
        const bounds = stage.getBoundingClientRect();
        pointerTarget.set(
          ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
          -((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
        );
      };

      const resetPointer = () => pointerTarget.set(0, 0);
      const handleMotionChange = (event: MediaQueryListEvent) => {
        reducedMotion = event.matches;
        resetPointer();
        start();
      };
      const handleVisibilityChange = () => start();
      const resizeObserver = new ResizeObserver(resize);
      const intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          inView = entry.isIntersecting;
          if (inView && !hasEntered) {
            hasEntered = true;
            introStartedAt = performance.now();
          }
          start();
        },
        { rootMargin: "100px" },
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
  }, [variant]);

  return (
    <div
      ref={stageRef}
      className="track-particles"
      data-variant={variant}
      role="img"
      aria-label={variantLabels[variant]}
    >
      <canvas ref={canvasRef} />
      {variant === "cooperative" ? (
        <svg
          className="track-particles__fallback"
          viewBox="0 0 640 400"
          fill="none"
          aria-hidden="true"
        >
          <path d="M58 202c90-168 175 168 264 0S498 34 582 202" />
          <path d="M58 202c90 168 175-168 264 0s176 168 260 0" />
          <circle cx="320" cy="200" r="25" />
        </svg>
      ) : (
        <svg
          className="track-particles__fallback"
          viewBox="0 0 640 400"
          fill="none"
          aria-hidden="true"
        >
          <ellipse cx="320" cy="200" rx="72" ry="50" />
          <ellipse cx="320" cy="200" rx="150" ry="90" />
          <ellipse cx="320" cy="200" rx="245" ry="135" />
        </svg>
      )}
    </div>
  );
}
