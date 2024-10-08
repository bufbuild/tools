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
import { Edition, FileDescriptorProtoSchema } from "@bufbuild/protobuf/wkt";
import {
  compileEnum,
  compileExtension,
  compileFile,
  compileFiles,
  compileMessage,
  compileMethod,
  type CompileOptions,
  compileService,
} from "./compile.js";
import type { BufBuildFlags } from "./buf-build.js";

describe("compileFiles()", () => {
  it("should compile each file", () => {
    const reg = compileFiles({
      "a.proto": `syntax="proto3"; message A {}`,
      "b.proto": `syntax="proto3"; message B {}`,
      "c.proto": `syntax="proto3"; message C {}`,
    });
    assert.ok(reg.getFile("a.proto") !== undefined);
    assert.ok(reg.getFile("b.proto") !== undefined);
    assert.ok(reg.getFile("c.proto") !== undefined);
  });
});

describe("compileFile()", () => {
  it("should compile file", () => {
    const file = compileFile(`syntax="proto3";`);
    assert.equal(file.edition, Edition.EDITION_PROTO3);
  });
  it("should compile file with imports", () => {
    const imports = {
      "input.proto": `syntax="proto3";`,
    };
    const file = compileFile(`syntax="proto3"; import "input.proto";`, {
      imports,
    });
    assert.equal(file.kind, "file");
    assert.equal(file.proto.name, "input1.proto");
    assert.equal(file.dependencies.length, 1);
    assert.equal(file.dependencies[0].proto.name, "input.proto");
  });
  it("should compile with source code info", () => {
    const file = compileFile(`syntax="proto3"; package test;`);
    const packageLocation = file.proto.sourceCodeInfo?.location.filter(
      (l) =>
        l.path.length == 1 &&
        l.path[0] === FileDescriptorProtoSchema.field.package.number,
    );
    assert.ok(packageLocation !== undefined);
  });
  it("should honor excludeSourceInfo", () => {
    const flags: BufBuildFlags = {
      excludeSourceInfo: true,
    };
    const file = compileFile(`syntax="proto3"; package test;`, { flags });
    const packageLocation = file.proto.sourceCodeInfo?.location.filter(
      (l) =>
        l.path.length == 1 &&
        l.path[0] === FileDescriptorProtoSchema.field.package.number,
    );
    assert.ok(packageLocation === undefined);
  });
});

describe("compileEnum()", () => {
  it("should compile enum", () => {
    const descEnum = compileEnum(`
      syntax="proto3"; 
      enum E {
        E_UNSPECIFIED = 0;
      }
    `);
    assert.equal(descEnum.kind, "enum");
    assert.equal(descEnum.name, "E");
  });
  it("should accept options", () => {
    const proto = `
      syntax="proto3"; 
      enum E {
        E_UNSPECIFIED = 0;
      }
    `;
    const opt: CompileOptions = {
      imports: {
        "foo.proto": `syntax="proto3";`,
      },
    };
    compileEnum(proto, opt);
  });
  it("should error on missing definition", () => {
    assert.throws(
      () => compileEnum(`syntax="proto3";`),
      /input must define exactly 1 enum, got 0/,
    );
  });
  it("should error for too many definitions", () => {
    assert.throws(
      () =>
        compileEnum(`
      syntax="proto3";
      enum A { A_UNSPECIFIED = 0; }
      enum B { B_UNSPECIFIED = 0; }
    `),
      /input must define exactly 1 enum, got 2/,
    );
  });
});

describe("compileMessage()", () => {
  const proto = `
    syntax="proto3"; 
    message M {}
  `;
  it("should compile message", () => {
    const message = compileMessage(proto);
    assert.equal(message.kind, "message");
    assert.equal(message.name, "M");
  });
  it("should accept options", () => {
    const opt: CompileOptions = {
      imports: {
        "foo.proto": `syntax="proto3";`,
      },
    };
    compileMessage(proto, opt);
  });
  it("should error on missing definition", () => {
    assert.throws(
      () => compileMessage(`syntax="proto3";`),
      /input must define exactly 1 message, got 0/,
    );
  });
  it("should error for too many definitions", () => {
    assert.throws(
      () =>
        compileMessage(`
      syntax="proto3";
      message A {}
      message B {}
    `),
      /input must define exactly 1 message, got 2/,
    );
  });
});

