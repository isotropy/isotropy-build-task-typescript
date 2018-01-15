import "mocha";
import "should";
import * as path from "path";
import * as fs from "fs";
import tsBuild from "../index";

describe("isotropy-build-typescript", async () => {
  it("Compiles with TypeScript", async () => {
    const sourceDir = path.join(__dirname, "/fixtures/source");
    const root = path.join(__dirname, "root");
    await tsBuild(sourceDir, root, { type: "typescript", dest: "/output" });
  });
});
