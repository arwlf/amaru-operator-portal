import { Redirect } from "@docusaurus/router";
import useBaseUrl from "@docusaurus/useBaseUrl";

export default function Home() {
  return <Redirect to={useBaseUrl("/docs/operators/amaru-node/amaru-user-guide")} />;
}
