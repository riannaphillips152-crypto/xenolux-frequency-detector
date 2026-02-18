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

  // Initialize the audio context and microphone
  audioContext = getAudioContext();
  mic = new p5.AudioIn();
  mic.start(initPitchDetection);

  // Setup FFT strictly for the visual volume pulses
  fft = new p5.FFT(0.8, 2048);
  fft.setInput(mic);
}

function initPitchDetection() {
  // Pointing to your local folder containing model.json and the 14 .bin files
  const modelUrl = './model/';
  
  crepe = ml5.pitchDetection(modelUrl, audioContext, mic.stream, modelLoaded);
}

function modelLoaded() {
  console.log("Model Loaded: CREPE (Local Offline Mode)");
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
    // Recursive loop to keep listening continuously
    getPitch();
  });
}

// --- TUNING MATH ---
function getTuningData(freq) {
  // Filter out sub-bass rumble and high-end hiss
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
  
  // Responsive sizing unit based on screen size
  let vmin = min(width, height) / 100;

  // Show loading screen until the local AI files are fully unpacked in memory
  if (!modelIsLoaded) {
    fill(255);
    textSize(vmin * 4);
    text("Loading Local AI Pitch Model...", width/2, height/2);
    return;
  }

  // Analyze audio level for the visualizer pulse
  fft.analyze();
  let micLevel = mic.getLevel();
  
  // Display frequency only if loud enough (filters room noise)
  let displayFreq = micLevel > 0.02 ? frequency : 0;
  let tuningData = getTuningData(displayFreq);

  // --- THE VISUALIZER ---
  push();
  translate(width / 2, height / 2);
  
  // The Target Ring (Bach structure)
  stroke(230, 180, 80, 100); 
  strokeWeight(2);
  noFill();
  ellipse(0, 0, vmin * 40, vmin * 40); 

  if (tuningData) {
    // The Actual Pitch Ring (Sun Ra disruption)
    let pitchRadius = map(tuningData.cents, -50, 50, vmin * 25, vmin * 55);
    pitchRadius = constrain(pitchRadius, vmin * 20, vmin * 60); 

    let isTuned = Math.abs(tuningData.cents) < 6; 
    
    if (isTuned) {
      stroke(0, 255, 200); // Xenolux Teal Lock-in
      strokeWeight(6);
      pitchRadius = vmin * 40; 
    } else {
      stroke(180, 100, 255); // Cosmic Purple
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
  
  // Diagnostic display and Instructions
  textSize(vmin * 2);
  fill(100);
  text("AudioContext: " + audioContext.state, width / 2, height - (vmin * 6));
  text("Tap screen to activate audio. Double-tap for fullscreen.", width / 2, height - (vmin * 3));
}

// Ensure layout updates if the screen rotates
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Handle audio activation and full-screen toggling
function doubleClicked() {
  let fs = fullscreen();
  fullscreen(!fs);
}
function mousePressed() {
  userStartAudio();
}