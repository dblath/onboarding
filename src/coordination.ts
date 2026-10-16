/** Application boundary for serial command execution and post-commit invalidation. */
export interface CommandCoordinator {
  readonly unavailableReason?: string;
  exclusive<T>(command: () => Promise<T>): Promise<T>;
  publish(revision: number): void;
  subscribe(listener: (revision: number) => void): () => void;
}

/** No unsafe default: runtime composition must supply a coordinator. */
export class UnavailableCoordinator implements CommandCoordinator {
  readonly unavailableReason =
    "Safe shared writes require Chrome Web Locks and BroadcastChannel on localhost or HTTPS. Open this workspace in a supported browser; no changes have been saved.";
  async exclusive<T>(_command: () => Promise<T>): Promise<T> {
    throw new Error(this.unavailableReason);
  }
  publish(_revision: number) {}
  subscribe(_listener: (revision: number) => void) {
    return () => {};
  }
}
