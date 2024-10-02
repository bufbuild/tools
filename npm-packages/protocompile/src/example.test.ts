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
