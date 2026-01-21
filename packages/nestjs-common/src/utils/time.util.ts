export function timeStringToSeconds(timeString: string): number {
  const match = timeString.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(
      `Invalid time format: ${timeString}. Expected format: number + unit (s/m/h/d)`,
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 24 * 60 * 60;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}

export function setExpireAt(hours: number): Date {
  const expirationHours = hours;
  const expiresAt = new Date();
  return new Date(expiresAt.setHours(expiresAt.getHours() + expirationHours));
}
