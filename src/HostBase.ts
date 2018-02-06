import * as ts from "typescript";
import * as path from "path";
import { IsotropyHost, DevOptions } from "./";

export default class HostBase {
  options: ts.CompilerOptions;
  projectDir: string;
  moduleSearchLocations: string[];
  isotropyHost: IsotropyHost;
  devOptions: DevOptions;

  constructor(
    options: ts.CompilerOptions,
    projectDir: string,
    moduleSearchLocations: string[],
    devOptions: DevOptions,
    isotropyHost: IsotropyHost
  ) {
    this.options = options;
    this.projectDir = projectDir;
    this.moduleSearchLocations = moduleSearchLocations;
    this.devOptions = devOptions;
    this.isotropyHost = isotropyHost;
  }
}