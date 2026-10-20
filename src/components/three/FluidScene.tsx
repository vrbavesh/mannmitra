"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { animate, useMotionValue, useScroll } from "motion/react";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Group, ShaderMaterial } from "three";

const vertexShader = `
uniform float uT;
varying vec3 vN, vO, vV;
void main() {
  vec3 p = position;
  float n = sin(p.x*2.1+uT*.7)*sin(p.y*2.3-uT*.5)*sin(p.z*1.9+uT*.6);
  p += normal*n*.1;
  vO = normal;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  vN = normalize(normalMatrix*normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix*mv;
}`;
const fragmentShader = `
uniform float uT;
varying vec3 vN, vO, vV;
void main() {
  vec3 N = normalize(vN), V = normalize(vV);
  float f = pow(1.-max(dot(N,V),0.),2.4);
  vec3 b = mix(vec3(.45,.8,.95),vec3(.6,.95,.7),smoothstep(-.8,.9,vO.y+.4*sin(vO.x*2.+uT*.2)));
  b = mix(b,vec3(.55,.9,.88),.35*smoothstep(.2,1.,vO.x));
  vec3 irid = vec3(.35,.8,.75)+.2*cos(6.283*(f*1.1+vec3(0.,.15,.3)+vO.y*.2));
  vec3 col = mix(b,irid,.38*f+.1);
  vec3 L = normalize(vec3(-.5,.7,.6));
  float sp = pow(max(dot(reflect(-L,N),V),0.),48.);
  col += sp*.9+vec3(.95,1.,.98)*f*.25;
  gl_FragColor = vec4(col,.45+.5*f+sp*.3);
}`;

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <div data-scene-fallback /> : this.props.children;
  }
}

