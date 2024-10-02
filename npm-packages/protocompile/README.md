# @bufbuild/protocompile

This tool compiles descriptors from Protobuf on the fly.

Do you need a message schema in your test? With the `compileMessage` function, you can compile inline Protobuf source to a message descriptor:

```ts
import { compileMessage } from "@bufbuild/protocompile";
import { redact } from "./redact.js";

describe("redact", () => {
  it("should redact string field", () => {
    const schema = compileMessage(`
      syntax = "proto3";
      message Example {
        string foo = 1 [ debug_redact = true ];
      }
    `);
    const message: Message & Record<string, unknown> = create(schema, {
      foo: "abc",
    });
    redact(message);
    expect(message.foo).toBe("");
  });
});
```

The package also exports functions to compile Protobuf descriptors for all other types, such as enumerations and services.

Under the hood, the functions shell out to the `buf build` command. You have to install [@bufbuild/buf](https://www.npmjs.com/package/@bufbuild/buf) to use them.

Note that the functions return anonymous descriptors. They are functionally identical to generated descriptors, but do not have generated type information attached.
