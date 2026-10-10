export const secureRandomNumber = (min: number, max: number): number => {
  const range = max - min;
  if (range <= 0) return min;
  const randomArray = new Uint32Array(1);
  window.crypto.getRandomValues(randomArray);
  return min + (randomArray[0] % range);
};

export const secureRandomId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().split('-')[0];
  }
  const randomArray = new Uint32Array(2);
  window.crypto.getRandomValues(randomArray);
  return randomArray[0].toString(36) + randomArray[1].toString(36);
};
