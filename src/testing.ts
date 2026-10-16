import { OnboardingService, type Repository } from "./application";
import type { CommandCoordinator } from "./coordination";

/** Test-only lock/bus for non-browser unit tests. Production never falls back to this. */
export class TestCoordinator implements CommandCoordinator {
  private tail: Promise<unknown> = Promise.resolve();
  private listeners = new Set<(revision: number) => void>();
  exclusive<T>(command: () => Promise<T>): Promise<T> {
    const next = this.tail.then(command);
    this.tail = next.catch(() => {});
    return next;
  }
  publish(revision: number) {
    for (const listener of this.listeners) listener(revision);
  }
  subscribe(listener: (revision: number) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
export function testService(
  repository: Repository,
  coordinator = new TestCoordinator(),
) {
  return new OnboardingService(repository, undefined, undefined, coordinator);
}
