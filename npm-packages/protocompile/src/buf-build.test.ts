// Copyright 2023-2024 Buf Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
