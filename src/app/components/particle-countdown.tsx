"use client";

import { useEffect, useRef, useState } from "react";

const eventStart = new Date("2026-08-07T19:00:00-05:00").getTime();
const eventEnd = new Date("2026-08-09T14:00:00-05:00").getTime();
const digitParticles = 900;
const colonParticles = 170;
const particleCount = digitParticles * 8 + colonParticles * 3;

type ClockGroups = [string, string, string, string];

type ClockSnapshot = {
  groups: ClockGroups;
  spoken: string;
};

const syncingClock: ClockSnapshot = {
  groups: ["--", "--", "--", "--"],
  spoken: "Synchronizing the kickoff countdown",
};

function getClockSnapshot(now: number): ClockSnapshot {
  const isLive = now >= eventStart && now < eventEnd;
  const isComplete = now >= eventEnd;
  const remaining = Math.max(0, (isLive ? eventEnd : eventStart) - now);
  const days = Math.min(99, Math.floor(remaining / 86_400_000));
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const groups: ClockGroups = [days, hours, minutes, seconds].map((value) =>
    String(value).padStart(2, "0"),
  ) as ClockGroups;

  if (isComplete) {
    return {
      groups,
      spoken: "The event is complete",
    };
  }

  const destination = isLive
    ? "remaining in the build window"
    : "until kickoff";

  return {
    groups,
    spoken: `${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds ${destination}`,
  };
}

function easeInOut(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - (-2 * progress + 2) ** 3 / 2;
}

function hash(value: number) {
  const result = Math.sin(value * 91.3458 + 17.234) * 43_758.5453;
  return result - Math.floor(result);
}

