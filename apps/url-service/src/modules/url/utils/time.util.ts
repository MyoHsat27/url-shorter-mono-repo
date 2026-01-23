export const nowInSeconds = () => Math.floor(Date.now() / 1000);

export const secondsFromNow = (seconds: number) => nowInSeconds() + seconds;
