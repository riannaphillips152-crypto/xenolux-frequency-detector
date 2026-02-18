let mic;
let fft;
let pitchDetector;
let currentFreq = 0;
let modelIsLoaded = false;

const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textAlign(CENTER, CENTER);

  // Initialize audio context dynamically on start
  userStartAudio().then(() => {
    mic = new p5.AudioIn();
    mic.start(startPitch); 

    // Setup FFT strictly for visualizer amplitude
    fft = new p5.FFT(0.8, 2048);
    fft.setInput(mic);
  });
}

// --- ML5 PITCH DETECTION ---

function startPitch() {
  // Use cloud-hosted model for easy GitHub Pages deployment
  const model_url = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/';
  pitchDetector = ml5.pitchDetection(model_url, getAudioContext(), mic.stream, modelLoaded);
}

function modelLoaded() {
  console.log('Model Loaded!');
  modelIsLoaded = true;
  getPitch(); 
}

function getPitch() {
  pitchDetector.getPitch(function(err, frequency) {
    if (frequency) {
      currentFreq = frequency;
    } else {
      currentFreq = 0; 
    }
    getPitch(); // Recursive loop to keep listening
  });
}

// --- TUNING MATH ---

function getTuningData(frequency) {
  // Filter out sub-bass rumble and high-end hiss
  if (frequency < 50 || frequency > 5000) return null;
  
  let exactMidiNote = 12 * Math.log2(frequency / 440) + 69;
  let closestMidiNote = Math.round(exactMidiNote);
  if (closestMidiNote < 0) return null;
  
  let targetFreq = 440 * Math.pow(2, (closestMidiNote - 69) / 12);
  let centsOff = 1200 * Math.log2(frequency / targetFreq);
  
  let noteIndex = closestMidiNote % 12;
  let octave = Math.floor(closestMidiNote / 12) - 1;
  
  return {
    name: noteNames[noteIndex] + octave,
    cents: centsOff
  };
}

// --- MAIN VISUAL LOOP ---

function draw() {
  background(15, 10, 20); 
  
  // Calculate a responsive sizing unit based on screen size
  let vmin = min(width, height) / 100;

  if (!modelIsLoaded) {
    fill(255);
    textSize(vmin * 4);
    text("Loading AI Pitch Model...", width/2, height/2);
    return;
  }

  // Analyze volume for the visualizer pulse
  fft.analyze();
  let volume = mic.getLevel();
  
  // Display frequency only if loud enough
  let displayFreq = volume > 0.02 ? currentFreq : 0;
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
      stroke(0, 255, 200); // Xenolux Teal
      strokeWeight(6);
      pitchRadius = vmin * 40; // Lock into target ring
    } else {
      stroke(180, 100, 255); // Cosmic Purple
      strokeWeight(3);
    }
    
    rotate(frameCount * 0.05);
    let vibration = map(volume, 0, 1, 0, vmin * 6);
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
      text("FLAT (Slide Right \u2192)", width / 2, height / 2 + (vmin * 15));
    } else {
      fill(255, 100, 100);
      text("SHARP (\u2190 Slide Left)", width / 2, height / 2 + (vmin * 15));
    }
  } else {
    fill(50);
    text("---", width / 2, height / 2 + (vmin * 2));
  }
  
  textSize(vmin * 2.5);
  fill(150);
  text("Double-tap screen to toggle full-screen.", width / 2, height - (vmin * 8));
}

// Ensure layout updates if screen rotates
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Enables audio on first click, and toggles full-screen on double-clicks
function doubleClicked() {
  let fs = fullscreen();
  fullscreen(!fs);
}
function mousePressed() {
  userStartAudio();
}