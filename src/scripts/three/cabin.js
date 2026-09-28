/**
 * Procedural model of the Space Cabin (12 × 3.5 m, 42 m²).
 *
 * The client supplies a production GLB/FBX; this procedural stand-in keeps the
 * same real-world dimensions so hotspots, the floor plan and camera paths stay
 * valid when the real model is dropped in (see README → "Replacing the model").
 *
 * Axes: X = length (12 m), Y = up, Z = width (3.5 m). Origin = footprint centre.
 */
import * as THREE from 'three';

export const DIM = {
  length: 12,
  width: 3.5,
  height: 3.0,
  radius: 1.15,
  lift: 0.55, // chassis height (top of galvanised frame)
  shell: 0.12,
};

function roundedRect(path, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  path.lineTo(x + w, y + h - r);
  path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  path.lineTo(x + r, y + h);
  path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  path.lineTo(x, y + r);
  path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return path;
}

export function createMaterials() {
  return {
    shell: new THREE.MeshPhysicalMaterial({
      color: 0xf1f3f5,
      roughness: 0.26,
      metalness: 0.0,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    }),
    shellInner: new THREE.MeshStandardMaterial({ color: 0xe9e4dc, roughness: 0.8 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x1b1f25, roughness: 0.45, metalness: 0.6 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x0c131b,
      roughness: 0.04,
      metalness: 0.2,
      transparent: true,
      opacity: 0.62,
      envMapIntensity: 1.6,
      emissive: new THREE.Color(0xffa54a),
      emissiveIntensity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    steel: new THREE.MeshStandardMaterial({ color: 0xa7b0ba, roughness: 0.32, metalness: 1 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.7 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x5b3a26, roughness: 0.75 }),
    floor: new THREE.MeshStandardMaterial({ color: 0xc9a47e, roughness: 0.65 }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x3c4450, roughness: 0.95 }),
    linen: new THREE.MeshStandardMaterial({ color: 0xf3eee6, roughness: 0.95 }),
    counter: new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.35, metalness: 0.2 }),
    led: new THREE.MeshBasicMaterial({ color: 0x7fe9ff, toneMapped: false }),
    ledHalo: new THREE.MeshBasicMaterial({
      color: 0x39c6ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
    screen: new THREE.MeshBasicMaterial({ color: 0xff7a1a, toneMapped: false }),
    railGlass: new THREE.MeshPhysicalMaterial({
      color: 0xbfe6ff,
      roughness: 0.05,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  };
}

function box(w, h, d, mat, x, y, z, parent, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  parent.add(m);
  return m;
}

export function createCabin() {
  const M = createMaterials();
  const { length: L, width: W, height: H, radius: R, lift, shell: T } = DIM;
  const root = new THREE.Group();
  root.name = 'SpaceCabin';

  // Everything is built in "profile space": x ∈ [-L/2, L/2], y ∈ [0, H], then lifted.
  const body = new THREE.Group();
  body.position.y = lift;
  root.add(body);

  // ── Shell band (roof / rounded ends / belly) ───────────────────────────────
  const ring = roundedRect(new THREE.Shape(), -L / 2, 0, L, H, R);
  ring.holes.push(roundedRect(new THREE.Path(), -L / 2 + T, T, L - 2 * T, H - 2 * T, R - T));
  const wallT = 0.1;
  const bandDepth = W - wallT * 2;
  const band = new THREE.Mesh(
    new THREE.ExtrudeGeometry(ring, { depth: bandDepth, bevelEnabled: false, curveSegments: 28 }),
    M.shell
  );
  band.position.z = -bandDepth / 2;
  band.castShadow = band.receiveShadow = true;
  body.add(band);

  // ── Side walls with openings ───────────────────────────────────────────────
  // +Z (front / terrace side): door + panoramic "visor" window.
  const door = { x0: -4.15, x1: -3.1, y0: 0.36, y1: 2.4 };
  const visor = { x0: -2.55, x1: 4.75, y0: 0.72, y1: 2.42, r: 0.55 };
  // −Z (rear): long clerestory strip + bathroom slot.
  const rearStrip = { x0: -1.6, x1: 4.6, y0: 1.55, y1: 2.35, r: 0.36 };
  const rearSlot = { x0: -5.0, x1: -4.3, y0: 1.8, y1: 2.35, r: 0.2 };

  const makeWall = (openings) => {
    const s = roundedRect(new THREE.Shape(), -L / 2, 0, L, H, R);
    for (const o of openings) {
      const p = new THREE.Path();
      if (o.r) roundedRect(p, o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0, o.r);
      else {
        p.moveTo(o.x0, o.y0);
        p.lineTo(o.x1, o.y0);
        p.lineTo(o.x1, o.y1);
        p.lineTo(o.x0, o.y1);
        p.closePath();
      }
      s.holes.push(p);
    }
    const g = new THREE.ExtrudeGeometry(s, {
      depth: wallT - 0.04,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.02,
      bevelSegments: 3,
      curveSegments: 28,
    });
    const m = new THREE.Mesh(g, M.shell);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const front = makeWall([door, visor]);
  front.position.z = W / 2 - wallT + 0.02;
  body.add(front);
  const rear = makeWall([rearStrip, rearSlot]);
  rear.position.z = -W / 2 + 0.02;
  body.add(rear);

  // Glazing panes sitting in the openings.
  const glassPane = (o, z) => {
    const s = new THREE.Shape();
    if (o.r) roundedRect(s, o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0, o.r);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(s, 24), M.glass);
    m.position.z = z;
    m.renderOrder = 2;
    body.add(m);
    return m;
  };
  const glassParts = [];
  glassParts.push(glassPane(visor, W / 2 - 0.05));
  glassParts.push(glassPane(rearStrip, -W / 2 + 0.05));
  glassParts.push(glassPane(rearSlot, -W / 2 + 0.05));

  // Graphite surrounds framing the glazing — gives the pod its "visor" face.
  const surround = (o, z, pad = 0.07) => {
    const s = roundedRect(new THREE.Shape(), o.x0 - pad, o.y0 - pad, o.x1 - o.x0 + pad * 2, o.y1 - o.y0 + pad * 2, o.r + pad);
    s.holes.push(roundedRect(new THREE.Path(), o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0, o.r));
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false, curveSegments: 24 }), M.trim);
    m.position.z = z;
    body.add(m);
  };
  surround(visor, W / 2 - 0.005);
  surround(rearStrip, -W / 2 - 0.025);

  // Visor mullions (thin dark fins)
  for (const x of [-0.1, 2.35]) box(0.05, visor.y1 - visor.y0, 0.06, M.trim, x, (visor.y0 + visor.y1) / 2, W / 2 - 0.04, body);

  // Door: framed glass leaf + handle.
  const doorGroup = new THREE.Group();
  body.add(doorGroup);
  const dw = door.x1 - door.x0;
  const dh = door.y1 - door.y0;
  const dx = (door.x0 + door.x1) / 2;
  const dy = (door.y0 + door.y1) / 2;
  const dz = W / 2 - 0.05;
  box(dw, 0.06, 0.07, M.trim, dx, door.y1 - 0.03, dz, doorGroup);
  box(dw, 0.06, 0.07, M.trim, dx, door.y0 + 0.03, dz, doorGroup);
  box(0.06, dh, 0.07, M.trim, door.x0 + 0.03, dy, dz, doorGroup);
  box(0.06, dh, 0.07, M.trim, door.x1 - 0.03, dy, dz, doorGroup);
  const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(dw - 0.1, dh - 0.1), M.glass);
  doorGlass.position.set(dx, dy, dz);
  doorGroup.add(doorGlass);
  glassParts.push(doorGlass);
  box(0.03, 0.5, 0.05, M.steel, door.x1 - 0.16, 1.1, dz + 0.05, doorGroup);

  // Smart control panel beside the door (glowing screen).
  box(0.2, 0.3, 0.03, M.trim, -2.83, 1.45, W / 2 + 0.02, body);
  const screen = box(0.15, 0.22, 0.01, M.screen, -2.83, 1.45, W / 2 + 0.04, body, { cast: false });

  // Roof skylight.
  const sky = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.03, 1.5), M.glass);
  sky.position.set(1.8, H + 0.005, 0);
  body.add(sky);
  glassParts.push(sky);
  const skyFrame = box(3.5, 0.02, 1.6, M.trim, 1.8, H - 0.002, 0, body, { cast: false });

  // Roof sensor / antenna puck (smart system)
  const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.08, 24), M.trim);
  puck.position.set(-2.2, H + 0.04, 0.6);
  body.add(puck);

  // ── LED halo lines tracing the profile on each side ─────────────────────────
  const inset = 0.22;
  const ledShape = roundedRect(new THREE.Shape(), -L / 2 + inset, inset, L - inset * 2, H - inset * 2, R - inset);
  // Keep only the upper arc (ends → roof) so the line never crosses the door.
  const pts = ledShape
    .getSpacedPoints(260)
    .filter((p) => p.y > 0.55)
    .map((p) => new THREE.Vector3(p.x, p.y, 0));
  const ledCurve = new THREE.CatmullRomCurve3(pts, false);
  const ledGeo = new THREE.TubeGeometry(ledCurve, 400, 0.018, 6, false);
  const haloGeo = new THREE.TubeGeometry(ledCurve, 400, 0.07, 8, false);
  const leds = [];
  for (const z of [W / 2 + 0.02, -W / 2 - 0.02]) {
    const led = new THREE.Mesh(ledGeo, M.led);
    led.position.z = z;
    const halo = new THREE.Mesh(haloGeo, M.ledHalo);
    halo.position.z = z;
    body.add(led, halo);
    leds.push(led, halo);
  }
  // Belly underglow strip
  const under = new THREE.Mesh(new THREE.PlaneGeometry(L - 2.6, W - 0.6), M.ledHalo);
  under.rotation.x = Math.PI / 2;
  under.position.y = -0.01;
  body.add(under);
  leds.push(under);

  // ── Interior (visible through glazing / X-ray) ─────────────────────────────
  const interior = new THREE.Group();
  body.add(interior);
  const fy = 0.36; // raised finished floor (services run underneath)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L - 1.2, W - 0.2), M.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = fy + 0.002;
  floor.receiveShadow = true;
  interior.add(floor);
  const iz = W / 2 - 0.1; // inner half width
  // Bedroom (x 3.2 → 5.6)
  box(1.7, 0.42, 1.9, M.woodDark, 4.35, fy + 0.21, -0.4, interior);
  box(1.66, 0.14, 1.86, M.linen, 4.35, fy + 0.49, -0.4, interior);
  box(0.12, 0.9, 1.9, M.wood, 5.25, fy + 0.45, -0.4, interior);
  // Partition bedroom | living
  box(0.08, 2.0, 1.6, M.shellInner, 3.05, fy + 1.0, -iz + 0.8, interior);
  // Living (x 0.2 → 3.0) — sofa facing the visor
  box(2.2, 0.42, 0.85, M.fabric, 1.5, fy + 0.21, -iz + 0.5, interior);
  box(2.2, 0.55, 0.2, M.fabric, 1.5, fy + 0.6, -iz + 0.12, interior);
  box(0.9, 0.3, 0.55, M.wood, 1.5, fy + 0.15, 0.35, interior);
  // Kitchen (x −2.7 → −0.2) along the rear wall
  box(2.5, 0.9, 0.62, M.counter, -1.45, fy + 0.45, -iz + 0.31, interior);
  box(2.5, 0.04, 0.64, M.linen, -1.45, fy + 0.92, -iz + 0.32, interior);
  box(1.2, 0.75, 0.6, M.wood, -1.2, fy + 0.375, 0.6, interior); // island
  // Bathroom (x −5.7 → −4.3, rear half)
  box(0.08, 2.0, 1.7, M.shellInner, -4.3, fy + 1.0, -iz + 0.85, interior);
  box(1.1, 2.0, 0.08, M.shellInner, -4.85, fy + 1.0, -iz + 1.7, interior);
  // Ceiling light strip (warm, glows at night)
  const warm = new THREE.MeshBasicMaterial({ color: 0xffc07a, toneMapped: false });
  const cove = new THREE.Mesh(new THREE.BoxGeometry(L - 3, 0.03, 0.06), warm);
  cove.position.set(0, H - T - 0.05, -iz + 0.2);
  interior.add(cove);

  // ── Galvanised chassis + adjustable legs ───────────────────────────────────
  const chassis = new THREE.Group();
  root.add(chassis);
  for (const z of [-1.2, 1.2]) box(L - 1.6, 0.22, 0.14, M.steel, 0, lift - 0.11, z, chassis);
  for (const x of [-5, -3, -1, 1, 3, 5]) box(0.12, 0.16, 2.5, M.steel, x, lift - 0.1, 0, chassis);
  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, lift - 0.2, 12);
  const footGeo = new THREE.BoxGeometry(0.34, 0.04, 0.34);
  for (const x of [-4.8, -1.6, 1.6, 4.8]) {
    for (const z of [-1.2, 1.2]) {
      const leg = new THREE.Mesh(legGeo, M.steel);
      leg.position.set(x, (lift - 0.2) / 2 + 0.02, z);
      leg.castShadow = true;
      const foot = new THREE.Mesh(footGeo, M.steel);
      foot.position.set(x, 0.02, z);
      foot.receiveShadow = true;
      chassis.add(leg, foot);
    }
  }

  // ── Terrace deck + steps + glass balustrade ────────────────────────────────
  const deck = new THREE.Group();
  root.add(deck);
  const deckX0 = -5.3;
  const deckX1 = -1.6;
  const deckZ0 = W / 2 + 0.02;
  const deckZ1 = W / 2 + 2.3;
  const deckTop = lift + fy;
  const planks = 14;
  const pw = (deckX1 - deckX0) / planks;
  for (let i = 0; i < planks; i++) {
    box(pw - 0.02, 0.05, deckZ1 - deckZ0, i % 2 ? M.wood : M.woodDark, deckX0 + pw * (i + 0.5), deckTop - 0.025, (deckZ0 + deckZ1) / 2, deck);
  }
  box(deckX1 - deckX0, 0.12, 0.1, M.steel, (deckX0 + deckX1) / 2, deckTop - 0.11, deckZ1 - 0.05, deck);
  for (const x of [deckX0 + 0.1, deckX1 - 0.1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, deckTop - 0.1, 10), M.steel);
    leg.position.set(x, (deckTop - 0.1) / 2, deckZ1 - 0.12);
    deck.add(leg);
  }
  // steps (towards +X end of deck)
  box(0.9, 0.05, 0.35, M.wood, deckX1 + 0.45, deckTop * 0.66, deckZ1 - 0.6, deck);
  box(0.9, 0.05, 0.35, M.wood, deckX1 + 0.8, deckTop * 0.33, deckZ1 - 0.6, deck);
  // balustrade
  const rail = new THREE.Mesh(new THREE.PlaneGeometry(deckX1 - deckX0 - 0.1, 0.95), M.railGlass);
  rail.position.set((deckX0 + deckX1) / 2, deckTop + 0.5, deckZ1 - 0.02);
  deck.add(rail);
  box(deckX1 - deckX0 - 0.1, 0.04, 0.05, M.steel, (deckX0 + deckX1) / 2, deckTop + 0.98, deckZ1 - 0.02, deck);
  const railSide = new THREE.Mesh(new THREE.PlaneGeometry(deckZ1 - deckZ0 - 0.05, 0.95), M.railGlass);
  railSide.rotation.y = Math.PI / 2;
  railSide.position.set(deckX0 + 0.02, deckTop + 0.5, (deckZ0 + deckZ1) / 2);
  deck.add(railSide);
  // Hotspots, in root space. `n` = outward normal used for back-face hiding.
  const hotspots = [
    { id: 'shell', p: [1.2, lift + H + 0.02, 0.9], n: [0, 1, 0.35] },
    { id: 'glass', p: [0.9, lift + 1.7, W / 2 + 0.06], n: [0, 0, 1] },
    { id: 'frame', p: [3.6, 0.3, 1.25], n: [0, 0.1, 1] },
    { id: 'insulation', p: [L / 2 + 0.02, lift + H / 2, 0.8], n: [1, 0, 0.4] },
    { id: 'smart', p: [-2.83, lift + 1.45, W / 2 + 0.08], n: [0, 0, 1] },
    { id: 'led', p: [-L / 2 + 0.45, lift + 2.45, W / 2 + 0.06], n: [-0.3, 0.2, 1] },
    { id: 'deck', p: [-4.1, deckTop + 0.02, W / 2 + 1.4], n: [0, 1, 0.5] },
  ];

  return {
    root,
    materials: M,
    parts: { band, front, rear, interior, chassis, deck, leds, glassParts, screen, cove, under, roof: [sky, skyFrame, puck] },
    hotspots,
  };
}

/** Toggle an X-ray view that reveals the interior layout. */
export function setXray(cabin, on) {
  const { shell } = cabin.materials;
  shell.transparent = on;
  shell.opacity = on ? 0.14 : 1;
  shell.depthWrite = !on;
  shell.needsUpdate = true;
  cabin.materials.glass.opacity = on ? 0.12 : 0.62;
  for (const p of [cabin.parts.band, cabin.parts.front, cabin.parts.rear]) p.castShadow = !on;
  for (const p of cabin.parts.roof) p.visible = !on;
}
