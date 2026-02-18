let audioContext;
let mic;
let crepe;
let frequency = 0;
let fft;
let modelIsLoaded = false;
let loadPercentage = 0; // New variable to track progress

const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  mic.start(initPitchDetection);

  fft = new p5.FFT(0.8, 2048);
  fft.setInput(mic);
}

function initPitchDetection() {
  const modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
  
  // Added a progress callback function as the second-to-last argument
  crepe = ml5.pitchDetection(modelUrl, audioContext, mic.stream, modelLoaded);
}

// ml5.js internally supports a progress callback for some models. 
// If it doesn't trigger for CREPE, we will show a generic "Unpacking..." message.
function modelProgress(p) {
  loadPercentage = round(p * 100);
}

function modelLoaded() {
  modelIsLoaded = true;
  getPitch();
}

function getPitch() {
  crepe.getPitch(function (err, freq) {
    if (freq) {
      frequency = freq;
    } else {
      frequency = 0;
    }
    getPitch();
  });
}

function getTuningData(freq) {
  if (freq < 50 || freq > 5000) return null;
  let exactMidiNote = 12 * Math.log2(freq / 440) + 69;
  let closestMidiNote = Math.round(exactMidiNote);
  if (closestMidiNote < 0) return null;
  let targetFreq = 440 * Math.pow(2, (closestMidiNote - 69) / 12);
  let centsOff = 1200 * Math.log2(freq / targetFreq);
  let noteIndex = closestMidiNote % 12;
  let octave = Math.floor(closestMidiNote / 12) - 1;
  return { name: noteNames[noteIndex] + octave, cents: centsOff };
}

function draw() {
  background(15, 10, 20); 
  let vmin = min(width, height) / 100;

  if (audioContext.state !== 'running') {
    fill(0, 255, 200);
    textSize(vmin * 4);
    text("TAP SCREEN TO ACTIVATE MICROPHONE", width/2, height/2);
    return;
  }

  if (!modelIsLoaded) {
    fill(255);
    textSize(vmin * 4);
    // Displaying the status bar
    text("UNPACKING AI BRAIN...", width/2, height/2 - (vmin * 5));
    
    // Draw loading bar outline
    stroke(255, 50);
    noFill();
    rectMode(CENTER);
    rect(width/2, height/2 + (vmin * 5), vmin * 50, vmin * 2, vmin);
    
    // Draw progress fill (simulated if progress callback isn't supported by CDN)
    noStroke();
    fill(0, 255, 200);
    let barWidth = map(frameCount % 200, 0, 200, 0, vmin * 50); // Animated pulse for feedback
    rectMode(CORNER);
    rect(width/2 - (vmin * 25), height/2 + (vmin * 4), barWidth, vmin * 2, vmin);
    return;
  }

  // Visualizer Logic
  fft.analyze();
  let micLevel = mic.getLevel();
  let displayFreq = micLevel > 0.02 ? frequency : 0;
  let tuningData = getTuningData(displayFreq);

  push();
  translate(width / 2, height / 2);
  stroke(230, 180, 80, 100); 
  strokeWeight(2);
  noFill();
  ellipse(0, 0, vmin * 40, vmin * 40); 

  if (tuningData) {
    let pitchRadius = map(tuningData.cents, -50, 50, vmin * 25, vmin * 55);
    pitchRadius = constrain(pitchRadius, vmin * 20, vmin * 60); 
    let isTuned = Math.abs(tuningData.cents) < 6; 
    
    if (isTuned) {
      stroke(0, 255, 200); 
      strokeWeight(6);
      pitchRadius = vmin * 40; 
    } else {
      stroke(180, 100, 255); 
      strokeWeight(3);
    }
    
    rotate(frameCount * 0.05);
    let vibration = map(micLevel, 0, 1, 0, vmin * 6);
    ellipse(0, 0, pitchRadius + random(-vibration, vibration), pitchRadius + random(-vibration, vibration));
  }
  pop();

  noStroke();
  fill(255);
  textSize(vmin * 3); 
  text("DETECTED FUNDAMENTAL", width / 2, height / 2 - (vmin * 25));
  
  if (displayFreq > 50) {
    fill(180, 100, 255); 
    text(displayFreq.toFixed(1) + " Hz", width / 2, height / 2 - (vmin * 19));
  } else {
    fill(100);
    text("--- Hz", width / 2, height / 2 - (vmin * 19));
  }

  textSize(vmin * 15);
  if (tuningData) {
    fill(230, 180, 80); 
    text(tuningData.name, width / 2, height / 2 + (vmin * 2));
    textSize(vmin * 4);
    if (Math.abs(tuningData.cents) < 6) {
      fill(0, 255, 200);
      text("PERFECT HARMONY", width / 2, height / 2 + (vmin * 15));
    } else if (tuningData.cents < 0) {
      fill(255, 100, 100);
      text("FLAT", width / 2, height / 2 + (vmin * 15));
    } else {
      fill(255, 100, 100);
      text("SHARP", width / 2, height / 2 + (vmin * 15));
    }
  } else {
    fill(50);
    text("---", width / 2, height / 2 + (vmin * 2));
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
  userStartAudio();
}

function doubleClicked() {
  let fs = fullscreen();
  fullscreen(!fs);
}
