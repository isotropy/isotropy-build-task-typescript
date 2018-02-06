import * as path from "path";
import * as ts from "typescript";
import fsExtra = require("fs-extra");
import HostBase from "./HostBase";

async function recursivelyGetTSFiles(dir: string, fse: typeof fsExtra): string[] {
  function readDirRecursive(dir: string): string[] {
    return fse.statSync(dir).isDirectory()
      ? Array.prototype.concat(
          ...fse
            .readdirSync(dir)
            .map((f: string) => readDirRecursive(path.join(dir, f)))
        )
      : [dir];
  }
  const files = readDirRecursive(dir);
  return files.filter(f => /\.ts$/.test(f));
}

export default class IsotropyLanguageHost extends HostBase
  implements ts.LanguageServiceHost {
  constructor(
    options: ts.CompilerOptions,
    projectDir: string,
    moduleSearchLocations: string[],
    devOptions: DevOptions,
    isotropyHost: IsotropyHost
  ) {
    super(options, projectDir, moduleSearchLocations, devOptions, isotropyHost);
  }

}
