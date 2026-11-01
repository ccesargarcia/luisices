type UserCreationDates = {
  createdAt?: string | null;
  authCreatedAt?: string | null;
};

/**
 * Keeps the user list in the same chronological order as the creation date
 * displayed by the Users screen (Auth creation date, falling back to profile).
 */
export function sortUsersByDisplayedCreatedAt<T extends UserCreationDates>(users: readonly T[]): T[] {
  return [...users].sort((left, right) => {
    const leftDate = Date.parse(left.authCreatedAt || left.createdAt || '');
    const rightDate = Date.parse(right.authCreatedAt || right.createdAt || '');
    const leftTime = Number.isFinite(leftDate) ? leftDate : Number.POSITIVE_INFINITY;
    const rightTime = Number.isFinite(rightDate) ? rightDate : Number.POSITIVE_INFINITY;

    if (leftTime === rightTime) return 0;
    return leftTime < rightTime ? -1 : 1;
  });
}
