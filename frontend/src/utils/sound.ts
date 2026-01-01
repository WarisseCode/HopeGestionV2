// frontend/src/utils/sound.ts

/**
 * Plays a pleasant notification sound using the Web Audio API.
 * This avoids needing external MP3 files and works in all modern browsers.
 */
export const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    
    // Create oscillator (sound generator)
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Settings for a pleasant "SMS-like" chime
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(500, ctx.currentTime); // Start at 500Hz
    oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1); // Slide up to 1000Hz (Chi-ing!)

    // Envelope for volume
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime); // Start soft
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); // Fade out quick

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error('Failed to play notification sound', e);
  }
};
