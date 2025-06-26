export default class TimerController {
  private time: number;
  private interval: Timer | null;
  private onTimerEnd: () => void;
  private onTimeStart: () => void;
  private timeRemaining: number;

  constructor(time: number, onTimeEnd: () => void, onTimeStart: () => void = () => {}) {
    this.time = time;
    this.timeRemaining = time;
    this.interval = null;
    this.onTimerEnd = onTimeEnd;
    this.onTimeStart = onTimeStart;
  }

  public start() {
    this.timeRemaining = this.time;
    this.onTimeStart();
    this.interval = setInterval(() => {
      this.timeRemaining--;
      if (this.timeRemaining <= 0) {
        this.onTimerEnd();
        this.stop();
      }
    }, 1000);
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  public getTime() {
    return this.timeRemaining;
  }

  public isRunning() {
    return this.interval !== null;
  }
}