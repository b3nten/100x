import { Application } from "@100x/application";
import { react } from "@100x/react";

export default new Application(({ plugin }) => {
  plugin(react);
});
