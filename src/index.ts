import * as path from "path";
import * as fse from "fs-extra";
import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";

export interface TypeScriptBuild {
  type: "typescript";
  bundle: boolean;
  dest: string;
}

export interface IsotropyHost {
  newLine: typeof ts.sys.newLine;
  fs: typeof fs;
}

class CompilerHost extends ts.CompilerHost {
  options: ts.CompilerOptions;
  moduleSearchLocations: string[];
  isotropyHost: IsotropyHost;

  constructor(
    options: ts.CompilerOptions,
    moduleSearchLocations: string[],
    isotropyHost: IsotropyHost
  ) {
    super();
    this.isotropyHost = isotropyHost;
  }

  getDefaultLibFileName() {
    return "lib.d.ts";
  }

  writeFile(fileName: string, content: string) {
    return ts.sys.writeFile(fileName, content);
  }

  getCurrentDirectory() {
    return ts.sys.getCurrentDirectory();
  }

  getDirectories(path: string) {
    return ts.sys.getDirectories(path);
  }

  getCanonicalFileName(fileName: string) {
    return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
  }

  getNewLine() {
    return ts.sys.newLine;
  }

  useCaseSensitiveFileNames() {
    return ts.sys.useCaseSensitiveFileNames;
  }

  fileExists(fileName: string): boolean {
    return ts.sys.fileExists(fileName);
  }

  readFile(fileName: string): string | undefined {
    return ts.sys.readFile(fileName);
  }

  getSourceFile(
    fileName: string,
    languageVersion: ts.ScriptTarget,
    onError?: (message: string) => void
  ) {
    const sourceText = ts.sys.readFile(fileName);
    return sourceText !== undefined
      ? ts.createSourceFile(fileName, sourceText, languageVersion)
      : undefined;
  }

  resolveModuleNames(
    moduleNames: string[],
    containingFile: string
  ): ts.ResolvedModule[] {
    const resolvedModules: ts.ResolvedModule[] = [];
    for (const moduleName of moduleNames) {
      // try to use standard resolution
      let result = ts.resolveModuleName(moduleName, containingFile, this.options, {
        fileExists: this.fileExists,
        readFile: this.readFile
      });
      if (result.resolvedModule) {
        resolvedModules.push(result.resolvedModule);
      } else {
        // check fallback locations, for simplicity assume that module at location should be represented by '.d.ts' file
        for (const location of this.moduleSearchLocations) {
          const modulePath = path.join(location, moduleName + ".d.ts");
          if (this.fileExists(modulePath)) {
            resolvedModules.push({ resolvedFileName: modulePath });
          }
        }
      }
    }
    return resolvedModules;
  }
}

function compile(sourceFiles: string[], moduleSearchLocations: string[]): void {
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.AMD,
    target: ts.ScriptTarget.ES5
  };
  const host = new CompilerHost(options, moduleSearchLocations)();
  const program = ts.createProgram(sourceFiles, options, host);

  /// do something with program...
}

export default async function run(
  source: string,
  root: string,
  module: TypeScriptBuild
) {
  const dest = path.join(root, module.dest);
  await fse.mkdirp(dest);
  await fse.copy(source, dest);
}
