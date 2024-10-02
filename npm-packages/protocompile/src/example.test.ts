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

import { describe, it } from "node:test";
import { compileMessage } from "./compile.js";
import {
  create,
  type DescMessage,
  type Message,
  type MessageShape,
} from "@bufbuild/protobuf";
import assert from "node:assert/strict";
import { reflect } from "@bufbuild/protobuf/reflect";

describe("example", () => {
  it("should work as documented", () => {
    const schema = compileMessage(`
      syntax = "proto3";
      message Example {
        string foo = 1 [ debug_redact = true ];
      }
    `);
    const message: Message & Record<string, unknown> = create(schema, {
      foo: "abc",
    });
    redact(schema, message);
    expect(message.foo).toBe("");
  });
});

function expect(act: unknown) {
  return {
    toBe(exp: unknown) {
      assert.equal(act, exp);
    },
  };
}

function redact<Desc extends DescMessage>(
  schema: Desc,
  message: MessageShape<Desc>,
): void {
  const r = reflect(schema, message);
  for (const f of r.fields) {
    if (r.isSet(f) && f.proto.options?.debugRedact === true) {
      r.clear(f);
    }
  }
}
