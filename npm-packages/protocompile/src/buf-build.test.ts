import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bufBuild } from "./buf-build.js";

describe("bufBuild()", () => {
  it("should provide first file annotation for syntax error", () => {
    const files = {
      "input.proto": `syntax = "proto3";
      
      $
      `,
    };
    assert.throws(() => bufBuild(files), /input.proto:3:3: invalid character/);
  });
  it("should provide stderr for without file annotation", () => {
    const files = {
      "input.proto": ``,
    };
    const flags = {
      garbage: true,
    };
    assert.throws(() => bufBuild(files, flags), /unknown flag: --garbage/);
  });
});
