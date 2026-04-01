import type { ReactNode } from "react";
import { PageShell } from "../shared/PageShell";

type BoardPageProps = {
  showExpandedSidebar: boolean;
  children: ReactNode;
};

const BoardPage = (props: BoardPageProps) => <PageShell pageClassName="board-page" {...props} />;

export default BoardPage;
