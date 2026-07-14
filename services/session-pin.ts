let sessionPin: string | null = null;

export function setSessionPin(pin: string): void {
  sessionPin = pin;
}

export function getSessionPin(): string | null {
  return sessionPin;
}

export function clearSessionPin(): void {
  sessionPin = null;
}

export function hasSessionPin(): boolean {
  return sessionPin !== null;
}