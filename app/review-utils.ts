export function pickReviews<T>(reviews: readonly T[], count = 3, random = Math.random): T[] {
  const shuffled = [...reviews];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled.slice(0, Math.max(0, Math.trunc(count)));
}