function Orb({ onReady, onLost }: { onReady: () => void; onLost: () => void }) {
  const group = useRef<Group>(null);
  const pebbles = useRef<Group>(null);
  const glass = useRef<ShaderMaterial>(null);
  const { gl, size, viewport } = useThree();
  const { scrollY } = useScroll();
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  const uniforms = useMemo(() => ({ uT: { value: 0 } }), []);
  const centers = useRef<number[]>([]);
  const ready = useRef(false);
  const time = useRef(0);

  useEffect(() => {
    const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-landing-panel]"));
    const measure = () => {
      centers.current = panels.map((panel) => panel.offsetTop + panel.offsetHeight / 2);
    };
    const observer = new ResizeObserver(measure);
    panels.forEach((panel) => observer.observe(panel));
    measure();
    const lost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      observer.disconnect();
      gl.domElement.removeEventListener("webglcontextlost", lost);
    };
  }, [gl, onLost]);

  useEffect(() => {
    const root = document.getElementById("landing")!;
    let drag: { id: number; x: number; y: number; initialX: number; initialY: number } | null =
      null;
    const springs: ReturnType<typeof animate>[] = [];
    const stop = () => {
      springs.forEach((spring) => spring.stop());
      springs.length = 0;
    };
    const down = (event: PointerEvent) => {
      if (
        event.pointerType !== "mouse" ||
        event.button !== 0 ||
        !group.current ||
        (event.target as Element).closest("a, button, input, h1, h2, p, li, [data-landing-sheet]")
      )
        return;
      const x = (event.clientX / size.width - 0.5) * viewport.width;
      const y = (0.5 - event.clientY / size.height) * viewport.height;
      if (
        Math.hypot(x - group.current.position.x, y - group.current.position.y) >
        1.3 * group.current.scale.x
      )
        return;
      stop();
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        initialX: dragX.get(),
        initialY: dragY.get(),
      };
      root.setPointerCapture(event.pointerId);
      event.preventDefault();
    };
    const move = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      dragX.set(drag.initialX + ((event.clientX - drag.x) * viewport.width) / size.width);
      dragY.set(drag.initialY - ((event.clientY - drag.y) * viewport.height) / size.height);
    };
    const up = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
      for (const value of [dragX, dragY])
        springs.push(
          animate(value, 0, {
            type: "spring",
            stiffness: 140,
            damping: 19,
            velocity: value.getVelocity(),
          }),
        );
    };
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", up);
    root.addEventListener("lostpointercapture", up);
    return () => {
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", up);
      root.removeEventListener("lostpointercapture", up);
      if (drag && root.hasPointerCapture(drag.id)) root.releasePointerCapture(drag.id);
      stop();
    };
  }, [dragX, dragY, size.width, size.height, viewport.width, viewport.height]);

  useFrame((_, delta) => {
    if (!group.current || !glass.current) return;
    time.current += Math.min(delta, 0.04);
    glass.current.uniforms.uT.value = time.current;
    const mobile = size.width <= 760;
    const poses = mobile
      ? [
          [0, 0.45, 0.85],
          [0, 0.8, 0.42],
          [0, 0.82, 0.36],
          [0, 0.82, 0.36],
          [0, 0.4, 0.7],
        ]
      : [
          [0.5, 0, 1],
          [-0.5, 0, 0.9],
          [0.68, 0.5, 0.5],
          [0.66, -0.42, 0.55],
          [0, 0.3, 0.85],
        ];
    const position = scrollY.get() + size.height / 2;
    let index = 0;
    while (index < centers.current.length - 2 && position > centers.current[index + 1]) index++;
    const start = centers.current[index] ?? size.height / 2;
    const end = centers.current[index + 1] ?? start + size.height;
    const progress = Math.max(0, Math.min(1, (position - start) / (end - start)));
    const blend = progress * progress * (3 - 2 * progress);
    const from = poses[index];
    const to = poses[Math.min(index + 1, poses.length - 1)];
    const x = from[0] + (to[0] - from[0]) * blend;
    const y = from[1] + (to[1] - from[1]) * blend;
    const scale = from[2] + (to[2] - from[2]) * blend;
    group.current.position.set(
      (x * viewport.width) / 2 + dragX.get(),
      (y * viewport.height) / 2 + dragY.get(),
      0,
    );
    group.current.scale.setScalar(scale);
    group.current.rotation.set(Math.sin(time.current * 0.16) * 0.09, time.current * 0.1, 0);
    if (pebbles.current) {
      pebbles.current.position.set(
        group.current.position.x * 0.7,
        group.current.position.y * 0.7,
        0,
      );
      pebbles.current.scale.setScalar(scale);
      pebbles.current.children.forEach((pebble, i) => {
        const angle = i * 2.4 + time.current * (0.03 + i * 0.006);
        pebble.position.set(
          Math.cos(angle) * (2.1 + i * 0.33),
          Math.sin(i * 2.4) * 1.4 + Math.sin(time.current * 0.4 + i) * 0.12,
          ((i % 3) - 1) * 0.8 + Math.sin(angle) * 0.8,
        );
        pebble.rotation.y = angle * 2;
      });
    }
    if (!ready.current) {
      ready.current = true;
      onReady();
    }
  });

  return (
    <>
      <group ref={group}>
        <mesh position={[0, -1.75, -1]}>
          <planeGeometry args={[4.2, 0.9]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }"
            fragmentShader="varying vec2 vUv; void main(){float a=1.-smoothstep(0.,.5,length(vUv-.5));gl_FragColor=vec4(.12,.4,.32,a*.17);}"
          />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[1.3, 5]} />
          <shaderMaterial
            ref={glass}
            uniforms={uniforms}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            transparent
            depthWrite={false}
          />
        </mesh>
      </group>
      <group ref={pebbles}>
        {Array.from({ length: 8 }, (_, i) => (
          <mesh
            key={i}
            scale={[
              (0.09 + (i % 3) * 0.045) * 1.3,
              (0.09 + (i % 3) * 0.045) * 0.8,
              0.09 + (i % 3) * 0.045,
            ]}
          >
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial
              color="#d6f5e8"
              emissive="#c5eee0"
              emissiveIntensity={0.3}
              toneMapped={false}
              roughness={0.85}
              flatShading
            />
          </mesh>
        ))}
      </group>
    </>
  );
}

export default function FluidScene({ active }: { active: boolean }) {
  const [ready, setReady] = useState(false);
  const [lost, setLost] = useState(false);
  if (lost) return null;
  return (
    <SceneBoundary>
      <div data-scene-ready={ready ? "" : undefined} style={{ width: "100%", height: "100%" }}>
        <Canvas
          camera={{ position: [0, 0, 9], fov: 35, near: 0.1, far: 50 }}
          dpr={[1, 1.5]}
          frameloop={active ? "always" : "never"}
          gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          fallback={null}
        >
          <hemisphereLight args={["#ffffff", "#bce5cc", 2]} />
          <directionalLight position={[-3, 4, 5]} intensity={2} />
          <Orb
            onReady={() => setReady(true)}
            onLost={() => {
              setReady(false);
              setLost(true);
            }}
          />
        </Canvas>
      </div>
    </SceneBoundary>
  );
}
