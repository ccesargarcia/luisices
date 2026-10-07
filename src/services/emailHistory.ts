import {
  collection, query, orderBy, limit, startAfter, endAt, getDocs, onSnapshot,
  type Firestore, type QueryDocumentSnapshot, type DocumentData,
} from 'firebase/firestore';

/** Cursor pages with non-overlapping live ranges; inserts/deletes cannot shift a page gap. */
export function createEmailHistory(
  db: Firestore,
  name: 'receivedEmails' | 'sentEmails',
  onChange: (docs: QueryDocumentSnapshot<DocumentData>[], hasMore: boolean) => void,
  onError: (error: unknown) => void,
  pageSize = 50,
) {
  const field = name === 'receivedEmails' ? 'receivedAt' : 'sentAt';
  const base = query(collection(db, name), orderBy(field, 'desc'));
  const pages: QueryDocumentSnapshot<DocumentData>[][] = [];
  const unsubscribers: (() => void)[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | undefined;
  let hasMore = true;
  let closed = false;
  let pending: Promise<void> | undefined;
  const publish = () => { if (!closed) onChange(pages.flat(), hasMore); };

  const loadMore = (): Promise<void> => {
    if (closed || !hasMore) return Promise.resolve();
    if (pending) return pending;
    pending = (async () => {
      const previous = cursor;
      const constraints = previous ? [startAfter(previous)] : [];
      const snapshot = await getDocs(query(base, ...constraints, limit(pageSize)));
      if (closed) return;
      const index = pages.length;
      pages.push(snapshot.docs);
      cursor = snapshot.docs.at(-1) || previous;
      hasMore = snapshot.size === pageSize;
      // The last range is open-ended so future older messages are included as well.
      const range = query(base, ...constraints, ...(hasMore && cursor ? [endAt(cursor)] : []));
      publish();
      unsubscribers.push(onSnapshot(range, next => {
        pages[index] = next.docs;
        publish();
      }, error => { if (!closed) onError(error); }));
    })().finally(() => { pending = undefined; });
    return pending;
  };

  return {
    loadMore,
    async loadAll() { while (!closed && hasMore) await loadMore(); },
    close() { closed = true; unsubscribers.forEach(unsubscribe => unsubscribe()); },
  };
}
