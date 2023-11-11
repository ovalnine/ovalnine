(function () {
  let container = document.querySelector("#container-context-2d");
  let width = container.offsetWidth;
  let height = container.offsetHeight;

  let canvas = document.querySelector("#canvas-context-2d");
  canvas.width = width;
  canvas.height = height;

  let ctx = canvas.getContext("2d");
  ctx.fillStyle = "black";

  const G = 9.80665 / 2; // UNITS - m/s²
  const G_MS = G / 1000000; // ADJUST FOR MILLISECONDS
  const G_PX_MS = G_MS * 3779.5296; // ADJUST FOR PIXEL PHYSICAL SIZE
  const RADIUS = 25;
  const E = 0.99
  const COLL_Y = canvas.height - RADIUS;

  let ball = {
    pos: { x: width / 2, y: 0 },
    vel: { x: 0, y: 0 },
  };

  function frame() {
    //CLEAR
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //DRAW
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, RADIUS, 0, Math.PI * 2);
    ctx.fill();

    var dt = Date.now() - t;
    t = Date.now();

    var next = structuredClone(ball);

    next.vel.y += G_PX_MS * dt;
    next.pos.y += ((next.vel.y + ball.vel.y) / 2) * dt;

    if (next.pos.y > COLL_Y) {
      let dy = COLL_Y - ball.pos.y;
      let t = (-ball.vel.y + Math.sqrt(ball.vel.y * ball.vel.y + 2 * G_PX_MS * dy)) / G_PX_MS;
      let v = G_PX_MS * t + ball.vel.y;

      next.vel.y = -v * E;
      next.pos.y = COLL_Y;
    }

    ball.vel.y = next.vel.y;
    ball.pos.y = next.pos.y;

    window.requestAnimationFrame(frame);
  }

  var t = Date.now();
  window.requestAnimationFrame(frame);
})();
