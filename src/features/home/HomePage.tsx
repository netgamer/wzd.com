import type { ReactNode } from "react";
import { PageShell } from "../shared/PageShell";

type HomePageProps = {
  showExpandedSidebar: boolean;
  children: ReactNode;
};

const HomePage = (props: HomePageProps) => <PageShell pageClassName="home-page" {...props} />;

export default HomePage;
