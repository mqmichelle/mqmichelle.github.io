let agents = [];
let agentCount = 2800;

// particle settings
let noiseScale = 0.008;
let noiseStrength = 10;
let stepSize = 1.6;
let jitter = 0.3;

function setup() {
  let canvas = createCanvas(1000, 700);

  pixelDensity(1);

  // create many particle agents
  for (let i = 0; i < agentCount; i++) {
    agents.push(new Agent(random(width), random(height)));
  }
  
  background(250);
}

function draw() {
  // semi-transparent overlay fades old trails slowly
  noStroke();
  fill(250, 8);
  rect(0, 0, width, height);

  // update and draw all agents every frame
  for (let a of agents) {
    a.update();
    a.display();
  }
}


// particle agent
class Agent {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.px = x; // previous x, used to draw a line from last position
    this.py = y; // previous y
  }

  update() {
    // save current position before moving
    this.px = this.x;
    this.py = this.y;

    // sample a noise value at this position and convert to an angle
    let angle = noise(this.x * noiseScale, this.y * noiseScale) * TWO_PI * noiseStrength;

      // inside a letter: move along the noise angle with slight random jitter
      this.x += cos(angle) * stepSize + random(-jitter, jitter);
      this.y += sin(angle) * stepSize + random(-jitter, jitter);
    }


  display() {
    // draw a short line from previous position to current position，thousands of these tiny lines build up the flowing texture
    stroke(20, 100);
    strokeWeight(0.8);
    line(this.px, this.py, this.x, this.y);
  }
}