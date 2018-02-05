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
      { watch: false },
      isotropyHost
    );
    fse
      .existsSync(path.resolve("./dist/test/fixtures/basic/dist/index.js"))
      .should.be.true();
    fse
      .existsSync(path.resolve("./dist/test/fixtures/basic/dist/hello.js"))
      .should.be.true();
    result.errors.length.should.equal(0);
  });

  it("Shows compiler errors", async () => {
    const result = await run(
      "./dist/test/fixtures/errors",
      { type: "typescript" },
      { watch: false },
      isotropyHost
    );
    fse
      .existsSync(path.resolve("./dist/test/fixtures/errors/dist/index.js"))
      .should.be.true();
    fse
      .existsSync(path.resolve("./dist/test/fixtures/errors/dist/hello.js"))
      .should.be.true();
    result.errors.length.should.equal(1);
  });

  it("Watches files for changes", async () => {
    const result = await run(
      "./dist/test/fixtures/watch",
      { type: "typescript" },
      { watch: true },
      isotropyHost
    );

    //Lets change the contents of a file.
    fse.writeFileSync(
      path.resolve("./dist/test/fixtures/errors/src/index.ts"),
      `export default function greet() : string { return "hello, world"; }`
    );

    const contents = fse.readFileSync("./dist/test/fixtures/errors/dist/index.js").toString();
    /hello, world/.test(contents).should.be.true();
  });
});
