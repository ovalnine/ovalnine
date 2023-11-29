(function () {
  let container = document.querySelector("#container-context-2d");
  let width = container.offsetWidth;
  let height = container.offsetHeight;

  let canvas = document.querySelector("#canvas-context-2d");
  canvas.width = width;
  canvas.height = height;

  let ctx = canvas.getContext("2d");

  ctx.fillStyle = "black";
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    ctx.fillStyle = "white";
  }

  const G = 9.80665;            // m/s²
  const G_MS = G / 1_000_000;   // m/ms² 
  const PX_M = 96 / 0.0254;     // px/m
  const G_PX_MS = G_MS * PX_M;  // px/ms²
  const RADIUS = 25;
  const COLL_Y = canvas.height - RADIUS;
  const E = 0.99

  let ball = {
    pos: { x: width / 2, y: 0 },
    vel: { x: 0, y: 0 },
  };

  function draw() {
    //CLEAR
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //DRAW
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

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

  function frame() {
    draw();
    update();
    window.requestAnimationFrame(frame);
  }

  canvas.addEventListener('click', () => {
    ball = {
      pos: { x: width / 2, y: 0 },
      vel: { x: 0, y: 0 },
    };
  });

  var t = Date.now();
  window.requestAnimationFrame(frame);
})();
