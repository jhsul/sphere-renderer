const VELOCITY = 0.1;

let canvas = null;
let gl = null;
let program = null;

let sphereSubdivisions = 3;
let chaikinSubdivisions = 1;

let index = 0;

let spherePoints = [];
let sphereNormals = [];

let isAnimating = false;
let isWireframe = false;
let isGouraud = false;

// View bounds for the orthogonal projection matrix
const view = {
  near: -10,
  far: 10,
  left: -12.0,
  right: 12.0,
  top: 12.0,
  bottom: -12.0,
};

// Vectors which define the tetrahedron
const sphereModel = {
  va: vec4(0.0, 0.0, -1.0, 1),
  vb: vec4(0.0, 0.942809, 0.333333, 1),
  vc: vec4(-0.816497, -0.471405, 0.333333, 1),
  vd: vec4(0.816497, -0.471405, 0.333333, 1),
};

const originalChaikinPoints = [
  vec4(-8, 8, 0, 1),
  vec4(2, 4, 0, 1),
  vec4(6, 6, 0, 1),
  vec4(10, -8, 0, 1),
  vec4(2, -2, 0, 1),
  vec4(-6, -2, 0, 1),
];

// Generate these from the original points every time
let chaikinPoints = originalChaikinPoints;

// Vectors associated with the lighting (Gourad and Phong)
const light = {
  position: vec4(1.0, 1.0, 1.0, 0.0),
  ambient: vec4(0.2, 0.2, 0.2, 1.0),
  diffuse: vec4(1.0, 1.0, 1.0, 1.0),
  specular: vec4(1.0, 1.0, 1.0, 1.0),
};

// The material data
const material = {
  ambient: vec4(1.0, 0.0, 1.0, 1.0),
  diffuse: vec4(1.0, 0.8, 0.0, 1.0),
  specular: vec4(1.0, 1.0, 1.0, 1.0),
  shininess: 20.0,
};

let projectionMatrix;
let projectionMatrixLoc;

let modelViewMatrix;
let modelViewMatrixLoc;

let eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

let spherePosition = originalChaikinPoints[0];
let targetPointIndex = 1;

const triangle = (a, b, c) => {
  spherePoints.push(a, b, c);

  sphereNormals.push(a[0], a[1], a[2], 0.0);
  sphereNormals.push(b[0], b[1], b[2], 0.0);
  sphereNormals.push(c[0], c[1], c[2], 0.0);

  index += 3;
};

const tetrahedron = (a, b, c, d, n) => {
  divideTriangle(a, b, c, n);
  divideTriangle(d, c, b, n);
  divideTriangle(a, d, b, n);
  divideTriangle(a, c, d, n);
};

const divideTriangle = (a, b, c, count) => {
  if (count > 0) {
    let ab = mix(a, b, 0.5);
    let ac = mix(a, c, 0.5);
    let bc = mix(b, c, 0.5);

    ab = normalize(ab, true);
    ac = normalize(ac, true);
    bc = normalize(bc, true);

    divideTriangle(a, ab, ac, count - 1);
    divideTriangle(ab, b, bc, count - 1);
    divideTriangle(bc, c, ac, count - 1);
    divideTriangle(ab, bc, ac, count - 1);
  } else {
    triangle(a, b, c);
  }
};

const main = () => {
  canvas = document.getElementById("webgl");

  document.addEventListener("keypress", keypressHandler);

  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) {
    alert("WebGL isn't available");
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  gl.enable(gl.DEPTH_TEST);

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  var diffuseProduct = mult(light.diffuse, material.diffuse);
  var specularProduct = mult(light.specular, material.specular);
  var ambientProduct = mult(light.ambient, material.ambient);

  //tetrahedron(model.va, model.vb, model.vc, model.vd, sphereSubdivisions);

  modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
  projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

  gl.uniform4fv(
    gl.getUniformLocation(program, "diffuseProduct"),
    flatten(diffuseProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "specularProduct"),
    flatten(specularProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "ambientProduct"),
    flatten(ambientProduct)
  );
  gl.uniform4fv(
    gl.getUniformLocation(program, "lightPosition"),
    flatten(light.position)
  );
  gl.uniform1f(gl.getUniformLocation(program, "shininess"), material.shininess);

  eye = vec3(0, 0, 1.5);

  modelViewMatrix = lookAt(eye, at, up);
  projectionMatrix = ortho(
    view.left,
    view.right,
    view.bottom,
    view.top,
    view.near,
    view.far
  );

  gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
  gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
  render();
};

