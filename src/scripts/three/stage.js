/**
 * Shared Three.js stage: renderer, environment, sky dome, ground and moods.
 * Used by the hero (scroll-driven camera), the interactive viewer and the
 * offline asset renderer (scripts/render-assets.mjs).
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createCabin, setXray } from './cabin.js';

const MOODS = {
  day: {
    skyTop: 0x2d5b8a, skyHorizon: 0xcfe0ea, ground: 0x6f7a72, groundFar: 0xb9c7cc,
    sun: 0xfff1dc, sunI: 3.2, hemi: 0.9, env: 0.9, exposure: 1.0,
    stars: 0, led: 0.25, glow: 0, sunPos: [-9, 14, 10],
  },
  dusk: {
    skyTop: 0x06080c, skyHorizon: 0x4a2418, ground: 0x0a0c0f, groundFar: 0x5a2c1e,
    sun: 0xffa566, sunI: 2.4, hemi: 0.35, env: 0.55, exposure: 1.05,
    stars: 0.55, led: 1, glow: 0.55, sunPos: [-14, 4.5, 8],
  },
  night: {
    skyTop: 0x020308, skyHorizon: 0x0f1a2c, ground: 0x05070a, groundFar: 0x16243a,
    sun: 0x8fb4ff, sunI: 0.55, hemi: 0.12, env: 0.25, exposure: 1.1,
    stars: 1, led: 1, glow: 1, sunPos: [8, 12, -6],
  },
};

function skyDome() {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() { vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 horizon; varying vec3 vPos;
      void main() {
        float h = clamp(vPos.y, 0.0, 1.0);
        vec3 c = mix(horizon, top, smoothstep(0.0, 0.22, h));
        c += horizon * 0.6 * exp(-h * 30.0);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function starField(count = 1400) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // upper hemisphere only
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(1 - Math.random() * 0.92);
    const r = 350;
    pos[i * 3] = r * Math.sin(v) * Math.cos(u);
    pos[i * 3 + 1] = r * Math.cos(v);
    pos[i * 3 + 2] = r * Math.sin(v) * Math.sin(u);
    size[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uScale: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float seed; uniform float uTime; uniform float uScale; varying float vA;
      void main() {
        vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.6 + seed * 1.8) + seed * 40.0));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (0.8 + seed * 1.9) * uScale;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA * uOpacity;
        gl_FragColor = vec4(vec3(0.85, 0.92, 1.0), a);
      }`,
  });
  return new THREE.Points(g, m);
}

function groundDisc() {
  const geo = new THREE.CircleGeometry(160, 64);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      near: { value: new THREE.Color() },
      far: { value: new THREE.Color() },
      gridOpacity: { value: 0.12 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 near; uniform vec3 far; uniform float gridOpacity; varying vec3 vW;
      float gridLine(vec2 p, float s) {
        vec2 g = abs(fract(p / s - 0.5) - 0.5) / fwidth(p / s);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main() {
        float d = length(vW.xz);
        vec3 c = mix(near, far, pow(smoothstep(8.0, 150.0, d), 0.7));
        float g = gridLine(vW.xz, 1.0) * 0.5 + gridLine(vW.xz, 5.0);
        g *= (1.0 - smoothstep(3.0, 20.0, d)) * gridOpacity;
        c += vec3(1.0, 0.55, 0.2) * g;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

export function createStage(canvas, { antialias = true, pixelRatio = 1.75, shadows = true, preserveDrawingBuffer = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 900);
  camera.position.set(14, 5, 16);

  const sky = skyDome();
  const stars = starField();
  const ground = groundDisc();
  scene.add(sky, stars, ground);

  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.45 }));
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0.005;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x2a211c, 0.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = shadows;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -10;
  sun.shadow.camera.right = 10;
  sun.shadow.camera.top = 10;
  sun.shadow.camera.bottom = -10;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 50;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // Warm interior light + front glow on the deck — driven by `glow`.
  const interiorLight = new THREE.PointLight(0xffb070, 0, 9, 1.6);
  interiorLight.position.set(0.5, 2.4, 0.2);
  const porch = new THREE.PointLight(0xffa060, 0, 7, 1.8);
  porch.position.set(-3.4, 3.4, 4.6);
  scene.add(interiorLight, porch);

  const cabin = createCabin();
  scene.add(cabin.root);

  const state = { mood: 'dusk', xray: false };

  function setMood(name) {
    const m = MOODS[name] || MOODS.dusk;
    state.mood = name;
    sky.material.uniforms.top.value.set(m.skyTop);
    sky.material.uniforms.horizon.value.set(m.skyHorizon);
    ground.material.uniforms.near.value.set(m.ground);
    ground.material.uniforms.far.value.set(m.groundFar);
    ground.material.uniforms.gridOpacity.value = name === 'day' ? 0.04 : 0.09;
    stars.material.uniforms.uOpacity.value = m.stars;
    stars.visible = m.stars > 0;
    sun.color.set(m.sun);
    sun.intensity = m.sunI;
    sun.position.set(...m.sunPos);
    hemi.intensity = m.hemi;
    scene.environmentIntensity = m.env;
    renderer.toneMappingExposure = m.exposure;
    cabin.materials.led.color.setRGB(0.5 * m.led + 0.2, 0.91 * m.led + 0.3, 1.0 * m.led + 0.3);
    cabin.materials.ledHalo.opacity = 0.05 + 0.22 * m.led;
    cabin.materials.glass.emissiveIntensity = 0.28 * m.glow;
    interiorLight.intensity = 14 * m.glow;
    porch.intensity = 6 * m.glow;
    shadowCatcher.material.opacity = name === 'day' ? 0.35 : 0.5;
  }

  function setX(on) {
    state.xray = on;
    setXray(cabin, on);
  }

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    stars.material.uniforms.uScale.value = renderer.getPixelRatio() * Math.min(1.4, h / 700);
  }

  const clock = new THREE.Clock();
  let raf = 0;
  let running = false;
  const tickers = new Set();
  function frame() {
    raf = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    stars.material.uniforms.uTime.value = t;
    for (const fn of tickers) fn(t);
    renderer.render(scene, camera);
  }
  function start() {
    if (running) return;
    running = true;
    clock.start();
    frame();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }
  function renderOnce() {
    renderer.render(scene, camera);
  }

  setMood('dusk');
  resize();

  return {
    THREE, renderer, scene, camera, cabin, sun, state,
    setMood, setXray: setX, resize, start, stop, renderOnce,
    onTick: (fn) => (tickers.add(fn), () => tickers.delete(fn)),
    dispose() {
      stop();
      renderer.dispose();
    },
  };
}
