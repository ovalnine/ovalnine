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
      precision mediump float;
      uniform vec4 u_color;
      void main(void) {
        gl_FragColor = u_color;
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


  function initSphere() {
    // Sphere resolution
    const SEGMENTS = 30;
    const RINGS = 30

    var vertexBuffer = gl.createBuffer();
    var indexBuffer = gl.createBuffer();

    var vertices = new Float32Array((SEGMENTS+1) * (RINGS+1) * 3);
    var indices = new Uint16Array(SEGMENTS * RINGS * 6);

    return function drawSphere(xx, yy, zz, r) {
      let vx = [];
      let ix = [];

      // Generate the vertices and indices for the sphere
      for (let i = 0; i <= RINGS; i++) {
        const phi = (i / RINGS) * Math.PI;
        const y = Math.cos(phi) * r;

        for (let j = 0; j <= SEGMENTS; j++) {
          const theta = (j / SEGMENTS) * 2 * Math.PI;
          const x = Math.sin(phi) * Math.cos(theta) * r;
          const z = Math.sin(phi) * Math.sin(theta) * r;

          vx.push(x+xx, y-yy, z+zz);

          if (i < RINGS && j < SEGMENTS) {
            const first = i * (SEGMENTS + 1) + j;
            const second = first + SEGMENTS + 1;
            ix.push(first, second, first + 1);
            ix.push(second, second + 1, first + 1);
          }
        }
      }

      vertices.set(vx);
      indices.set(ix);

      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.DYNAMIC_DRAW);

      var vertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
      gl.enableVertexAttribArray(vertexPosition);
      gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);

      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
  }

  function initCamera() {
    // Camera component
    const CAM = 200 * Math.sqrt(2) / 2;
    const camera = glMatrix.vec3.fromValues(CAM, CAM, CAM);

    // Set the camera perspective
    const H = canvas.width / 2;
    const V = canvas.height / 2;
    const NEAR = 1.0;
    const FAR = 1000.0;

    // Create projection and model-view matrices
    const projectionMatrix = glMatrix.mat4.create();
    const modelViewMatrix = glMatrix.mat4.create();

    glMatrix.mat4.ortho(projectionMatrix, -H, H, -V, V, NEAR, FAR);

    return function rotateSetCamera() {

      // Rotate camera
      glMatrix.vec3.rotateY(camera, camera, [0, 0, 0], Math.PI / 720);

      // Point camera to origin
      glMatrix.mat4.lookAt(modelViewMatrix, camera, [0, 0, 0], [0, 1, 0]);

      // Pass the matrices to the shaders
      var projectionMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
      gl.uniformMatrix4fv(projectionMatrixUniform, false, projectionMatrix);

      var modelViewMatrixUniform = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
      gl.uniformMatrix4fv(modelViewMatrixUniform, false, modelViewMatrix);
    }
  }


  function clear() {
    var fillColor = [0.0, 0.0, 0.0, 1.0];
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      fillColor = [1.0, 1.0, 1.0, 1.0];
    }

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const colorLocation = gl.getUniformLocation(shaderProgram, "u_color");
    gl.uniform4fv(colorLocation, fillColor);
  }

  const S = 100; // Half a side of cube
  function initCube() {
    const vertices = new Float32Array([
      -S, -S, -S,
       S, -S, -S,
       S,  S, -S,
      -S,  S, -S,
      -S, -S,  S,
       S, -S,  S,
       S,  S,  S,
      -S,  S,  S,
    ]);

    const indices = new Uint16Array([
      0, 1,
      1, 2, 
      2, 3,
      3, 0,
      0, 4,
      4, 7,
      7, 3,
      4, 5,
      5, 1,
    ]);

    var vertexBuffer = gl.createBuffer();
    var indexBuffer = gl.createBuffer();

    return function drawCube() {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

      // Get the attribute pointer and enable it
      var vertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
      gl.enableVertexAttribArray(vertexPosition);
      gl.vertexAttribPointer(vertexPosition, 3, gl.FLOAT, false, 0, 0);

      gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
  }


  const G = 9.80665; // UNITS - m/s²
  const G_MS = G / 1000000; // ADJUST FOR MILLISECONDS
  const G_PX_MS = G_MS * 3779.5296; // ADJUST FOR PIXEL PHYSICAL SIZE
  const RADIUS = 25;
  const COLL_Y = S - RADIUS;
  const E = 0.99;

  let ball = {
    pos : { x: width / 2, y: -2 * S },
    vel: { x: 0, y: 0 },
  };

  function update() {
    var next = structuredClone(ball);

    var dt = Date.now() - t;
    t = Date.now();

    next.vel.y += G_PX_MS * dt;
    next.pos.y += (ball.vel.y * dt) + (G_PX_MS / 2) * (dt * dt);

    if (next.pos.y > COLL_Y) {
      let dy = COLL_Y - ball.pos.y;
      let t = (-ball.vel.y + Math.sqrt(ball.vel.y * ball.vel.y + 2 * G_PX_MS * dy)) / G_PX_MS;
      let v = G_PX_MS * t + ball.vel.y;

      next.vel.y = -v * E;
      next.pos.y = COLL_Y;
    }

    ball.vel.y = next.vel.y;
    ball.pos.y = next.pos.y;
  }

  var setCamera = initCamera();
  var drawCube = initCube();
  var drawSphere = initSphere();


  gl.useProgram(shaderProgram);

  gl.viewport(0, 0, canvas.width, canvas.height);

  function frame() {

    clear();
    setCamera();
    drawCube();
    drawSphere(0, ball.pos.y, 0, RADIUS);

    update();

    window.requestAnimationFrame(frame);
  }

  canvas.addEventListener('click', () => {
    ball = {
      pos : { x: width / 2, y: -2 * S },
      vel: { x: 0, y: 0 },
    };
  });

  var t = Date.now();
  window.requestAnimationFrame(frame);
})();
