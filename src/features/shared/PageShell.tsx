import type { ReactNode } from "react";

type PageShellProps = {
  pageClassName: string;
  showExpandedSidebar: boolean;
  extraClassName?: string;
  children: ReactNode;
};

export const PageShell = ({ pageClassName, showExpandedSidebar, extraClassName, children }: PageShellProps) => (
  <div className={`pin-page ${pageClassName} ${showExpandedSidebar ? "sidebar-expanded" : ""} ${extraClassName ?? ""}`.trim()}>
    {children}
  </div>
);
