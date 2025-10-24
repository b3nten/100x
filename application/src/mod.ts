import {
  type ApplicationConfig,
  type ApplicationPlugin,
  type BuildPlugin,
  applicationPlugin,
  buildPlugin,
  ApplicationConfigurator,
  BuildTargets,
} from "./config";

function Application(
  userConfigFunction?: (app: ApplicationConfigurator) => void,
) {
  return { userConfigFunction };
}

export {
  type ApplicationConfig,
  type ApplicationPlugin,
  type BuildPlugin,
  Application,
  ApplicationConfigurator,
  applicationPlugin,
  buildPlugin,
  BuildTargets,
};
