import * as path from "path";
import * as ts from "typescript";
import fsExtra = require("fs-extra");
import exception from "./exception";
import { mkdirpSync, readdir } from "fs-extra";

export interface TypeScriptBuildConfig {
  type: "typescript";
  files?: string[];
}

export interface DevOptions {
  watch?: boolean;
}

export interface IsotropyHost {
  newLine?: typeof ts.sys.newLine;
  fse: typeof fsExtra;
}

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


function getWatcher(
  options: ts.CompilerOptions,
  projectDir: string,
  moduleSearchLocations: string[],
  devOptions: DevOptions,
  isotropyHost: IsotropyHost
) {
  return async () => {
    const files: ts.MapLike<{ version: number }> = {};

    const rootFileNames = await recursivelyGetTSFiles(projectDir, isotropyHost.fse);
    
    // initialize the list of files
    rootFileNames.forEach(fileName => {
      files[fileName] = { version: 0 };
    });

    // Create the language service host to allow the LS to communicate with the host
    const servicesHost: ts.LanguageServiceHost = {
      getScriptFileNames: () => rootFileNames,
      getScriptVersion: fileName =>
        files[fileName] && files[fileName].version.toString(),
      getScriptSnapshot: fileName => {
        if (!isotropyHost.fse.existsSync(fileName)) {
          return undefined;
        }

        return ts.ScriptSnapshot.fromString(
          isotropyHost.fse.readFileSync(fileName).toString()
        );
      },
      getCurrentDirectory: () => process.cwd(),
      getCompilationSettings: () => options,
      getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory
    };

    // Create the language service files
    const services = ts.createLanguageService(
      servicesHost,
      ts.createDocumentRegistry()
    );

    // Now let's watch the files
    rootFileNames.forEach(fileName => {
      // First time around, emit all files
      emitFile(fileName);

      // Add a watch on the file to handle next change
      fs.watchFile(
        fileName,
        { persistent: true, interval: 250 },
        (curr, prev) => {
          // Check timestamp
          if (+curr.mtime <= +prev.mtime) {
            return;
          }

          // Update the version to signal a change in the file
          files[fileName].version++;

          // write the changes to disk
          emitFile(fileName);
        }
      );
    });

    function emitFile(fileName: string) {
      let output = services.getEmitOutput(fileName);

      if (!output.emitSkipped) {
        console.log(`Emitting ${fileName}`);
      } else {
        console.log(`Emitting ${fileName} failed`);
        logErrors(fileName);
      }

      output.outputFiles.forEach(o => {
        fs.writeFileSync(o.name, o.text, "utf8");
      });
    }

    function logErrors(fileName: string) {
      let allDiagnostics = services
        .getCompilerOptionsDiagnostics()
        .concat(services.getSyntacticDiagnostics(fileName))
        .concat(services.getSemanticDiagnostics(fileName));

      allDiagnostics.forEach(diagnostic => {
        let message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n"
        );
        if (diagnostic.file) {
          let {
            line,
            character
          } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
          console.log(
            `  Error ${diagnostic.file.fileName} (${line + 1},${character +
              1}): ${message}`
          );
        } else {
          console.log(`  Error: ${message}`);
        }
      });
    }
  };
}


export default async function run(
  projectDir: string,
  buildConfig: TypeScriptBuildConfig,
  devOptions: DevOptions,
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
    new IsotropyCompilerHost(
      compilerOptions,
      projectDir,
      [],
      devOptions,
      hostOpts
    )
  );

  const emitResult = program.emit();
  const preEmitDiagnostics = ts.getPreEmitDiagnostics(program);

  return {
    errors: preEmitDiagnostics,
    watch: getWatcher(compilerOptions, projectDir, [], devOptions, hostOpts)
  };
}
