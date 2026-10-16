import { useId, useState, type ReactNode } from "react";

export function DiagnosticPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  return (
    <section className="diagnostic-panel">
      <h3>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="diagnostic-chevron" aria-hidden="true">
            &gt;
          </span>
          {title}
        </button>
      </h3>
      <div id={id} className="diagnostic-content" hidden={!expanded}>
        {children}
      </div>
    </section>
  );
}
