"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useScroll } from "motion/react";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Group, Mesh, ShaderMaterial } from "three";
import { rubberBand, spring, stepSpring } from "./fluid-physics";

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
  const shade = useRef<Mesh>(null);
  const { gl, size, viewport } = useThree();
  const { scrollY } = useScroll();
  const physics = useRef({
    hx: spring(0),
    hy: spring(0),
    hs: spring(1),
    dx: spring(0),
    dy: spring(0),
    ps: spring(1),
    pointerId: null as number | null,
    off: { x: 0, y: 0 },
    hist: [] as { x: number; y: number; t: number }[],
    spin: { x: 0, y: 0 },
    dz: 1,
  });
  const pointer = useRef<{ x: number; y: number; blocked: boolean } | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
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
    rootRef.current = root;
    const state = physics.current;
    const { hx, hy, hs, dx, dy, ps } = state;
    const upx = viewport.height / size.height;
    const skip = (event: PointerEvent) =>
      Boolean((event.target as Element).closest("a, button, input, [data-landing-sheet]"));
    const worldPoint = (event: PointerEvent) => ({
      x: (event.clientX - size.width / 2) * upx,
      y: -(event.clientY - size.height / 2) * upx,
    });
    const over = (event: PointerEvent) => {
      const px = (hx.x + dx.x) / upx + size.width / 2;
      const py = -(hy.x + dy.x) / upx + size.height / 2;
      return Math.hypot(event.clientX - px, event.clientY - py) < (1.37 * hs.x) / upx;
    };
    const down = (event: PointerEvent) => {
      if (state.pointerId !== null || event.button !== 0 || skip(event) || !over(event)) return;
      state.pointerId = event.pointerId;
      const p = worldPoint(event);
      state.off = { x: hx.x + dx.x - p.x, y: hy.x + dy.x - p.y };
      dx.v = dy.v = 0;
      state.hist = [];
      ps.t = 0.96;
      root.dataset.orbGrabbing = "";
      root.setPointerCapture(event.pointerId);
      if (event.pointerType === "mouse") event.preventDefault();
    };
    const move = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY, blocked: skip(event) };
      if (state.pointerId === null) {
        root.style.cursor = !skip(event) && over(event) ? "grab" : "";
        return;
      }
      if (event.pointerId !== state.pointerId) return;
      const p = worldPoint(event);
      const nx = rubberBand(p.x + state.off.x - hx.x);
      const ny = rubberBand(p.y + state.off.y - hy.x);
      state.spin.y += (nx - dx.x) * 6;
      state.spin.x -= (ny - dy.x) * 6;
      dx.x = nx;
      dy.x = ny;
      state.hist.push({ x: nx, y: ny, t: performance.now() });
      if (state.hist.length > 8) state.hist.shift();
    };
    const up = (event?: PointerEvent) => {
      if (state.pointerId === null || (event && event.pointerId !== state.pointerId)) return;
      const id = state.pointerId;
      state.pointerId = null;
      ps.t = 1;
      delete root.dataset.orbGrabbing;
      const a = state.hist[0],
        b = state.hist[state.hist.length - 1];
      if (a && b && b.t > a.t && performance.now() - b.t < 80) {
        const d = (b.t - a.t) / 1000;
        dx.v = (b.x - a.x) / d;
        dy.v = (b.y - a.y) / d;
      }
      dx.t = dy.t = 0;
      state.dz = 0.8;
      if (root.hasPointerCapture(id)) root.releasePointerCapture(id);
    };
    const leave = () => {
      pointer.current = null;
      root.style.cursor = "";
    };
    const blur = () => {
      up();
      leave();
    };
    root.addEventListener("pointerdown", down);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerup", up);
    root.addEventListener("pointercancel", up);
    root.addEventListener("lostpointercapture", up);
    root.addEventListener("pointerleave", leave);
    window.addEventListener("blur", blur);
    return () => {
      root.removeEventListener("pointerdown", down);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerup", up);
      root.removeEventListener("pointercancel", up);
      root.removeEventListener("lostpointercapture", up);
      root.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", blur);
      if (state.pointerId !== null && root.hasPointerCapture(state.pointerId))
        root.releasePointerCapture(state.pointerId);
      state.pointerId = null;
      dx.x = dx.v = dx.t = dy.x = dy.v = dy.t = 0;
      ps.x = ps.t = 1;
      delete root.dataset.orbGrabbing;
      leave();
      rootRef.current = null;
    };
  }, [size.width, size.height, viewport.height]);

  useFrame((_, delta) => {
    if (!group.current || !glass.current) return;
    const dt = Math.min(delta, 0.05);
    time.current += dt;
    glass.current.uniforms.uT.value = time.current;
    const mobile = size.width / size.height < 0.9;
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
    const state = physics.current;
    const { hx, hy, hs, dx, dy, ps, spin } = state;
    hx.t = (x * viewport.width) / 2;
    hy.t = (y * viewport.height) / 2;
    hs.t = from[2] + (to[2] - from[2]) * blend;
    if (!ready.current) {
      hx.x = hx.t;
      hy.x = hy.t;
      hs.x = hs.t;
    }
    // Original integrator; home response is slightly slower than the HTML's .5s.
    stepSpring(hx, dt, 0.6, 1);
    stepSpring(hy, dt, 0.6, 1);
    stepSpring(hs, dt, 0.6, 1);
    stepSpring(ps, dt, 0.25, 1);
    if (state.pointerId === null) {
      stepSpring(dx, dt, 0.5, state.dz);
      stepSpring(dy, dt, 0.5, state.dz);
    }
    const X = hx.x + dx.x,
      Y = hy.x + dy.x,
      scale = hs.x * ps.x;
    group.current.position.set(X, Y, 0);
    group.current.scale.set(
      scale * (1 + Math.min(Math.abs(hx.v + dx.v) * 0.03, 0.14)),
      scale * (1 + Math.min(Math.abs(hy.v + dy.v) * 0.03, 0.14)),
      scale,
    );
    group.current.rotation.y += (0.06 + spin.y) * dt;
    group.current.rotation.x += spin.x * dt;
    const decay = Math.exp(-dt * 1.8);
    spin.x *= decay;
    spin.y *= decay;
    if (shade.current) {
      shade.current.position.set(X, Y - 1.9 * scale, -0.4);
      shade.current.scale.set(4.2 * scale, 0.9 * scale, 1);
    }
    const root = rootRef.current,
      p = pointer.current;
    if (root && p && state.pointerId === null) {
      const upx = viewport.height / size.height;
      const hovering =
        !p.blocked &&
        Math.hypot(p.x - (X / upx + size.width / 2), p.y - (-Y / upx + size.height / 2)) <
          (1.37 * hs.x) / upx;
      const cursor = hovering ? "grab" : "";
      if (root.style.cursor !== cursor) root.style.cursor = cursor;
    }
    if (pebbles.current) {
      pebbles.current.position.set(
        group.current.position.x * 0.7,
        group.current.position.y * 0.7,
        0,
      );
      pebbles.current.scale.setScalar(hs.x);
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
      <mesh ref={shade}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          vertexShader="varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }"
          fragmentShader="varying vec2 vUv; void main(){float a=1.-smoothstep(0.,.5,length(vUv-.5));gl_FragColor=vec4(.12,.4,.32,a*.17);}"
        />
      </mesh>
      <group ref={group}>
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
