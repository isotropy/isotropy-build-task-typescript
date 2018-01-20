import * as path from "path";
import * as ts from "typescript";
import * as util from "util";
import * as fs from "fs";

const readFile = util.promisify(fs.readFile);

export interface TypeScriptBuild {
  type: "typescript";
  bundle: boolean;
  dest: string;
}

export interface IsotropyHost {
  newLine: typeof ts.sys.newLine;
  fs: typeof fs;
}

export class CompilerHost implements ts.CompilerHost {
  options: ts.CompilerOptions;
  moduleSearchLocations: string[];
  isotropyHost: IsotropyHost;

  constructor(
    options: ts.CompilerOptions,
    moduleSearchLocations: string[],
    isotropyHost: IsotropyHost
  ) {
    this.isotropyHost = isotropyHost;
  }

  getDefaultLibFileName() {
    return "lib.d.ts";
  }

  writeFile(fileName: string, content: string) {
    this.isotropyHost.fs.writeFileSync(fileName, content);
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
    return this.isotropyHost.fs.existsSync(fileName);
  }

  readFile(fileName: string): string | undefined {
    return this.isotropyHost.fs.readFileSync(fileName).toString();
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
      let result = ts.resolveModuleName(
        moduleName,
        containingFile,
        this.options,
        {
          fileExists: this.fileExists,
          readFile: this.readFile
        }
      );
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

async function getCompilerOptions(projectDir: string) {
  const configPath = path.join(projectDir, "tsconfig.json");
  const configText = (await readFile(configPath)).toString();
  const { config, error } = ts.parseConfigFileTextToJson(
    "tsconfig.json",
    configText
  );
  const settings = ts.convertCompilerOptionsFromJson(
    config.compilerOptions,
    projectDir
  );
  return settings.options;
}

export default async function run(
  projectDir: string,
  files: string[],
  isotropyHost: IsotropyHost
) {
  const compilerOptions = await getCompilerOptions(projectDir);
  const filenames: string[] = files;
  const program = ts.createProgram(filenames, compilerOptions);
  let emitResult = program.emit();

  return {
    type: "typescript",
    emitResult,
    preEmitDiagnostics: ts.getPreEmitDiagnostics(program)
  };
}
