import { Application } from "@100x/application";

export default new Application(({ buildFor, BuildTarget, plugin }) => {
  buildFor(BuildTarget.Cloudflare);
});
