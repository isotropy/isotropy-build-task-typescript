import * as path from "path";
import * as fse from "fs-extra";

export interface TypeScriptBuild {
  type: "typescript";
  bundle: boolean;
  dest: string;
}

export default async function run(source: string, root: string, module: TypeScriptBuild) {
  const dest = path.join(root, module.dest);
  await fse.mkdirp(dest);
  await fse.copy(source, dest)
}