describe("compileExtension()", () => {
  const proto = `
    syntax="proto3"; 
    import "google/protobuf/descriptor.proto";
    extend google.protobuf.FileOptions {
      string foo = 1000;
    } 
  `;
  it("should compile extension", () => {
    const ext = compileExtension(proto);
    assert.equal(ext.kind, "extension");
    assert.equal(ext.name, "foo");
  });
  it("should accept options", () => {
    const opt: CompileOptions = {
      imports: {
        "foo.proto": `syntax="proto3";`,
      },
    };
    compileExtension(proto, opt);
  });
  it("should error on missing definition", () => {
    assert.throws(
      () =>
        compileExtension(`
      syntax="proto3";
    `),
      /input must define exactly 1 extension, got 0/,
    );
  });
  it("should error for too many definitions", () => {
    assert.throws(
      () =>
        compileExtension(`
      syntax="proto3";
      import "google/protobuf/descriptor.proto";
      extend google.protobuf.FileOptions {
        string a = 1000;
        string b = 1001;
      } 
    `),
      /input must define exactly 1 extension, got 2/,
    );
  });
});

describe("compileService()", () => {
  const proto = `
    syntax="proto3"; 
    service FooService {}
  `;
  it("should compile service", () => {
    const service = compileService(proto);
    assert.equal(service.kind, "service");
    assert.equal(service.name, "FooService");
  });
  it("should accept options", () => {
    const opt: CompileOptions = {
      imports: {
        "foo.proto": `syntax="proto3";`,
      },
    };
    compileService(proto, opt);
  });
  it("should error on missing definition", () => {
    assert.throws(
      () => compileService(`syntax="proto3";`),
      /input must define exactly 1 service, got 0/,
    );
  });
  it("should error for too many definitions", () => {
    assert.throws(
      () =>
        compileService(`
      syntax="proto3";
      service A {}
      service B {}
    `),
      /input must define exactly 1 service, got 2/,
    );
  });
});

describe("compileMethod()", () => {
  const proto = `
    syntax="proto3"; 
    service FooService {
      rpc Foo(I) returns (O);
    }
    message I {}
    message O {}
  `;
  it("should compile method", () => {
    const method = compileMethod(proto);
    assert.equal(method.kind, "rpc");
    assert.equal(method.name, "Foo");
  });
  it("should accept options", () => {
    const opt: CompileOptions = {
      imports: {
        "foo.proto": `syntax="proto3";`,
      },
    };
    compileMethod(proto, opt);
  });
  it("should accept kind", () => {
    const methodKind: "unary" = compileMethod(proto, "unary").methodKind;
    assert.equal(methodKind, "unary");
  });
  it("should accept kind and options", () => {
    const opt: CompileOptions = {
      imports: {
        "foo.proto": `syntax="proto3";`,
      },
    };
    const methodKind: "unary" = compileMethod(proto, "unary", opt).methodKind;
    assert.equal(methodKind, "unary");
  });
  it("should error on missing parent definition", () => {
    assert.throws(
      () => compileMethod(`syntax="proto3";`),
      /input must define exactly 1 service, got 0/,
    );
  });
  it("should error on missing definition", () => {
    assert.throws(
      () =>
        compileMethod(`
      syntax="proto3";
      service A {}
    `),
      /input must define exactly 1 rpc, got 0/,
    );
  });
  it("should error for too many definitions", () => {
    assert.throws(
      () =>
        compileMethod(`
      syntax="proto3";
      service S {
        rpc A(M) returns (M);
        rpc B(M) returns (M);
      }
      message M {}
    `),
      /input must define exactly 1 rpc, got 2/,
    );
  });
  it("should error for unexpected kind", () => {
    assert.throws(
      () => compileMethod(proto, "server_streaming"),
      /input must define server_streaming rpc, got unary/,
    );
  });
});
