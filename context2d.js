(function () {
  let container = document.querySelector("#container-context-2d");
  let width = container.offsetWidth;
  let height = container.offsetHeight;

  let canvas = document.querySelector("#canvas-context-2d");
  canvas.width = width;
  canvas.height = height;

  let ctx = canvas.getContext("2d");

  const GRAVITY = 9.80665 / 2; // UNITS - m/s²
  const GRAVITY_MS = GRAVITY / 1000000; // ADJUST FOR MILLISECONDS
  const GRAVITY_PIXEL_MS = GRAVITY_MS * 3779.5296; // ADJUST FOR PIXEL PHYSICAL SIZE

  let state = {
    radius: {
      x: 25,
      y: 25,
    },
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
    //CLEAR
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();

    //DRAW
    ctx.fillStyle = "black";
    ctx.ellipse(state.position.x, state.position.y, state.radius.x, state.radius.y, 0, 0, 2 * Math.PI);
    ctx.fill();

    var next = structuredClone(state);
    next.time = Date.now();

    var elapsed = next.time - state.time;
    next.velocity.y += next.acceleration.y * elapsed;
    next.position.y += ((next.velocity.y + state.velocity.y) / 2) * elapsed;

    let collisionHeight = canvas.height - state.radius.y;
    if (next.position.y > collisionHeight) {
      var dy = collisionHeight - state.position.y;
      var t = (-state.velocity.y + Math.sqrt(state.velocity.y * state.velocity.y + 2 * state.acceleration.y * dy)) / state.acceleration.y;
      var v = next.acceleration.y * t + state.velocity.y;

      state.time = next.time;
      state.velocity.y = -v * 0.99;
      state.position.y = canvas.height - state.radius.y;
    } else {
      state.time = next.time;
      state.velocity.y = next.velocity.y;
      state.position.y = next.position.y;
    }

    window.requestAnimationFrame(frame);
  }

  state.time = Date.now();
  window.requestAnimationFrame(frame);
})();
