const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AudioCtx();
  }
  if (sharedCtx.state === "suspended") {
    sharedCtx.resume();
  }
  return sharedCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.3) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    // silent fail
  }
}

/** Two rising tones – peer joined */
export function playJoinSound() {
  playTone(600, 0.15, "sine", 0.25);
  setTimeout(() => playTone(900, 0.2, "sine", 0.25), 120);
}

/** Two falling tones – peer left */
export function playLeaveSound() {
  playTone(700, 0.15, "sine", 0.2);
  setTimeout(() => playTone(400, 0.25, "sine", 0.2), 120);
}

/** Short click – PTT start */
export function playPTTClick() {
  playTone(1200, 0.05, "square", 0.15);
}

/** Channel switch – radio tuning sound */
export function playChannelSwitchSound() {
  playTone(1400, 0.06, "sawtooth", 0.12);
  setTimeout(() => playTone(800, 0.08, "sawtooth", 0.1), 60);
  setTimeout(() => playTone(1100, 0.1, "sine", 0.2), 130);
}

/** Incoming private call – urgent ringtone */
export function playIncomingCallSound() {
  playTone(800, 0.2, "sine", 0.4);
  setTimeout(() => playTone(1000, 0.2, "sine", 0.4), 200);
  setTimeout(() => playTone(800, 0.2, "sine", 0.4), 400);
  setTimeout(() => playTone(1000, 0.3, "sine", 0.4), 600);
}

/** Emergency alert – 3 urgent radio rings */
export function playEmergencyRingSound() {
  const ring = (offset: number) => {
    playTone(1200, 0.12, "square", 0.45);
    setTimeout(() => playTone(1500, 0.12, "square", 0.45), offset + 120);
    setTimeout(() => playTone(1200, 0.12, "square", 0.45), offset + 240);
    setTimeout(() => playTone(1500, 0.15, "square", 0.5), offset + 360);
  };
  ring(0);
  setTimeout(() => ring(0), 600);
  setTimeout(() => ring(0), 1200);
}

/** VIP join – majestic fanfare, louder */
export function playVipJoinSound() {
  playTone(523, 0.15, "sine", 0.5);       // C5
  setTimeout(() => playTone(659, 0.15, "sine", 0.5), 120);  // E5
  setTimeout(() => playTone(784, 0.15, "sine", 0.5), 240);  // G5
  setTimeout(() => playTone(1047, 0.3, "sine", 0.55), 360); // C6 hold
  setTimeout(() => playTone(784, 0.12, "sine", 0.4), 560);  // G5
  setTimeout(() => playTone(1047, 0.4, "sine", 0.55), 680); // C6 final
}

/** VIP leave – descending royal chord */
export function playVipLeaveSound() {
  playTone(1047, 0.15, "sine", 0.45);
  setTimeout(() => playTone(784, 0.15, "sine", 0.4), 130);
  setTimeout(() => playTone(659, 0.15, "sine", 0.35), 260);
  setTimeout(() => playTone(523, 0.35, "sine", 0.3), 390);
}
