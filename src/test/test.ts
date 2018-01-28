import "mocha";
import "should";
import fse = require("fs-extra");
import * as ts from "typescript";
import * as path from "path";
import run, { IsotropyHost } from "../index";

const isotropyHost: IsotropyHost = {
  newLine: ts.sys.newLine,
  fse
};

describe("isotropy-build-typescript", async () => {
  it("Compiles with TypeScript", async () => {
    const result = await run(
      "./dist/test/fixtures/basic",
      { type: "typescript" },
      [],
      isotropyHost
    );
    fse
      .existsSync(path.resolve("./dist/test/fixtures/basic/dist/index.js"))
      .should.be.true();
    fse
      .existsSync(path.resolve("./dist/test/fixtures/basic/dist/hello.js"))
      .should.be.true();
    result.emitResult.emitSkipped.should.be.false();
  });
});
