import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const OPS = ["AND", "OR", "XOR", "NOR", "NAND", "XNOR"];

const scoreEl = document.querySelector("#score strong");
const message = document.querySelector("#message");
const nextButton = document.querySelector("#nextButton");
const buttons = [...document.querySelectorAll("[data-op]")];

let score = 0;

let game = {
  a: [],
  b: [],
  result: [],
  operation: null
};

const scenes = [];

const PALETTE = {
  blue: {
    main: 0x31d3ff,
    light: 0xb9f3ff,
    dark: 0x087ca8
  },

  yellow: {
    main: 0xffdf2e,
    light: 0xfff7a4,
    dark: 0xc59600
  },

  red: {
    main: 0xff4d69,
    light: 0xffa5b2,
    dark: 0xb51d3b
  }
};


/* =========================================================
   LOGIC
========================================================= */

function gate(a, b, op) {
  if (op === "AND")  return a & b;
  if (op === "OR")   return a | b;
  if (op === "XOR")  return a ^ b;
  if (op === "NOR")  return Number(!(a | b));
  if (op === "NAND") return Number(!(a & b));

  return Number(!(a ^ b)); // XNOR
}


function randomGrid() {
  return Array.from(
    { length: 27 },
    () => Math.random() < 0.5 ? 0 : 1
  );
}


/* =========================================================
   THREE.JS SETUP
========================================================= */

function makeRenderer(stage) {

  const scene = new THREE.Scene();

  /*
   * All three cubes use EXACTLY the same camera settings.
   * This prevents the cubes from appearing at different scales.
   */
  const camera = new THREE.PerspectiveCamera(
    30,
    1,
    0.1,
    100
  );

  camera.position.set(5.8, 4.8, 8.2);
  camera.lookAt(0, 0, 0);


  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
  );

  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;


  /*
   * Lighting
   */

  const ambient = new THREE.HemisphereLight(
    0xbfdcff,
    0x07101b,
    1.5
  );

  scene.add(ambient);


  const key = new THREE.DirectionalLight(
    0xffffff,
    4.2
  );

  key.position.set(-4, 7, 8);
  scene.add(key);


  const rim = new THREE.DirectionalLight(
    0x70cfff,
    2.0
  );

  rim.position.set(6, 1, -5);
  scene.add(rim);


  /*
   * IMPORTANT:
   * Every cube gets exactly the same transform.
   */

  const root = new THREE.Group();

  root.rotation.set(
    0.18,
    -0.48,
    0
  );

  /*
   * This is deliberately identical for A, B and Result.
   */
  root.scale.setScalar(1);


  scene.add(root);


  const state = {
    scene,
    camera,
    renderer,
    root,
    stage
  };

  scenes.push(state);

  stage.appendChild(renderer.domElement);

  return state;
}


/* =========================================================
   3D CUBE LATTICE
========================================================= */

function addCubeShell(root, color) {

  /*
   * Instead of making 27 overlapping boxes, create one
   * mathematically consistent 3x3x3 lattice.
   *
   * The cube extends from -1.5 to +1.5 on every axis.
   */

  const size = 3;
  const half = size / 2;

  const points = [];


  function addLine(
    x1, y1, z1,
    x2, y2, z2
  ) {
    points.push(
      x1, y1, z1,
      x2, y2, z2
    );
  }


  /*
   * Lines parallel to X
   */

  for (let y = -1.5; y <= 1.5; y += 1) {
    for (let z = -1.5; z <= 1.5; z += 1) {

      addLine(
        -half, y, z,
         half, y, z
      );
    }
  }


  /*
   * Lines parallel to Y
   */

  for (let x = -1.5; x <= 1.5; x += 1) {
    for (let z = -1.5; z <= 1.5; z += 1) {

      addLine(
        x, -half, z,
        x,  half, z
      );
    }
  }


  /*
   * Lines parallel to Z
   */

  for (let x = -1.5; x <= 1.5; x += 1) {
    for (let y = -1.5; y <= 1.5; y += 1) {

      addLine(
        x, y, -half,
        x, y,  half
      );
    }
  }


  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3)
  );


  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.42
  });


  const lattice = new THREE.LineSegments(
    geometry,
    material
  );

  root.add(lattice);
}


/* =========================================================
   3D SPHERES
========================================================= */

