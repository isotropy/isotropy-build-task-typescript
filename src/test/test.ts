import "mocha";
import "should";
import fse = require("fs-extra");
import * as ts from "typescript";
import run, { IsotropyHost } from "../index";

const isotropyHost: IsotropyHost = {
  newLine: ts.sys.newLine,
  fse
};

describe("isotropy-build-typescript", async () => {
  it("Compiles with TypeScript", async () => {
    const result = await run(
      ["./dist/test/fixtures/basic/src/index.ts"],
      "./dist/test/fixtures/basic",
      [],
      isotropyHost
    );
    result.emitResult.emitSkipped.should.be.false();
  });
});
