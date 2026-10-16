import type { CommandCoordinator } from "./coordination";

/** Notifications carry only a revision. IndexedDB remains authoritative. */
export class BrowserCoordinator implements CommandCoordinator {
  readonly unavailableReason?: string;
  private channel?: BroadcastChannel;
  private listeners = new Set<(revision: number) => void>();
  private lockName: string;

  constructor(databaseName = "fieldwork-onboarding") {
    this.lockName = `${databaseName}:commands:v1`;
    if (
      !globalThis.isSecureContext ||
      !globalThis.navigator?.locks ||
      !globalThis.BroadcastChannel
    ) {
      this.unavailableReason =
        "Shared writes are disabled. This demo needs Chrome with Web Locks and BroadcastChannel on localhost or HTTPS. No unsafe writes will be attempted.";
      return;
    }
    try {
      this.channel = new BroadcastChannel(`${databaseName}:changes:v1`);
      this.channel.onmessage = ({ data }: MessageEvent<unknown>) => {
        if (typeof data !== "object" || !data) return;
        const message = data as { type?: unknown; revision?: unknown };
        if (
          message.type === "committed" &&
          Number.isSafeInteger(message.revision) &&
          Number(message.revision) >= 0
        ) {
          this.notify(Number(message.revision));
        }
      };
    } catch {
      this.unavailableReason =
        "Shared writes are disabled because this browser could not open the change notification channel. Use Chrome on localhost or HTTPS.";
    }
  }

  async exclusive<T>(command: () => Promise<T>): Promise<T> {
    if (this.unavailableReason) throw new Error(this.unavailableReason);
    return navigator.locks.request(
      this.lockName,
      { mode: "exclusive" },
      command,
    );
  }

  publish(revision: number) {
    // The application invokes this only after IndexedDB commits and the lock releases.
    // A closed channel must never make a committed command look like a failed command.
    try {
      this.channel?.postMessage({ type: "committed", revision });
    } catch {
      /* Focus/visibility reload also recovers missed notifications. */
    }
    this.notify(revision);
  }

  private notify(revision: number) {
    for (const listener of this.listeners) listener(revision);
  }
  subscribe(listener: (revision: number) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  close() {
    this.channel?.close();
    this.listeners.clear();
  }
}
