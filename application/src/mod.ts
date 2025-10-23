import { type PluginOption, type UserConfig as ViteConfig } from "vite";
import defu from "defu";
import { VirtualFileSystem } from "./vfs.ts";
import type { NitroPluginConfig } from "nitro/vite";
export { cloneResponse } from "./utils.ts";

export const BuildTarget = {
  Node: undefined, // default, no value
  NodeHandler: "node",
  Deno: "deno",
  Bun: "bun",
  Cloudflare: "cloudflare-module",
  Netlify: "netlify",
  DenoDeploy: "deno_deploy",
  Azure: "azure",
  AWSLambda: "aws_lambda",
  Vercel: "vercel",
};

type BuildTarget = (typeof BuildTarget)[keyof typeof BuildTarget];

interface VonoConfig {
  vite: ViteConfig;
  nitro: NonNullable<NitroPluginConfig["config"]>;
  plugins: Array<VonoPlugin>;
  apiRouteDirectory?: string;
  port?: number;
  files: {
    client: {
      main?: string;
      devMain?: string;
      prodMain?: string;
    };
    server: {
      main?: string;
      devMain?: string;
      prodMain?: string;
      renderer?: string;
      devRenderer?: string;
      prodRenderer?: string;
    };
  };
  runtimes: {
    client: {
      dev?: string;
      prod?: string;
    };
    server: {
      dev?: string;
      prod?: string;
      rendererDev?: string;
      rendererProd?: string;
    };
  };
}

/**
 * Vono plugins are functions that are called with the Vono object as an argument.
 * They can be used to add functionality to the build process.
 * @param vono - The Vono object.
 */
export type VonoPlugin = (vono: Vono) => void | Promise<void>;

/**
 * Key for internal properties of the Vono object.
 * @internal
 */
export const vonoInternal = Symbol.for("vonoInternal");

export class Vono {
  constructor(userConfigFunction?: (vono: Vono) => Promise<void> | void) {
    this[vonoInternal].userConfigFunction = userConfigFunction;
  }

  readonly config: VonoConfig = {
    plugins: [],
    nitro: {},
    vite: {
      plugins: [],
    },
    files: {
      client: {},
      server: {},
    },
    runtimes: {
      client: {},
      server: {},
    },
  };

  readonly BuildTarget = BuildTarget;

  /**
   * Add a vono plugin to the config.
   * @param plugin
   */
  plugin = (plugin: (vono: Vono) => void) => {
    this.config.plugins?.push(plugin);
  };

  /**
   * Set the build target for the server.
   * @param target - {@link BuildTarget}
   * @param options
   */
  readonly buildFor = (target: BuildTarget, options?: any) => {
    this.config.nitro.preset = target;
    this.config.nitro = defu(this.config.nitro!, options ?? {});
  };

  /**
   * Add a vite plugin or plugins to the config.
   * @param plugins
   */
  readonly vitePlugins = (...plugins: PluginOption[]) => {
    this.config.vite.plugins!.push(plugins);
  };

  /**
   * Update vite config.
   * @param config - Vite config object.
   */
  readonly viteConfig = (config: ViteConfig) => {
    this.config.vite = defu(this.config.vite, config);
  };

  /**
   * Update nitro config.
   * @param config - Nitro config object.
   */
  readonly nitroConfig = (config: NitroPluginConfig["config"]) => {
    this.config.nitro = defu(this.config.nitro, config);
  };

  /**
   * Set the main server entry point.
   * @param path
   */
  readonly serverMain = (path: string) => {
    this.config.files.server.main = path;
  };

  /**
   * Set the server entry point for development.
   * @param path
   */
  readonly serverDevMain = (path: string) => {
    this.config.files.server.devMain = path;
  };

  /**
   * Set the server entry point for production.
   * @param path
   */
  readonly serverProdMain = (path: string) => {
    this.config.files.server.prodMain = path;
  };

  /**
   * Set the main client entry point.
   * @param path
   */
  readonly clientMain = (path: string) => {
    this.config.files.client.main = path;
  };

  /**
   * Set the client entry point for development.
   * @param path
   */
  readonly clientDevMain = (path: string) => {
    this.config.files.client.devMain = path;
  };

  /**
   * Set the client entry point for production.
   * @param path
   */
  readonly clientProdMain = (path: string) => {
    this.config.files.client.prodMain = path;
  };

  /**
   * Set the server renderer entry point.
   * @param path
   */
  readonly serverRenderer = (path: string) => {
    this.config.files.server.renderer = path;
  };

  /**
   * Set the server renderer entry point for development.
   * @param path
   */
  readonly serverDevRenderer = (path: string) => {
    this.config.files.server.devRenderer = path;
  };

  /**
   * Set the server renderer entry point for production.
   * @param path
   */
  readonly serverProdRenderer = (path: string) => {
    this.config.files.server.prodRenderer = path;
  };

  /**
   * Set a virtual file.
   * @param id
   * @param code
   */
  readonly virtualFile = (
    id: string,
    code: string | (() => string | Promise<string>),
  ) => {
    this.vfs.set(id, code);
  };

  /**
   * Update the runtimes config.
   * @param fn
   */
  readonly runtimes = (fn: (runtimes: VonoConfig["runtimes"]) => void) => {
    fn(this.config.runtimes);
  };

  /**
   * Set the directory for file-based API routes.
   * @param path
   */
  readonly apiRouteDirectory = (path: string) => {
    this.config.apiRouteDirectory = path;
  };

  /**
   * Set the port for the dev server.
   * @param port
   */
  readonly port = (port: number) => {
    this.config.port = port;
  };

  /**
   * Add a callback to be called after the configuration is done.
   * @param afterConfigCallback
   */
  readonly afterConfiguration = (afterConfigCallback: VonoPlugin) => {
    this[vonoInternal].afterConfigCallbacks.add(afterConfigCallback);
  };

  /**
   * Virtual file system.
   */
  readonly vfs = new VirtualFileSystem();
  [vonoInternal]: {
    userConfigFunction?: (vono: Vono) => Promise<void> | void;
    afterConfigCallbacks: Set<VonoPlugin>;
  } = {
    userConfigFunction: undefined,
    afterConfigCallbacks: new Set(),
  };
}
