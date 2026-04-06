import type { ReactNode } from "react";
import { PageShell } from "../shared/PageShell";

type SharePageProps = {
  showExpandedSidebar: boolean;
  extraClassName?: string;
  children: ReactNode;
};

const SharePage = (props: SharePageProps) => <PageShell pageClassName="share-page" {...props} />;

export default SharePage;
