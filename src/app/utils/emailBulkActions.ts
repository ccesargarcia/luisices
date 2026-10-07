export async function runEmailBulkAction(ids: string[], action: (id: string) => Promise<void>) {
  const results = await Promise.allSettled(ids.map(id => Promise.resolve().then(() => action(id))));
  return {
    succeeded: ids.filter((_, index) => results[index].status === 'fulfilled'),
    failed: ids.filter((_, index) => results[index].status === 'rejected'),
  };
}
