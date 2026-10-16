import { Component, type ReactNode } from "react";

/** Renderer failure stays within the read-only map, not the application workspace. */
export class VizBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <section className="panel" role="alert">
        <h2>Journey Map is unavailable</h2>
        <p>
          The visual renderer could not display this recording. Saved frames and
          business processing are unaffected. Use Automations & Integrations or
          execution diagnostics; reload to retry the map.
        </p>
      </section>
    ) : (
      this.props.children
    );
  }
}
