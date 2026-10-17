/**
 * Speed-Scaled Points Formula
 * 
 * Faster response = significantly higher points.
 * - Base points: 50% of question max value for answering correctly.
 * - Speed bonus: Up to 50% of max value scaled by remaining time.
 * - Streak multiplier: 1.0x to 1.3x for consecutive correct answers.
 */
export function calculateSpeedPoints(
  isCorrect: boolean,
  timeTakenMs: number,
  timeLimitSec: number,
  maxPoints: number = 1000,
  currentStreak: number = 0,
  enableStreaks: boolean = true
): {
  points: number;
  basePoints: number;
  speedBonus: number;
  streakBonus: number;
  speedRatio: number;
} {
  if (!isCorrect) {
    return {
      points: 0,
      basePoints: 0,
      speedBonus: 0,
      streakBonus: 0,
      speedRatio: 0,
    };
  }

  const timeLimitMs = Math.max(1000, timeLimitSec * 1000);
  const clampedTimeTaken = Math.min(Math.max(0, timeTakenMs), timeLimitMs);
  
  // speedRatio: 1.0 = instant (0s), 0.0 = at the last millisecond
  const speedRatio = Math.max(0, (timeLimitMs - clampedTimeTaken) / timeLimitMs);

  // 50% guaranteed base for correctness, 50% scaled linearly by remaining time
  const basePoints = Math.round(maxPoints * 0.5);
  const speedBonus = Math.round(maxPoints * 0.5 * speedRatio);
  const subtotal = basePoints + speedBonus;

  // Streak multiplier:
  // Streak 0,1: +0%
  // Streak 2: +10%
  // Streak 3-4: +20%
  // Streak 5+: +30%
  let streakMultiplier = 1.0;
  if (enableStreaks && currentStreak >= 2) {
    if (currentStreak === 2) streakMultiplier = 1.1;
    else if (currentStreak <= 4) streakMultiplier = 1.2;
    else streakMultiplier = 1.3;
  }

  const streakBonus = Math.round(subtotal * (streakMultiplier - 1));
  const finalPoints = subtotal + streakBonus;

  return {
    points: finalPoints,
    basePoints,
    speedBonus,
    streakBonus,
    speedRatio,
  };
}

export function formatTimeTaken(ms: number): string {
  const sec = (ms / 1000).toFixed(2);
  return `${sec}s`;
}

export function formatScore(score: number): string {
  return new Intl.NumberFormat('en-US').format(score);
}
