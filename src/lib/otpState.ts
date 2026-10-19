const CODE_LIFETIME_MS = 120_000;

export function otpStatus(sentAt: number, wrongAttempts: number, now: number) {
  const secondsLeft = Math.max(0, Math.ceil((sentAt + CODE_LIFETIME_MS - now) / 1000));
  return {
    secondsLeft,
    canVerify: secondsLeft > 0 && wrongAttempts < 5,
    canResend: secondsLeft === 0,
  };
}