export function ParticleCountdown() {
  const [clock, setClock] = useState<ClockSnapshot>(syncingClock);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groupsRef = useRef<ClockGroups>(syncingClock.groups);

  useEffect(() => {
    const update = () => setClock(getClockSnapshot(Date.now()));
    update();

    let interval = 0;
    const timeout = window.setTimeout(
      () => {
        update();
        interval = window.setInterval(update, 1000);
      },
      1020 - (Date.now() % 1000),
    );

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    groupsRef.current = clock.groups;
    stageRef.current?.dispatchEvent(new Event("particle-clock-change"));
  }, [clock.groups]);

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
      await document.fonts.ready;
      if (disposed) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: false,
          powerPreference: "high-performance",
        });
      } catch {
        return;
      }

      renderer.setClearColor(0xffffff, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 30);
      camera.position.set(0, 0, 8);
      camera.lookAt(0, 0, 0);

      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = 240;
      sampleCanvas.height = 320;
      const sampleContext = sampleCanvas.getContext("2d", {
        willReadFrequently: true,
      });
      if (!sampleContext) {
        renderer.dispose();
        return;
      }

      const fontFamily =
        getComputedStyle(stage).getPropertyValue("--font-geist-pixel").trim() ||
        "monospace";
      const glyphSamples = new Map<string, Array<[number, number]>>();

      for (const glyph of "0123456789:") {
        sampleContext.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);
        sampleContext.fillStyle = "#ffffff";
        sampleContext.font = `700 270px ${fontFamily}`;
        sampleContext.textAlign = "center";
        sampleContext.textBaseline = "middle";
        sampleContext.fillText(glyph, 120, 166);

        const pixels = sampleContext.getImageData(
          0,
          0,
          sampleCanvas.width,
          sampleCanvas.height,
        ).data;
        const samples: Array<[number, number]> = [];
        const step = glyph === ":" ? 3 : 4;

        for (let y = 0; y < sampleCanvas.height; y += step) {
          for (let x = 0; x < sampleCanvas.width; x += step) {
            if (pixels[(y * sampleCanvas.width + x) * 4 + 3] > 80) {
              samples.push([
                (x - sampleCanvas.width / 2) * 0.00745,
                -(y - sampleCanvas.height / 2) * 0.00745,
              ]);
            }
          }
        }

        glyphSamples.set(glyph, samples);
      }

      const positions = new Float32Array(particleCount * 3);
      const previousTargets = new Float32Array(particleCount * 3);
      const targets = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const delays = new Float32Array(particleCount);
      const phases = new Float32Array(particleCount);
      const sizes = new Float32Array(particleCount);
      const particleColor = new THREE.Color(0x090909);
      let randomSeed = 0x1a2b3c4d;

      const random = () => {
        randomSeed = (Math.imul(randomSeed, 1_664_525) + 1_013_904_223) | 0;
        return (randomSeed >>> 0) / 4_294_967_296;
      };

      for (let index = 0; index < particleCount; index += 1) {
        const offset = index * 3;
        const angle = random() * Math.PI * 2;
        const radius = 4.5 + random() * 5.5;
        positions[offset] = Math.cos(angle) * radius;
        positions[offset + 1] = (random() - 0.5) * 6.5;
        positions[offset + 2] = Math.sin(angle) * radius * 0.65;

        colors[offset] = particleColor.r;
        colors[offset + 1] = particleColor.g;
        colors[offset + 2] = particleColor.b;
        delays[index] = random();
        phases[index] = random() * Math.PI * 2;
        sizes[index] = 0.8 + random() * 1.55;
      }

      const groupCenters = [-4.2, -1.4, 1.4, 4.2];
      const colonCenters = [-2.8, 0, 2.8];

      const writeGlyph = (
        output: Float32Array,
        particleStart: number,
        count: number,
        glyph: string,
        centerX: number,
        slot: number,
      ) => {
        const samples = glyphSamples.get(glyph) ?? glyphSamples.get("0") ?? [];
        if (samples.length === 0) return;

        for (let index = 0; index < count; index += 1) {
          const particleIndex = particleStart + index;
          const offset = particleIndex * 3;
          const sampleIndex =
            (Math.floor((index / count) * samples.length) +
              Math.floor(hash(index + slot * 101 + glyph.charCodeAt(0)) * 17)) %
            samples.length;
          const [sampleX, sampleY] = samples[sampleIndex];
          output[offset] =
            centerX + sampleX + (hash(index + slot * 313) - 0.5) * 0.022;
          output[offset + 1] =
            sampleY + 0.08 + (hash(index + slot * 521) - 0.5) * 0.022;
          output[offset + 2] =
            (hash(index + slot * 733 + glyph.charCodeAt(0)) - 0.5) * 0.38;
        }
      };

      const fillTargets = (groups: ClockGroups, output: Float32Array) => {
        const digits = groups.join("");
        let particleStart = 0;

        for (let group = 0; group < groupCenters.length; group += 1) {
          for (let digit = 0; digit < 2; digit += 1) {
            const slot = group * 2 + digit;
            writeGlyph(
              output,
              particleStart,
              digitParticles,
              digits[slot] ?? "0",
              groupCenters[group] + (digit === 0 ? -0.62 : 0.62),
              slot,
            );
            particleStart += digitParticles;
          }
        }

        for (let colon = 0; colon < colonCenters.length; colon += 1) {
          writeGlyph(
            output,
            particleStart,
            colonParticles,
            ":",
            colonCenters[colon],
            20 + colon,
          );
          particleStart += colonParticles;
        }
      };

      let renderedGroups = getClockSnapshot(Date.now()).groups;
      fillTargets(renderedGroups, targets);
      previousTargets.set(targets);

      const geometry = new THREE.BufferGeometry();
      const previousAttribute = new THREE.BufferAttribute(previousTargets, 3);
      const targetAttribute = new THREE.BufferAttribute(targets, 3);
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      geometry.setAttribute("aPrevious", previousAttribute);
      geometry.setAttribute("aTarget", targetAttribute);
      geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute("aDelay", new THREE.BufferAttribute(delays, 1));
      geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
      geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.ShaderMaterial({
        depthWrite: false,
        transparent: true,
        uniforms: {
          uIntro: { value: 0 },
          uPixelRatio: { value: 1 },
          uPointer: { value: new THREE.Vector2() },
          uPointerStrength: { value: 0 },
          uTime: { value: 0 },
          uTransition: { value: 1 },
        },
        vertexShader: `
          attribute vec3 aPrevious;
          attribute vec3 aTarget;
          attribute vec3 aColor;
          attribute float aDelay;
          attribute float aPhase;
          attribute float aSize;

          uniform float uIntro;
          uniform float uPixelRatio;
          uniform vec2 uPointer;
          uniform float uPointerStrength;
          uniform float uTime;
          uniform float uTransition;

          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            float transition = smoothstep(0.0, 1.0, uTransition);
            vec3 glyphPosition = mix(aPrevious, aTarget, transition);
            float intro = smoothstep(aDelay * 0.38, 0.62 + aDelay * 0.28, uIntro);
            vec3 transformed = mix(position, glyphPosition, intro);

            vec2 difference = glyphPosition.xy - uPointer;
            float pointerDistance = length(difference);
            vec2 direction = normalize(difference + vec2(0.0001));
            float repel = smoothstep(0.46, 0.03, pointerDistance) *
              uPointerStrength * intro;
            vec2 tangent = vec2(-direction.y, direction.x);

            transformed.xy += direction * repel * (0.13 + aSize * 0.02);
            transformed.xy += tangent * repel * sin(uTime * 5.0 + aPhase) * 0.02;
            transformed.z += repel * (0.28 + aDelay * 0.24);
            transformed.y += sin(uTime * 1.25 + aPhase) * 0.008 * intro;
            transformed.z += cos(uTime * 0.85 + aPhase) * 0.014 * intro;

            vec4 modelPosition = modelMatrix * vec4(transformed, 1.0);
            vec4 viewPosition = viewMatrix * modelPosition;
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = clamp(
              (aSize + repel * 1.15) * uPixelRatio *
                (10.0 / max(1.0, -viewPosition.z)),
              1.0 * uPixelRatio,
              4.8 * uPixelRatio
            );

            vColor = aColor;
            vAlpha = mix(0.58, 1.0, intro);
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vAlpha;

          void main() {
            float distanceToCenter = length(gl_PointCoord - vec2(0.5));
            float alpha = 1.0 - smoothstep(0.3, 0.5, distanceToCenter);
            if (alpha < 0.02) discard;
            gl_FragColor = vec4(vColor, vAlpha * alpha);
          }
        `,
      });

      const particleField = new THREE.Points(geometry, material);
      particleField.position.y = 0.08;
      scene.add(particleField);

      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const pointerTarget = new THREE.Vector2();
      const pointerCurrent = new THREE.Vector2();
      let animationFrame = 0;
      let fieldScale = 1;
      let inView = true;
      let lastTimestamp = 0;
      let pointerStrengthTarget = 0;
      let pointerStrength = 0;
      let reducedMotion = motionQuery.matches;
      let transitionStartedAt = performance.now() - 700;
      const introStartedAt = performance.now();

      const updateTargets = (timestamp: number) => {
        const nextGroups = groupsRef.current;
        const nextKey = nextGroups.join("");
        if (nextKey.includes("-") || nextKey === renderedGroups.join(""))
          return;

        const progress = THREE.MathUtils.clamp(
          (timestamp - transitionStartedAt) / 620,
          0,
          1,
        );
        const easedProgress = easeInOut(progress);

        for (let index = 0; index < previousTargets.length; index += 1) {
          previousTargets[index] = THREE.MathUtils.lerp(
            previousTargets[index],
            targets[index],
            easedProgress,
          );
        }

        fillTargets(nextGroups, targets);
        previousAttribute.needsUpdate = true;
        targetAttribute.needsUpdate = true;
        renderedGroups = [...nextGroups] as ClockGroups;
        transitionStartedAt = timestamp;
      };

      const renderFrame = (timestamp: number) => {
        const delta = lastTimestamp
          ? Math.min((timestamp - lastTimestamp) / 1000, 0.08)
          : 0.016;
        lastTimestamp = timestamp;
        updateTargets(timestamp);

        pointerCurrent.x = THREE.MathUtils.damp(
          pointerCurrent.x,
          pointerTarget.x,
          11,
          delta,
        );
        pointerCurrent.y = THREE.MathUtils.damp(
          pointerCurrent.y,
          pointerTarget.y,
          11,
          delta,
        );
        pointerStrength = THREE.MathUtils.damp(
          pointerStrength,
          reducedMotion ? 0 : pointerStrengthTarget,
          8,
          delta,
        );

        const intro = reducedMotion
          ? 1
          : THREE.MathUtils.clamp((timestamp - introStartedAt) / 1900, 0, 1);
        const transition = reducedMotion
          ? 1
          : THREE.MathUtils.clamp(
              (timestamp - transitionStartedAt) / 620,
              0,
              1,
            );

        material.uniforms.uIntro.value = intro;
        material.uniforms.uPointer.value.copy(pointerCurrent);
        material.uniforms.uPointerStrength.value = pointerStrength;
        material.uniforms.uTime.value = reducedMotion ? 0 : timestamp * 0.001;
        material.uniforms.uTransition.value = easeInOut(transition);
        particleField.rotation.x = reducedMotion
          ? 0
          : -pointerCurrent.y * 0.008;
        particleField.rotation.y = reducedMotion ? 0 : pointerCurrent.x * 0.006;
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
        fieldScale = Math.min(1, (visibleWidth * 0.9) / 10.85);
        particleField.scale.setScalar(fieldScale);
        start();
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (reducedMotion || event.pointerType === "touch") return;
        const bounds = stage.getBoundingClientRect();
        const normalizedX =
          ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
        const normalizedY = -(
          ((event.clientY - bounds.top) / bounds.height - 0.5) *
          2
        );
        const visibleHeight =
          2 *
          Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
          camera.position.z;
        const visibleWidth = visibleHeight * camera.aspect;

        pointerTarget.set(
          (normalizedX * visibleWidth * 0.5) / fieldScale,
          (normalizedY * visibleHeight * 0.5 - particleField.position.y) /
            fieldScale,
        );
        pointerStrengthTarget = 1;
      };

      const handlePointerLeave = () => {
        pointerStrengthTarget = 0;
      };

      const handleMotionChange = (event: MediaQueryListEvent) => {
        reducedMotion = event.matches;
        pointerStrengthTarget = 0;
        pointerStrength = 0;
        start();
      };

      const handleVisibilityChange = () => start();
      const handleClockChange = () => start();
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
      stage.addEventListener("particle-clock-change", handleClockChange);
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
        stage.removeEventListener("particle-clock-change", handleClockChange);
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
    <section
      className="countdown-slide"
      id="countdown"
      aria-labelledby="countdown-title"
    >
      <div className="shell countdown-slide__body">
        <div className="countdown-slide__heading">
          <h2 id="countdown-title">The clock is ticking</h2>
        </div>

        <div ref={stageRef} className="particle-countdown">
          <canvas ref={canvasRef} />
          <div className="particle-countdown__fallback" aria-hidden="true">
            {clock.groups.map((group, index) => (
              <span key={["days", "hours", "minutes", "seconds"][index]}>
                {index > 0 ? <b>:</b> : null}
                {group}
              </span>
            ))}
          </div>
          <span className="sr-only" role="timer">
            {clock.spoken}
          </span>
        </div>
      </div>
    </section>
  );
}
