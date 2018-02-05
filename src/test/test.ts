import "mocha";
import should = require("should");
import fse = require("fs-extra");
import * as ts from "typescript";
import * as path from "path";
import run, { IsotropyHost } from "../index";

const isotropyHost: IsotropyHost = {
  newLine: ts.sys.newLine,
  fse,
  log: console.log
};

describe("isotropy-build-typescript", async () => {
  it("Compiles with TypeScript", async () => {
    const result = await run(
      "./dist/test/fixtures/basic",
      { type: "typescript" },
      { watch: false },
      isotropyHost
    );
    fse
      .existsSync(path.resolve("./dist/test/fixtures/basic/dist/index.js"))
      .should.be.true();
    fse
      .existsSync(path.resolve("./dist/test/fixtures/basic/dist/hello.js"))
      .should.be.true();
    result.emitResult.emitSkipped.should.be.false();
    should.exist(result.preEmitDiagnostics);
  });

  it("Watches files for changes", async () => {
    const result = await run(
      "./dist/test/fixtures/basic",
      { type: "typescript" },
      { watch: true },
      isotropyHost
    );
    fse
      .existsSync(path.resolve("./dist/test/fixtures/basic/dist/index.js"))
      .should.be.true();
    fse
      .existsSync(path.resolve("./dist/test/fixtures/basic/dist/hello.js"))
      .should.be.true();
    result.emitResult.emitSkipped.should.be.false();

    should.exist(result.preEmitDiagnostics);
  });
});
