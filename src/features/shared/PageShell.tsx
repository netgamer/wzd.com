import type { ReactNode } from "react";

type PageShellProps = {
  pageClassName: string;
  showExpandedSidebar: boolean;
  children: ReactNode;
};

export const PageShell = ({ pageClassName, showExpandedSidebar, children }: PageShellProps) => (
  <div className={`pin-page ${pageClassName} ${showExpandedSidebar ? "sidebar-expanded" : ""}`.trim()}>
    {children}
  </div>
);
