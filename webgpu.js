(async function () {
  let container = document.querySelector("#container-webgl");
  let width = container.offsetWidth;
  let height = container.offsetHeight;

  let canvas = document.querySelector("#canvas-webgpu");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('webgpu');

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: 'premultiplied',
  });

  const vertWGSL = `
  @binding(0) @group(0) var<uniform> size: vec2<f32>;

  @vertex
  fn main(
    @location(0) vertex : vec2<f32>,
    @location(1) position: vec2<f32>
  ) -> @builtin(position) vec4<f32> {
    return vec4<f32>((vertex - position) * 2 / size, 0.0, 1.0);
  }
  `;

  const fragWGSL = `
  @fragment
  fn main() -> @location(0) vec4<f32> {
    return vec4(0.0, 0.0, 0.0, 1.0);
  }
  `;

  const renderPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: device.createShaderModule({
        code: vertWGSL,
      }),
      entryPoint: 'main',
      buffers: [
        {
          arrayStride: 2 * 4,
          stepMode: 'vertex',
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2'
            }
          ]
        },
        {
          arrayStride: 4 * 4,
          stepMode: 'instance',
          attributes: [
            {
              shaderLocation: 1,
              offset: 0,
              format: 'float32x2'
            },
            {
              shaderLocation: 2,
              offset: 2 * 4,
              format: 'float32x2'
            }
          ]
        }
      ]
    },
    fragment: {
      module: device.createShaderModule({
        code: fragWGSL,
      }),
      entryPoint: 'main',
      targets: [
        {
          format: presentationFormat,
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const compWGSL = `
  struct Ball {
    pos: vec2<f32>,
    vel: vec2<f32>,
  }

  @group(0) @binding(0) var<storage, read> state: array<Ball>;
  @group(0) @binding(1) var<storage, read_write> next: array<Ball>;
  @group(0) @binding(2) var<uniform> size: vec2<f32>;
  @group(0) @binding(3) var<uniform> radius: f32;
  @group(0) @binding(4) var<uniform> acceleration: f32;
  @group(0) @binding(5) var<uniform> elapsed: f32;

  @compute @workgroup_size(8, 1, 1)
  fn main(@builtin(local_invocation_index) i: u32) {
    // CALCULATE Y-AXIS VELOCITY AND POSITION
    var next_vel_y = state[i].vel.y + acceleration * elapsed;
    var next_pos_y = state[i].pos.y + ((next_vel_y + state[i].vel.y) / 2.0) * elapsed;

    let collisionHeight = (size.y / 2.0) - radius;
    if (next_pos_y > collisionHeight) {
      var dy = collisionHeight - state[i].pos.y;
      var t = (-state[i].vel.y + sqrt(pow(state[i].vel.y, 2) + 2 * acceleration * dy)) / acceleration;
      var v = acceleration * t + state[i].vel.y;

      next[i].vel.y = -v * 1;
      next[i].pos.y = collisionHeight;
    }
    else {
      next[i].vel.y = next_vel_y;
      next[i].pos.y = next_pos_y;
    }

    // CALCULATE X-AXIS VELOCITY AND POSITION
    var next_vel_x = state[i].vel.x;
    var next_pos_x = state[i].pos.x + state[i].vel.x * elapsed;

    let collisionWidth = (size.x / 2.0) - radius;
    if (next_pos_x > collisionWidth) {
      next[i].vel.x = -next_vel_x;
      next[i].pos.x = collisionWidth;
    }
    else if (next_pos_x < -collisionWidth) {
      next[i].vel.x = -next_vel_x;
      next[i].pos.x = -collisionWidth;
    }
    else {
      next[i].vel.x = next_vel_x;
      next[i].pos.x = next_pos_x;
    }
  }
  `

  const computePipeline = device.createComputePipeline({
    layout: 'auto',
    compute: {
      module: device.createShaderModule({
        code: compWGSL
      }),
      entryPoint: 'main'
    }
  });

  function getCircleData() {
    const segments = 40;
    const scale = 25;

    let vertices = [0, 0];
    let indices = [];
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * 2 * Math.PI;
      const x = Math.cos(theta) * scale;
      const y = Math.sin(theta) * scale;

      vertices.push(x);
      vertices.push(y);

      indices.push(0);
      indices.push(i + 1);
      indices.push((i + 1) % segments + 1)
    }

    return { vertices, indices };
  }

  // SIZE UNIFORM
  const sizeUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * 2,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true
  });
  new Float32Array(sizeUniformBuffer.getMappedRange()).set([canvas.width, canvas.height]);
  sizeUniformBuffer.unmap();

  // RADIUS UNIFORM
  const BALL_RADIUS = 25;
  const radiusUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true
  });
  new Float32Array(radiusUniformBuffer.getMappedRange()).set([BALL_RADIUS]);
  radiusUniformBuffer.unmap();

  // GRAVITY UNIFORM
  const GRAVITY = 9.80665; // UNITS - m/s²
  const GRAVITY_MS = GRAVITY / 1000000; // ADJUST FOR MILLISECONDS
  const GRAVITY_PIXEL_MS = GRAVITY_MS * 3779.5296; // ADJUST FOR PIXEL PHYSICAL SIZE
  const gravityUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true
  });
  new Float32Array(gravityUniformBuffer.getMappedRange()).set([GRAVITY_PIXEL_MS]);
  gravityUniformBuffer.unmap();

  // ELAPSED TIME BUFFER
  const stagingElapsedUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC
  })
  const elapsedUniformBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  });

  // CIRCLE DATA
  const circleData = getCircleData();
  const circleVertexBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * circleData.vertices.length,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true
  });
  const circleIndexBuffer = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * circleData.indices.length,
    usage: GPUBufferUsage.INDEX,
    mappedAtCreation: true
  });
  new Float32Array(circleVertexBuffer.getMappedRange()).set(circleData.vertices);
  circleVertexBuffer.unmap();
  new Uint16Array(circleIndexBuffer.getMappedRange()).set(circleData.indices);
  circleIndexBuffer.unmap();

  const renderBindGroup = device.createBindGroup({
    layout: renderPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: sizeUniformBuffer
        }
      }
    ]
  });

  const NO_OF_BALLS = 4;
  var ballInstances = [];
  for (var i = 0; i < NO_OF_BALLS; i++) {
    ballInstances.push(
      (Math.random() - 0.5) * ((canvas.width / 2) - BALL_RADIUS), // position.x 
      (Math.random() - 0.5) * ((canvas.height / 2) - BALL_RADIUS), // position.y 
      (Math.random() - 0.5) * GRAVITY_PIXEL_MS * 200, // velocity.x
      (Math.random() - 0.5) * GRAVITY_PIXEL_MS * 200, // velocity.y
    );
  }

  const ballInstanceBufferA = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * NO_OF_BALLS * 4,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
    mappedAtCreation: true,
  });

  const ballInstanceBufferB = device.createBuffer({
    size: Float32Array.BYTES_PER_ELEMENT * NO_OF_BALLS * 4,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE,
    mappedAtCreation: true
  });

  // Write data to initial instance buffer
  new Float32Array(ballInstanceBufferA.getMappedRange()).set(ballInstances);
  ballInstanceBufferA.unmap();

  new Float32Array(ballInstanceBufferB.getMappedRange()).set(ballInstances);
  ballInstanceBufferB.unmap();

  const bindGroupA = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: ballInstanceBufferA }},
      { binding: 1, resource: { buffer: ballInstanceBufferB }},
      { binding: 2, resource: { buffer: sizeUniformBuffer }},
      { binding: 3, resource: { buffer: radiusUniformBuffer }},
      { binding: 4, resource: { buffer: gravityUniformBuffer }},
      { binding: 5, resource: { buffer: elapsedUniformBuffer }}
    ]
  });

  const bindGroupB = device.createBindGroup({
    layout: computePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: ballInstanceBufferB }},
      { binding: 1, resource: { buffer: ballInstanceBufferA }},
      { binding: 2, resource: { buffer: sizeUniformBuffer }},
      { binding: 3, resource: { buffer: radiusUniformBuffer }},
      { binding: 4, resource: { buffer: gravityUniformBuffer }},
      { binding: 5, resource: { buffer: elapsedUniformBuffer }}
    ]
  });

  let time = Date.now();
  let flipflop = 1;
  async function frame() {
    // ELAPSED TIME UNIFORM
    const elapsedUniform = new Float32Array([Date.now() - time]);
    time = Date.now();

    await stagingElapsedUniformBuffer.mapAsync(GPUMapMode.WRITE);
    new Float32Array(stagingElapsedUniformBuffer.getMappedRange()).set(elapsedUniform);
    stagingElapsedUniformBuffer.unmap();

    // COMMAND ENCODER
    const commandEncoder = device.createCommandEncoder();

    // COPY ELAPSED TIME TO UNIFORM
    commandEncoder.copyBufferToBuffer(stagingElapsedUniformBuffer, 0, elapsedUniformBuffer, 0, Float32Array.BYTES_PER_ELEMENT);

    // COMPUTE
    const passEncoderCompute = commandEncoder.beginComputePass();
    passEncoderCompute.setPipeline(computePipeline);
    passEncoderCompute.setBindGroup(0, flipflop ? bindGroupA : bindGroupB)
    passEncoderCompute.dispatchWorkgroups(1);
    passEncoderCompute.end();

    // RENDER
    const textureView = context.getCurrentTexture().createView();

    const renderPassDescriptor = {
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setBindGroup(0, renderBindGroup);
    passEncoder.setVertexBuffer(1, flipflop ? ballInstanceBufferA : ballInstanceBufferB);
    passEncoder.setVertexBuffer(0, circleVertexBuffer);
    passEncoder.setIndexBuffer(circleIndexBuffer, "uint16");
    passEncoder.drawIndexed(circleData.indices.length, NO_OF_BALLS);
    passEncoder.end();

    // SUBMIT COMMANDS
    device.queue.submit([commandEncoder.finish()]);

    flipflop = 1 - flipflop;
    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
})();