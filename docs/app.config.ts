import { Application, BuildTargets } from "@100x/application";
import tailwindcss from "@tailwindcss/vite";

export default Application(({ buildFor, clientEntry, serverEntry, vitePlugin }) => {
  buildFor(BuildTargets.Cloudflare);
  clientEntry("src/clientMain/main");
  serverEntry("src/serverMain/main");
  vitePlugin(tailwindcss())
});
