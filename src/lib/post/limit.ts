// runLimited runs tasks with at most `limit` in flight at once.
//
// Uploading every photo at the same moment on a phone connection makes each
// one slower and all of them more likely to time out together. Two at a time
// keeps the pipe full without starving any single upload.
//
// Every task settles independently. One failed photo must not stop the others;
// the host retries just that one.
export async function runLimited<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length);
  let next = 0;

  async function worker() {
    while (next < tasks.length) {
      const index = next++;
      try {
        results[index] = { status: 'fulfilled', value: await tasks[index]!() };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
