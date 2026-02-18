let audioContext;
let mic;
let crepe;
let frequency = 0;
let fft;
let modelIsLoaded = false;

const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  // Start the mic, then immediately trigger the AI model to start loading
  mic.start(initPitchDetection);

  fft = new p5.FFT(0.8, 2048);
  fft.setInput(mic);
}

function initPitchDetection() {
  // Swapped to Cloud URL - Browser will cache this for offline use at the festival!
  const modelUrl = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
  crepe = ml5.pitchDetection(modelUrl, audioContext, mic.stream, modelLoaded);
}

function modelLoaded() {
  console.log("Model Loaded: CREPE (Cloud/Cache Mode)");
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

// --- MAIN VISUAL LOOP ---
function draw() {
  background(15, 10, 20); 
  let vmin = min(width, height) / 100;

  // GATEKEEPER 1: Force user interaction to start the audio stream
  if (audioContext.state !== 'running') {
    fill(0, 255, 200); // Xenolux Teal
    textSize(vmin * 4);
    text("TAP SCREEN TO ACTIVATE MICROPHONE", width/2, height/2);
    return; // Stops the rest of the code from running until they click
  }

  // GATEKEEPER 2: Wait for AI to unpack
  if (!modelIsLoaded) {
    fill(255);
    textSize(vmin * 4);
    text("Loading AI Pitch Model...", width/2, height/2);
    return;
  }

  // Analyze audio level for the visualizer pulse
  fft.analyze();
  let micLevel = mic.getLevel();
  
  let displayFreq = micLevel > 0.02 ? frequency : 0;
  let tuningData = getTuningData(displayFreq);

  // --- THE VISUALIZER ---
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

  // --- TYPOGRAPHY ---
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
  
  textSize(vmin * 2);
  fill(100);
  text("Double-tap for fullscreen.", width / 2, height - (vmin * 3));
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Handles user interaction
function doubleClicked() {
  let fs = fullscreen();
  fullscreen(!fs);
}

function mousePressed() {
  // This explicitly turns on the microphone and audio context when the user clicks
  userStartAudio();
}
