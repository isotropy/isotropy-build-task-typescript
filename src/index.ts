import * as path from "path";
import * as ts from "typescript";
import * as util from "util";
import fsExtra = require("fs-extra");
import exception from "./exception";
import { mkdirpSync, readdir } from "fs-extra";

export interface TypeScriptBuildConfig {
  type: "typescript";
  files?: string[];
}

export interface IsotropyHost {
  newLine?: typeof ts.sys.newLine;
  fse: typeof fsExtra;
  log: (msg: string) => void;
}

export class HostBase {
  options: ts.CompilerOptions;
  projectDir: string;
  moduleSearchLocations: string[];
  isotropyHost: IsotropyHost;

  constructor(
    options: ts.CompilerOptions,
    projectDir: string,
    moduleSearchLocations: string[],
    isotropyHost: IsotropyHost
  ) {
    this.options = options;
    this.projectDir = projectDir;
    this.moduleSearchLocations = moduleSearchLocations;
    this.isotropyHost = isotropyHost;
  }
}

function recursivelyGetTSFiles(dir: string, fse: typeof fsExtra): string[] {
  function readDirR(dir: string) : string[] {
    return fse.statSync(dir).isDirectory()
      ? Array.prototype.concat(
          ...fse
            .readdirSync(dir)
            .map((f: string) => readDirR(path.join(dir, f)))
        )
      : [dir];
  }
  const files = readDirR(dir);
  return files.filter(f => /\.ts$/.test(f));
}

export class IsotropyLanguageHost extends HostBase
  implements ts.LanguageServiceHost {
  constructor(
    options: ts.CompilerOptions,
    projectDir: string,
    moduleSearchLocations: string[],
    isotropyHost: IsotropyHost
  ) {
    super(options, projectDir, moduleSearchLocations, isotropyHost);
  }
}

export class IsotropyCompilerHost extends HostBase implements ts.CompilerHost {
  constructor(
    options: ts.CompilerOptions,
    projectDir: string,
    moduleSearchLocations: string[],
    isotropyHost: IsotropyHost
  ) {
    super(options, projectDir, moduleSearchLocations, isotropyHost);
  }

  getDefaultLibFileName() {
    return "lib.d.ts";
  }

  writeFile(fileName: string, content: string) {
    const dir = path.dirname(fileName);
    this.isotropyHost.fse.mkdirpSync(dir);
    this.isotropyHost.fse.writeFileSync(fileName, content);
  }

  getCurrentDirectory() {
    //return this.projectDir;
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
    return this.isotropyHost.fse.existsSync(fileName);
  }

  readFile(fileName: string): string | undefined {
    return this.isotropyHost.fse.readFileSync(fileName).toString();
  }

  getSourceFile(
    fileName: string,
    languageVersion: ts.ScriptTarget,
    onError?: (message: string) => void
  ) {
    if (this.isotropyHost.fse.existsSync(fileName)) {
      const sourceText = this.isotropyHost.fse
        .readFileSync(fileName)
        .toString();
      return sourceText !== undefined
        ? ts.createSourceFile(fileName, sourceText, languageVersion)
        : undefined;
    }
  }

  getSourceFileByPath(
    fileName: string,
    _path: string,
    languageVersion: ts.ScriptTarget,
    onError?: (message: string) => void
  ) {
    const filePath = path.join(this.projectDir, fileName);
    const sourceText = this.isotropyHost.fse.readFileSync(filePath).toString();
    return sourceText !== undefined
      ? ts.createSourceFile(filePath, sourceText, languageVersion)
      : undefined;
  }
}

async function getCompilerOptions(
  projectDir: string,
  isotropyHost: IsotropyHost
) {
  const configPath = path.join(projectDir, "tsconfig.json");
  const configText = (await isotropyHost.fse.readFileSync(
    configPath
  )).toString();
  const { config, error } = ts.parseConfigFileTextToJson(
    "tsconfig.json",
    configText
  );
  const settings = ts.convertCompilerOptionsFromJson(
    config.compilerOptions,
    projectDir
  );
  return { ...settings.options, configFilePath: configPath };
}

export default async function run(
  projectDir: string,
  buildConfig: TypeScriptBuildConfig,
  isotropyHost: IsotropyHost
) {
  const files = buildConfig.files
    ? buildConfig.files.map(f => path.join(projectDir, f))
    : (() => {
        const commonEntryPoints = [
          "index.ts",
          "index.tsx",
          "app.ts",
          "app.tsx",
          "main.ts",
          "main.tsx"
        ];
        const match =
          commonEntryPoints.find(x =>
            fsExtra.existsSync(path.join(projectDir, "src", x))
          ) ||
          exception(
            `Need an entry file for typescript build. Specify an entry in isotropy.yaml.`
          );
        return [path.join(projectDir, "src", match)];
      })();

  const hostOpts = {
    newLine: isotropyHost.newLine || ts.sys.newLine,
    fse: isotropyHost.fse
  };

  const compilerOptions = await getCompilerOptions(projectDir, hostOpts);

  const program = ts.createProgram(
    files,
    compilerOptions,
    new IsotropyCompilerHost(compilerOptions, projectDir, [], hostOpts)
  );

  let emitResult = program.emit();

  return {
    emitResult,
    preEmitDiagnostics: ts.getPreEmitDiagnostics(program)
  };
}
