import type { PropsWithChildren, ReactNode } from "react";

interface DataSectionProps extends PropsWithChildren {
  toolbar?: ReactNode;
}

export function DataSection({ toolbar, children }: DataSectionProps) {
  return (
    <section className="timeops-data-section">
      {toolbar ? <div className="timeops-data-toolbar">{toolbar}</div> : null}
      <div className="timeops-data-surface">{children}</div>
    </section>
  );
}