function addSphere(root, index, palette) {

  /*
   * Convert the 0-26 array index into a 3D coordinate.
   *
   * Positions are:
   *
   * -1, 0, +1
   *
   * on every axis.
   */

  const x = (index % 3) - 1;

  const y =
    Math.floor(index / 3) % 3 - 1;

  const z =
    Math.floor(index / 9) - 1;


  /*
   * Real 3D sphere.
   */

  const geometry = new THREE.SphereGeometry(
    0.31,
    48,
    32
  );


  const material = new THREE.MeshPhysicalMaterial({

    color: palette.main,

    roughness: 0.20,

    metalness: 0.02,

    clearcoat: 1.0,

    clearcoatRoughness: 0.10
  });


  const sphere = new THREE.Mesh(
    geometry,
    material
  );


  /*
   * IMPORTANT:
   *
   * The lattice is 3 units wide and its cell centers are
   * exactly 1 unit apart.
   *
   * Therefore the spheres sit precisely at the centers
   * of the 27 cells.
   */

  sphere.position.set(
    x,
    y,
    z
  );


  root.add(sphere);


  /*
   * Subtle glow behind the sphere.
   *
   * The glow is NOT used as the sphere itself.
   * The actual sphere above is a real 3D mesh.
   */

  const haloMaterial = new THREE.SpriteMaterial({

    color: palette.main,

    transparent: true,

    opacity: 0.10,

    depthWrite: false,

    blending: THREE.AdditiveBlending
  });


  const halo = new THREE.Sprite(
    haloMaterial
  );


  halo.scale.set(
    0.75,
    0.75,
    0.75
  );


  halo.position.set(
    x,
    y,
    z
  );


  root.add(halo);
}


/* =========================================================
   BUILD CUBE
========================================================= */

function buildScene(stage, data, kind) {

  const sceneState = makeRenderer(stage);

  const palette = PALETTE[kind];

  addCubeShell(
    sceneState.root,
    palette.main
  );


  data.forEach((value, index) => {

    if (value === 1) {

      addSphere(
        sceneState.root,
        index,
        palette
      );
    }
  });


  return sceneState;
}


/* =========================================================
   RENDERING
========================================================= */

function renderAll() {

  scenes.forEach(state => {

    state.renderer.render(
      state.scene,
      state.camera
    );
  });
}


function resize() {

  scenes.forEach(state => {

    const width =
      state.stage.clientWidth;

    const height =
      state.stage.clientHeight;


    /*
     * Prevent a zero-size canvas.
     */

    if (width <= 0 || height <= 0) {
      return;
    }


    state.camera.aspect =
      width / height;

    state.camera.updateProjectionMatrix();


    state.renderer.setSize(
      width,
      height,
      false
    );
  });


  renderAll();
}


/* =========================================================
   CLEANUP
========================================================= */

function clearScenes() {

  while (scenes.length > 0) {

    const state = scenes.pop();


    /*
     * Dispose all geometries/materials.
     */

    state.scene.traverse(object => {

      if (object.geometry) {
        object.geometry.dispose();
      }


      if (object.material) {

        if (Array.isArray(object.material)) {

          object.material.forEach(
            material => material.dispose()
          );

        } else {

          object.material.dispose();
        }
      }
    });


    state.renderer.dispose();


    state.renderer.domElement.remove();


    state.stage.innerHTML = "";
  }
}


/* =========================================================
   GAME ROUND
========================================================= */

function newRound() {

  clearScenes();


  game.a = randomGrid();

  game.b = randomGrid();


  game.operation =
    OPS[
      Math.floor(
        Math.random() * OPS.length
      )
    ];


  game.result =
    game.a.map((value, index) => {

      return gate(
        value,
        game.b[index],
        game.operation
      );
    });


  /*
   * Build all three cubes.
   *
   * They now have:
   *
   * - identical camera
   * - identical position
   * - identical rotation
   * - identical scale
   * - identical lattice dimensions
   */

  buildScene(
    document.getElementById("stageA"),
    game.a,
    "blue"
  );


  buildScene(
    document.getElementById("stageB"),
    game.b,
    "yellow"
  );


  buildScene(
    document.getElementById("stageR"),
    game.result,
    "red"
  );


  message.textContent = "";

  nextButton.classList.add("hidden");


  buttons.forEach(button => {

    button.disabled = false;

    button.classList.remove(
      "correct",
      "wrong"
    );
  });


  resize();
}


/* =========================================================
   ANSWER
========================================================= */

function choose(op) {

  const button =
    document.querySelector(
      `[data-op="${op}"]`
    );


  if (op === game.operation) {

    score++;

    scoreEl.textContent =
      score;


    message.textContent =
      `Correct — ${op}`;


    button.classList.add(
      "correct"
    );


    buttons.forEach(
      button => {
        button.disabled = true;
      }
    );


    nextButton.classList.remove(
      "hidden"
    );

  } else {

    message.textContent =
      "Incorrect — try another operation.";


    button.classList.add(
      "wrong"
    );


    button.disabled = true;
  }
}


/* =========================================================
   EVENTS
========================================================= */

buttons.forEach(button => {

  button.addEventListener(
    "click",
    () => choose(button.dataset.op)
  );
});


nextButton.addEventListener(
  "click",
  newRound
);


window.addEventListener(
  "resize",
  resize
);


/* =========================================================
   START
========================================================= */

newRound();