const keypressHandler = (e) => {
  switch (e.key) {
    case "q":
    case "Q":
      sphereSubdivisions = Math.max(sphereSubdivisions - 1, 1);
      render();
      break;
    case "e":
    case "E":
      sphereSubdivisions = Math.min(sphereSubdivisions + 1, 8);
      render();
      break;

    case "j":
    case "J":
      if (chaikinSubdivisions === 1) break;
      chaikinSubdivisions--;

      getChaikinPoints();
      targetPointIndex = Math.ceil(targetPointIndex / 2);
      if (targetPointIndex >= chaikinPoints.length) targetPointIndex = 0;
      render();
      break;

    case "i":
    case "I":
      if (chaikinSubdivisions === 8) break;
      chaikinSubdivisions++;
      getChaikinPoints();
      targetPointIndex *= 2;
      render();
      break;

    case "a":
    case "A":
      isAnimating ^= true;
      animate();
      break;

    case "m":
    case "M":
      isWireframe ^= true;
      render();
      break;

    case "l":
    case "L":
      isGouraud ^= true;
      render();
      break;
    default:
      return;
  }
};

/**
 * Returns an array of points calculated from the original Chaikin points
 * and the number of Chaikin subdivisions
 */
const getChaikinPoints = () => {
  chaikinPoints = _getChaikinPoints(originalChaikinPoints, chaikinSubdivisions);
};

/**
 * Recursion go brr
 */
const _getChaikinPoints = (chaikinPoints, subDivisions) => {
  if (subDivisions === 1) return chaikinPoints;
  const newChaikinPoints = [];
  chaikinPoints.forEach((point, idx) => {
    //newChaikinPoints.push(point);
    const nextPoint =
      idx === chaikinPoints.length - 1
        ? chaikinPoints[0]
        : chaikinPoints[idx + 1];
    const q = add(scale(0.75, point), scale(0.25, nextPoint));
    const r = add(scale(0.25, point), scale(0.75, nextPoint));
    newChaikinPoints.push(q, r);
  });
  return _getChaikinPoints(newChaikinPoints, subDivisions - 1);
};

const drawSphere = () => {
  spherePoints = [];
  sphereNormals = [];
  index = 0;

  tetrahedron(
    sphereModel.va,
    sphereModel.vb,
    sphereModel.vc,
    sphereModel.vd,
    sphereSubdivisions
  );

  const translateMatrix = translate(...spherePosition.slice(0, 4));
  //console.log(translateMatrix);
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "translationMatrix"),
    false,
    flatten(translateMatrix)
  );

  // Set isWireframe
  const isWireframeLoc = gl.getUniformLocation(program, "isWireframe");
  gl.uniform1i(isWireframeLoc, isWireframe);

  // Set isGouraud
  const isGouraudLoc = gl.getUniformLocation(program, "isGouraud");
  gl.uniform1i(isGouraudLoc, isGouraud);

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(spherePoints), gl.STATIC_DRAW);

  const vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  const vNormal = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vNormal);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereNormals), gl.STATIC_DRAW);

  const vNormalPosition = gl.getAttribLocation(program, "vNormal");
  gl.vertexAttribPointer(vNormalPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vNormalPosition);

  if (isWireframe) {
    console.log("Drawing wireframe");
    gl.drawArrays(gl.LINE_LOOP, 0, spherePoints.length);
  } else {
    for (let i = 0; i < index; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);
  }
};

const drawChaikin = () => {
  //getChaikinPoints();
  const isChaikinLoc = gl.getUniformLocation(program, "isChaikin");
  gl.uniform1i(isChaikinLoc, true);

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, flatten(chaikinPoints), gl.STATIC_DRAW);

  const vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  gl.drawArrays(gl.LINE_LOOP, 0, chaikinPoints.length);
  gl.uniform1i(isChaikinLoc, false);
};

const render = () => {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  drawChaikin();
  drawSphere();
  //for (let i = 0; i < index; i += 3) gl.drawArrays(gl.TRIANGLES, i, 3);
};

const animate = () => {
  //console.log("animating");

  const targetPoint = chaikinPoints[targetPointIndex];

  console.log(`Targeting ${targetPointIndex}/${chaikinPoints.length}`);

  const u = subtract(targetPoint, spherePosition);
  const v = scale(VELOCITY, normalize(u));

  const nextPosition = add(spherePosition, v);

  // Check if overshooting (only use x coord lul)
  if (
    (spherePosition[0] < targetPoint[0] && nextPosition[0] > targetPoint[0]) ||
    (spherePosition[0] > targetPoint[0] && nextPosition[0] < targetPoint[0])
  ) {
    targetPointIndex =
      targetPointIndex === chaikinPoints.length - 1 ? 0 : targetPointIndex + 1;
  }

  spherePosition = nextPosition;

  render();
  if (isAnimating) requestAnimationFrame(animate);
};
