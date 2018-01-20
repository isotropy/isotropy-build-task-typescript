import "mocha";
import "should";
import * as fs from "fs";
import * as ts from "typescript";
import run, { IsotropyHost } from "../index";

const isotropyHost: IsotropyHost = {
  newLine: ts.sys.newLine,
  fs
};

describe("isotropy-build-typescript", async () => {
  it("Compiles with TypeScript", async () => {
    const result = await run("./dist/test/fixtures/basic", ["./dist/test/fixtures/basic/src/index.ts"], isotropyHost);
    result.emitResult.emitSkipped.should.be.false();
  });
});
