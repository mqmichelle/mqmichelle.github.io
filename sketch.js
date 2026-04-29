let cleanPoints = [];
let noisyStates = [];
let particles = [];

let targetLayer;
let patternLayer;

let canvasW = 1000;
let canvasH = 1600;

let bgImg;
let tileCountX = 4;
let tileCountY = 4;
let tileCount;
let tileW, tileH;
let tileMode = [];
let range = 10;
let lastTrigger = 0;
let interval = 2500;

// ===== poster text =====
let word =
  "Generative Representation:\n" +
  "Encoding Transparency";

let subTitle = "COMM 250 Class Final Exhibition";
let footer = "UNC Communication Studies Department";

// ===== diffusion title settings =====
let T = 140;
let ptsPerSample = 3;
let currentStep = 0;
let mode = "reverse";
let playing = true;

let holdFrames = 20;
let holdCounter = 0;

// ===== visuals =====
let bgCol = 8;
let fadeAlpha = 15;
let strokeAlpha = 255;
let pointWeight = 2.0;

// diffusion schedule
let betaMin = 0.25;
let betaMax = 4.0;

// reverse recovery settings
let correctionStrength = 0.16;
let driftStrength = 0.018;
let jitterReverse = 0.12;

// title position: keep centered, but at the poster's original upper area
let titleCenterY;

// body text opacity
let infoAlpha = 180;

function preload() {
  bgImg = loadImage("flower.png");
}

function setup() {
  // createCanvas(canvasW, canvasH);
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  titleCenterY = height * 0.3;

  tileCount = tileCountX * tileCountY;
  tileW = width / tileCountX;
  tileH = height / tileCountY;

  for (let i = 0; i < tileCount; i++) {
    tileMode[i] = floor(random(range));
  }

  targetLayer = createGraphics(width, height);
  targetLayer.pixelDensity(1);

  patternLayer = createGraphics(width, height);
  patternLayer.pixelDensity(1);

  buildFlowerTileBackground();
  buildTarget(word);
  precomputeNoisyStates();
  resetParticlesForMode();

  background(bgCol);
}

function draw() {
  if (millis() - lastTrigger > interval) {
    scramble();
    buildFlowerTileBackground();
    lastTrigger = millis();
  }

  image(patternLayer, 0, 0);

  noStroke();
  fill(bgCol, 220);
  rect(0, 0, width, height);
  

  // subtle trail fade for title animation
  noStroke();
  fill(bgCol, fadeAlpha);
  rect(0, 0, width, height);

  if (playing) {
    updateStep();
  }

  if (mode === "forward") {
    drawForwardState();
  } else {
    updateReverseParticles();
    drawReverseParticles();
  }

  drawStaticText();
  drawDescription();
  drawArtists();
}

function updateStep() {
  if (holdCounter > 0) {
    holdCounter--;
    return;
  }

  if (mode === "forward") {
    currentStep++;

    if (currentStep >= T - 1) {
      currentStep = T - 1;
      mode = "reverse";
      resetParticlesForMode();
      holdCounter = holdFrames;
      background(bgCol);
    }
  } else {
    currentStep--;

    if (currentStep <= 0) {
      currentStep = 0;
      mode = "forward";
      holdCounter = holdFrames;
      background(bgCol);
    }
  }
}

function buildTarget(txt) {
  targetLayer.clear();
  targetLayer.background(0);
  targetLayer.fill(255);
  targetLayer.noStroke();
  targetLayer.textAlign(CENTER, CENTER);
  targetLayer.textStyle(BOLD);
  targetLayer.textSize(70);
  targetLayer.textLeading(80);

  // keep centered, but move to original poster title position
  targetLayer.text(txt, width / 2, titleCenterY);

  targetLayer.loadPixels();
  cleanPoints = [];

  for (let y = 0; y < height; y += ptsPerSample) {
    for (let x = 0; x < width; x += ptsPerSample) {
      let idx = 4 * (y * width + x);
      let b = targetLayer.pixels[idx];
      if (b > 10) {
        cleanPoints.push(createVector(x, y));
      }
    }
  }
}

function precomputeNoisyStates() {
  noisyStates = [];
  noisyStates[0] = [];

  for (let i = 0; i < cleanPoints.length; i++) {
    noisyStates[0][i] = cleanPoints[i].copy();
  }

  for (let t = 1; t < T; t++) {
    noisyStates[t] = [];

    let beta = map(t, 1, T - 1, betaMin, betaMax);

    for (let i = 0; i < cleanPoints.length; i++) {
      let prev = noisyStates[t - 1][i];

      let nx = prev.x + randomGaussian() * beta;
      let ny = prev.y + randomGaussian() * beta;

      noisyStates[t][i] = createVector(nx, ny);
    }
  }
}

function resetParticlesForMode() {
  particles = [];

  if (mode === "forward") {
    currentStep = 0;
    return;
  }

  currentStep = T - 1;

  for (let i = 0; i < cleanPoints.length; i++) {
    let start = noisyStates[T - 1][i].copy();
    particles.push({
      pos: start.copy(),
      prev: start.copy(),
      vel: createVector(0, 0),
      anchor: cleanPoints[i].copy(),
      id: i
    });
  }
}

function drawForwardState() {
  stroke(255, strokeAlpha);
  strokeWeight(pointWeight);

  let state = noisyStates[currentStep];

  for (let i = 0; i < state.length; i++) {
    point(state[i].x, state[i].y);
  }
}

