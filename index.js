const canvas = document.getElementById("renderCanvas"); // Get the canvas element
const engine = new BABYLON.Engine(canvas, true); // Generate the BABYLON 3D engine

let scene;
let havokInstance;
HavokPhysics().then((havok) => {
  // Havok is now available
  havokInstance = havok;
});

const mouseSensitivity = 0.0003;
const rotationXMin = -Math.PI / 2;
const rotationXMax = Math.PI / 2;
const nextSphereDistanceMin = 3;
const nextSphereDistanceMax = 6;
let sphere;
let spherePhysics;

var camera;
var physicsEngine;
var raycastResult = new BABYLON.PhysicsRaycastResult();

function clamp(num, min, max) {
  return Math.min(Math.max(num, min), max);
}

var mouseMove = function (e) {
  deltaTime = engine.getDeltaTime();

  var movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
  var movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

  camera.rotation.x += movementY * deltaTime * mouseSensitivity;
  camera.rotation.y += movementX * deltaTime * mouseSensitivity;

  camera.rotation.x = clamp(camera.rotation.x, rotationXMin, rotationXMax);
};

function shoot() {
  var start = camera.position;

  var direction = camera.getDirection(BABYLON.Vector3.Forward()).normalize();
  var end = start.add(direction.scale(1000));
  physicsEngine.raycastToRef(start, end, raycastResult);
  if (raycastResult.hasHit) {
    spherePhysics.dispose();
    const nextSphereDistance =
      nextSphereDistanceMin +
      Math.random() * (nextSphereDistanceMax - nextSphereDistanceMin);
    const position = sphere.position;
    let degreeLimit = 360;
    let baselineDegree = -180;
    if (position.y < nextSphereDistance) {
      const theta = Math.acos(-position.y / nextSphereDistance) - Math.PI / 2;
      degreeLimit = theta * 2;
      baselineDegree = -theta;
    }
    const degree = baselineDegree + Math.random() * degreeLimit;
    position.y += nextSphereDistance * Math.cos(degree);
    position.x += nextSphereDistance * Math.sin(degree);
    sphere.setAbsolutePosition(position);
    spherePhysics = new BABYLON.PhysicsAggregate(
      sphere,
      BABYLON.PhysicsShapeType.SPHERE,
      { mass: 0, restitution: 0 },
      scene
    );
  }
}

function setupPointerLock() {
  // register the callback when a pointerlock event occurs
  document.addEventListener("pointerlockchange", changeCallback, false);
  document.addEventListener("mozpointerlockchange", changeCallback, false);
  document.addEventListener("webkitpointerlockchange", changeCallback, false);

  // when element is clicked, we're going to request a
  // pointerlock
  canvas.onclick = function () {
    shoot();
    canvas.requestPointerLock =
      canvas.requestPointerLock ||
      canvas.mozRequestPointerLock ||
      canvas.webkitRequestPointerLock;

    // Ask the browser to lock the pointer)
    canvas.requestPointerLock({ unadjustedMovement: true });
  };
}

function changeCallback(e) {
  if (
    document.pointerLockElement === canvas ||
    document.mozPointerLockElement === canvas ||
    document.webkitPointerLockElement === canvas
  ) {
    // we've got a pointerlock for our element, add a mouselistener
    document.addEventListener("mousemove", mouseMove, false);
    document.addEventListener("mousedown", mouseMove, false);
    document.addEventListener("mouseup", mouseMove, false);
  } else {
    // pointer lock is no longer active, remove the callback
    document.removeEventListener("mousemove", mouseMove, false);
    document.removeEventListener("mousedown", mouseMove, false);
    document.removeEventListener("mouseup", mouseMove, false);
  }
}

function createCrossHair() {
  const advancedTexture =
    BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
  const crosshair = new BABYLON.GUI.Ellipse();
  crosshair.thickness = 4;
  crosshair.width = "10px";
  crosshair.height = "10px";
  crosshair.color = "Blue";
  crosshair.background = "Blue";
  advancedTexture.addControl(crosshair);
}

function addSphere(scene) {
  sphere = BABYLON.MeshBuilder.CreateSphere(
    "sphere",
    { diameter: 0.5, segments: 32 },
    scene
  );
  const sphereMaterial = new BABYLON.StandardMaterial("Sphere", scene);
  sphereMaterial.emissiveColor = new BABYLON.Color3(1, 0, 0);
  sphere.material = sphereMaterial;
  // Move the sphere upward 1/2 its height
  sphere.position.y = 1;
  sphere.position.z = 20;

  spherePhysics = new BABYLON.PhysicsAggregate(
    sphere,
    BABYLON.PhysicsShapeType.SPHERE,
    { mass: 1, restitution: 0.75 },
    scene
  );
}

const createScene = async function () {
  // Creates a basic Babylon Scene object
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

  // initialize plugin
  const havokInstance = await HavokPhysics();
  const havokPlugin = new BABYLON.HavokPlugin(true, havokInstance);
  // enable physics in the scene with a gravity
  scene.enablePhysics(new BABYLON.Vector3(0, 0, 0), havokPlugin);
  physicsEngine = scene.getPhysicsEngine();

  // Built-in 'ground' shape.
  BABYLON.MeshBuilder.CreateGround("ground", { width: 20, height: 100 }, scene);

  camera = new BABYLON.UniversalCamera(
    "FPS",
    new BABYLON.Vector3(0, 1, -20),
    scene
  );
  camera.minZ = 0.0001;
  camera.setTarget(BABYLON.Vector3.Zero());

  scene.activeCameras.push(camera);
  setupPointerLock();

  createCrossHair();

  addSphere(scene);

  // Register a render loop to repeatedly render the scene
  engine.runRenderLoop(function () {
    scene.render();
  });

  return scene;
};
createScene().then((s) => (scene = s));

// Watch for browser/canvas resize events
window.addEventListener("resize", function () {
  engine.resize();
});
