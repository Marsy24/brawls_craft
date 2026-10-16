import type { Save } from "../types";
/** Synthesized original hit cues; bounded voice rate. No external audio resources. */
export class AudioBus {
  private context?: AudioContext;
  private last = 0;
  constructor(private settings: Save["settings"]) {}
  hit(hurt = false) {
    if (!this.settings.sound || performance.now() - this.last < 70) return;
    this.last = performance.now();
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") void this.context.resume();
      const c = this.context,
        o = c.createOscillator(),
        g = c.createGain();
      o.type = hurt ? "triangle" : "sine";
      o.frequency.setValueAtTime(hurt ? 140 : 420, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(
        hurt ? 55 : 130,
        c.currentTime + 0.1,
      );
      g.gain.setValueAtTime(this.settings.volume * 0.07, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.11);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.12);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    } catch {
      /* Audio may be unavailable; combat must keep running. */
    }
  }
  destroy() {
    void this.context?.close();
  }
}