function updateReverseParticles() {
  let targetState = noisyStates[currentStep];

  for (let i = 0; i < particles.length; i++) {
    let p = particles[i];
    p.prev.set(p.pos);

    let xt = targetState[i];
    let predictedNoise = p5.Vector.sub(p.pos, xt);

    let correction = predictedNoise.mult(-correctionStrength);

    let n = noise(p.pos.x * 0.004, p.pos.y * 0.004, frameCount * 0.004);
    let angle = n * TWO_PI * 4.0;
    let drift = p5.Vector.fromAngle(angle).mult(driftStrength * 20);

    let progress = map(currentStep, T - 1, 0, 0, 1);
    let jr = lerp(jitterReverse, 0.01, progress);
    let jit = createVector(random(-jr, jr), random(-jr, jr));

    p.vel.mult(0.72);
    p.vel.add(correction);
    p.vel.add(drift);
    p.vel.add(jit);

    p.pos.add(p.vel);
  }
}

function drawReverseParticles() {
  stroke(255, strokeAlpha);
  strokeWeight(pointWeight);

  for (let p of particles) {
    line(p.prev.x, p.prev.y, p.pos.x, p.pos.y);
  }
}

function drawStaticText() {
  push();
  noStroke();
  textAlign(CENTER, CENTER);
  fill(255, 200);

  textSize(28);
  text(subTitle, width / 2, height * 0.58);

  textSize(20);
  text(footer, width / 2, height * 0.62);
  pop();
}

function drawDescription() {
  push();
  noStroke();
  fill(255, infoAlpha);
  textAlign(LEFT, BOTTOM);
  textSize(16);
  textLeading(24);

  text(
    "COMM 250: Computational Art and Generative Media\n\n" +
      "Throughout the semester, our class explored computation as\n" +
      "a technical system and a mode of inquiry. Using p5.js and\n" +
      "JavaScript, we investigate how color, motion, light, sound, and\n" +
      "data are encoded and expressed through code.\n\n" +
      "The final exhibition presents interactive installations developed\n" +
      "through creative coding. Each project poses a conceptual\n" +
      "question and explores it through generative systems, revealing\n" +
      "how computation shapes perception and representation.",
    80,
    height - 120
  );

  pop();
}

function drawArtists() {
  push();
  noStroke();

  let driftY = sin(frameCount * 0.03) * 6;

  fill(255, infoAlpha);
  textAlign(CENTER, BOTTOM);
  textSize(16);
  textLeading(24);

  text(
    "Instructor\n" +
      "Kelsey Brod\n\n" +
      "Artists\n" +
      "Zoe Anderson\n" +
      "Luna Hayes\n" +
      "Lauren Kutchens\n" +
      "Grace Rothwell\n" +
      "Meiqian Wu",
    width - 160,
    height - 120 + driftY
  );

  pop();
}

function buildFlowerTileBackground() {
  patternLayer.clear();
  patternLayer.background(0);

  for (let i = 0; i < tileCountX; i++) {
    for (let j = 0; j < tileCountY; j++) {
      let sx = i * tileW;
      let sy = j * tileH;
      let index = i + j * tileCountX;
      let modeNow = tileMode[index];

      let tile = bgImg.get(sx, sy, tileW, tileH);

      if (modeNow === 1) tile.filter(THRESHOLD, 0.5);
      if (modeNow === 2) tile.filter(GRAY);
      if (modeNow === 3) tile.filter(BLUR, 1);
      if (modeNow === 4) tile.filter(POSTERIZE, 7);
      if (modeNow === 5) tile.filter(POSTERIZE, 3);
      if (modeNow === 6) tile.filter(INVERT);
      if (modeNow === 7) tile.filter(THRESHOLD, 0.25);

      if (modeNow === 8) {
        halfToneToLayer(patternLayer, tile, sx, sy);
      } else if (modeNow === 9) {
        halfToneRectToLayer(patternLayer, tile, sx, sy);
      } else {
        patternLayer.image(tile, sx, sy, tileW, tileH);
      }
    }
  }
}

function halfToneToLayer(pg, tile, x, y) {
  tile.loadPixels();

  let step = 3;
  pg.noStroke();
  pg.fill(130, 99, 191);

  for (let i = 0; i < tile.width; i += step) {
    for (let j = 0; j < tile.height; j += step) {
      let index = (i + j * tile.width) * 4;

      let r = tile.pixels[index];
      let g = tile.pixels[index + 1];
      let b = tile.pixels[index + 2];

      let bright = (r + g + b) / 3;
      let size = map(bright, 0, 255, step, 0);

      pg.ellipse(x + i, y + j, size);
    }
  }
}

function halfToneRectToLayer(pg, tile, x, y) {
  tile.loadPixels();

  let step = 2;
  pg.noStroke();
  pg.fill(130, 99, 191);

  for (let i = 0; i < tile.width; i += step) {
    for (let j = 0; j < tile.height; j += step) {
      let index = (i + j * tile.width) * 4;

      let r = tile.pixels[index];
      let g = tile.pixels[index + 1];
      let b = tile.pixels[index + 2];

      let bright = (r + g + b) / 3;
      let size = map(bright, 0, 255, step, 0);

      pg.rect(x + i, y + j, size, size);
    }
  }
}

function scramble() {
  for (let i = 0; i < tileCount; i++) {
    tileMode[i] = floor(random(range));
  }
}


function rebuildAll() {
  buildTarget(word);
  precomputeNoisyStates();
  resetParticlesForMode();
  background(bgCol);
}
