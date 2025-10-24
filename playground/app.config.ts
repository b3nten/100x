import { Application, BuildTargets } from "@100x/application";

export default Application(({ buildFor, clientEntry, serverEntry }) => {
  buildFor(BuildTargets.Vercel);
  clientEntry("src/clientMain/main");
  serverEntry("src/serverMain/main");
});
