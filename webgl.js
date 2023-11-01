(function () {
  let container = document.querySelector("#container-webgl");
  let width = container.offsetWidth;
  let height = container.offsetHeight;

  let canvas = document.querySelector("#canvas-webgl");
  canvas.width = width;
  canvas.height = height;

  // Initialize WebGL context
  var gl = canvas.getContext("webgl2");

  if (!gl) {
    console.error("WebGL is not supported in your browser.");
  }

  // Vertex shader program
  var vsSource = `
      attribute vec4 aVertexPosition;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      void main(void) {
          gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      }
  `;

  // Fragment shader program
  var fsSource = `
      void main(void) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      }
  `;

  // Compile the shaders
  function compileShader(source, type) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  var vertexShader = compileShader(vsSource, gl.VERTEX_SHADER);
  var fragmentShader = compileShader(fsSource, gl.FRAGMENT_SHADER);

  // Create a shader program
  var shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(shaderProgram));
  }

  function drawCube(s) {
    // Define cube vertices
    var vertices = new Float32Array([
      -s, -s, -s,
       s, -s, -s,
       s,  s, -s,
      -s,  s, -s,
      -s, -s,  s,
       s, -s,  s,
       s,  s,  s,
      -s,  s,  s,
    ]);

    // Define cube edges
    var indices = new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0, 0, 4, 4, 7, 7, 3, 4, 5, 5, 1]);

    // Create a buffer for the cube's vertices
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // Create a buffer for the cube's edges
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    // Get the attribute location and enable it
    var vertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(vertexPosition);
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);

    gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
  }

  function drawSphere(xx, yy, zz, rr) {
    const segments = 40;
    const rings = 40;

    // Arrays to store the vertices and indices
    let vertices = [];
    let indices = [];

    // Generate the vertices and indices for the sphere
    for (let i = 0; i <= rings; i++) {
      const phi = (i / rings) * Math.PI;
      const y = Math.cos(phi) * rr;

      for (let j = 0; j <= segments; j++) {
        const theta = (j / segments) * 2 * Math.PI;
        const x = Math.sin(phi) * Math.cos(theta) * rr;
        const z = Math.sin(phi) * Math.sin(theta) * rr;

        vertices.push(x+xx, y-yy, z+zz);

        if (i < rings && j < segments) {
          const first = i * (segments + 1) + j;
          const second = first + segments + 1;
          indices.push(first, second, first + 1);
          indices.push(second, second + 1, first + 1);
        }
      }
    }

    const vx = new Float32Array(vertices);
    const ix = new Uint16Array(indices);

    // Create a buffer for the cube's vertices
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vx, gl.STATIC_DRAW);

    // Create a buffer for the cube's edges
    var indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ix, gl.STATIC_DRAW);

    // Get the attribute location and enable it
    var vertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(vertexPosition);
    gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);

    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  }

  function setCamera() {
    // Create projection and model-view matrices
    var projectionMatrix = glMatrix.mat4.create();
    var modelViewMatrix = glMatrix.mat4.create();

    // Set the camera perspective
    var hh = canvas.width / 2;
    var vv = canvas.height / 2;
    var near = 1.0;
    var far = 1000.0;

    glMatrix.mat4.ortho(projectionMatrix, -hh, hh, -vv, vv, near, far);

    // Set the camera position and orientation
    var cameraPosition2 = [0, 0, 200];
    glMatrix.vec3.rotateY(cameraPosition2, cameraPosition2, [0, 0, 0], ((-3 * Math.PI) / 4) + Date.now() * 0.001);
    var cameraPosition1 = [0, 0, 200];
    glMatrix.vec3.rotateX(cameraPosition1, cameraPosition1, [0, 0, 0], Math.PI / 4);
    var cameraPosition = [cameraPosition2[0], cameraPosition1[1], cameraPosition2[2]];
    glMatrix.mat4.lookAt(modelViewMatrix, cameraPosition, [0, 0, 0], [0, 1, 0]);

    // Pass the matrices to the shaders
    var projectionMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    var modelViewMatrixUniform = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    gl.uniformMatrix4fv(projectionMatrixUniform, false, projectionMatrix);
    gl.uniformMatrix4fv(modelViewMatrixUniform, false, modelViewMatrix);
  }

  function clear() {
    // Set the clear color and enable depth testing
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    // Clear the canvas and draw the wireframe cube
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  const GRAVITY = 9.80665 / 2; // UNITS - m/s²
  const GRAVITY_MS = GRAVITY / 1000000; // ADJUST FOR MILLISECONDS
  const GRAVITY_PIXEL_MS = GRAVITY_MS * 3779.5296; // ADJUST FOR PIXEL PHYSICAL SIZE
  let state = {
    cube: 100,
    radius: 25,
    position: {
      x: width / 2,
      y: 0,
    },
    velocity: {
      y: 0,
    },
    acceleration: {
      y: GRAVITY_PIXEL_MS,
    },
    time: Date.now(),
  };

  function frame() {
    clear();
    gl.useProgram(shaderProgram);
    setCamera();
    drawCube(state.cube);
    drawSphere(0, (state.position.y - state.cube), 0, state.radius);

    var next = structuredClone(state);
    next.time = Date.now();

    var elapsed = next.time - state.time;
    next.velocity.y += next.acceleration.y * elapsed;
    next.position.y += ((next.velocity.y + state.velocity.y) / 2) * elapsed;

    let collisionHeight = state.cube * 2 - state.radius;
    if (next.position.y > collisionHeight) {
      var dy = collisionHeight - state.position.y;
      var t = (-state.velocity.y + Math.sqrt(state.velocity.y * state.velocity.y + 2 * state.acceleration.y * dy)) / state.acceleration.y;
      var v = next.acceleration.y * t + state.velocity.y;

      state.time = next.time;
      state.velocity.y = -v * 0.99;
      state.position.y = collisionHeight;
    } else {
      state.time = next.time;
      state.velocity.y = next.velocity.y;
      state.position.y = next.position.y;
    }

    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
})();
