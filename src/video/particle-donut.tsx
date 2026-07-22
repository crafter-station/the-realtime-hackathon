import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ShaderMaterial,
} from "three";

const PARTICLE_COUNT = 6_800;
const FULL_TURN = Math.PI * 2;
const ROTATION_DURATION_IN_FRAMES = 540;

const vertexShader = `
  attribute vec3 aTarget;
  attribute float aDelay;
  attribute float aAccent;
  attribute float aPhase;
  attribute float aSize;

  uniform float uMorph;
  uniform float uTime;

  varying float vAlpha;
  varying float vAccent;

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

    vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(
      aSize * (20.0 / max(1.0, -viewPosition.z)),
      1.4,
      5.5
    );

    vAlpha = mix(0.38, 0.95, morph);
    vAccent = aAccent;
  }
`;

const fragmentShader = `
  varying float vAlpha;
  varying float vAccent;

  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.18, 0.5, distanceToCenter);
    if (alpha * vAlpha < 0.02) discard;
    vec3 particleColor = mix(vec3(0.72), vec3(1.0, 0.302, 0.0), vAccent);
    gl_FragColor = vec4(particleColor, alpha * vAlpha);
  }
`;

function createParticleGeometry() {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const targets = new Float32Array(PARTICLE_COUNT * 3);
  const delays = new Float32Array(PARTICLE_COUNT);
  const accents = new Float32Array(PARTICLE_COUNT);
  const phases = new Float32Array(PARTICLE_COUNT);
  const sizes = new Float32Array(PARTICLE_COUNT);
  let randomSeed = 0x2f6e2b1;

  const random = () => {
    randomSeed = (Math.imul(randomSeed, 1_664_525) + 1_013_904_223) | 0;
    return (randomSeed >>> 0) / 4_294_967_296;
  };

  for (let index = 0; index < PARTICLE_COUNT; index += 1) {
    const offset = index * 3;
    const cloudY = random() * 2 - 1;
    const cloudAngle = random() * FULL_TURN;
    const cloudRadius = 3.2 + random() ** 0.38 * 3.5;
    const cloudWidth = Math.sqrt(1 - cloudY * cloudY);

    positions[offset] = Math.cos(cloudAngle) * cloudWidth * cloudRadius * 1.18;
    positions[offset + 1] = cloudY * cloudRadius * 0.78;
    positions[offset + 2] = Math.sin(cloudAngle) * cloudWidth * cloudRadius;

    const around = random() * FULL_TURN;
    const tube = random() * FULL_TURN;
    const majorRadius = 1.25 + (random() - 0.5) * 0.045;
    const tubeRadius = 0.32 + (random() - 0.5) * 0.055;

    targets[offset] =
      (majorRadius + tubeRadius * Math.cos(tube)) * Math.cos(around);
    targets[offset + 1] =
      (majorRadius + tubeRadius * Math.cos(tube)) * Math.sin(around);
    targets[offset + 2] = tubeRadius * Math.sin(tube);
    delays[index] = random();
    accents[index] = random() > 0.982 ? 1 : 0;
    phases[index] = random() * FULL_TURN;
    sizes[index] = 0.8 + random() * 1.35;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aTarget", new BufferAttribute(targets, 3));
  geometry.setAttribute("aDelay", new BufferAttribute(delays, 1));
  geometry.setAttribute("aAccent", new BufferAttribute(accents, 1));
  geometry.setAttribute("aPhase", new BufferAttribute(phases, 1));
  geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
  return geometry;
}

function DonutPoints({ mode }: { mode: "poster" | "schedule" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const geometry = useMemo(createParticleGeometry, []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        blending: AdditiveBlending,
        depthWrite: false,
        fragmentShader,
        transparent: true,
        uniforms: {
          uMorph: { value: 0 },
          uTime: { value: 0 },
        },
        vertexShader,
      }),
    [],
  );

  const morph = interpolate(frame, [8, 92], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scheduleY = interpolate(frame, [94, 138], [0, 1.64], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scheduleScale = interpolate(frame, [94, 138], [1.08, 0.68], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const seconds = frame / fps;
  const rotation = interpolate(
    frame,
    [0, ROTATION_DURATION_IN_FRAMES],
    [0, FULL_TURN],
    {
      easing: Easing.linear,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  material.uniforms.uMorph.value = morph;
  material.uniforms.uTime.value = seconds;

  return (
    <points
      geometry={geometry}
      material={material}
      position={[0, mode === "schedule" ? scheduleY : 0.18, 0]}
      rotation={[
        -0.1 + Math.sin(seconds * 0.45) * 0.04,
        rotation,
        Math.sin(seconds * 0.28) * 0.025,
      ]}
      scale={mode === "schedule" ? scheduleScale : 1.18}
    />
  );
}

export function ParticleDonut({
  mode = "schedule",
}: {
  mode?: "poster" | "schedule";
}) {
  const { height, width } = useVideoConfig();

  return (
    <ThreeCanvas
      camera={{ fov: 42, position: [0, 0, 9.2] }}
      height={height}
      width={width}
      style={{ backgroundColor: "transparent" }}
    >
      <color attach="background" args={["#090909"]} />
      <DonutPoints mode={mode} />
    </ThreeCanvas>
  );
}
