Tools
=======

A collection of tools written at Buf.

- [license-header](cmd/license-header): A tool to add and update license headers in source code. Also available [for npm](npm-packages/license-header).
- [protoc-gen-by-dir](cmd/protoc-gen-by-dir): A helper `protoc` plugin to assist in the authoring of custom remote plugins for the Buf Schema Registry to invoke a plugin remotely on a per-directory basis within a single container.
- [protoc-gen-inspect-code-generator-request](cmd/protoc-gen-inspect-code-generator-request): A helper `protoc` plugin to produce a file `code_generator_request.json` that is the JSON-encoded input `CodeGeneratorRequest`. useful for debugging `protoc` and `buf`.
- [protoc-gen-multi](cmd/protoc-gen-multi): A helper `protoc` plugin to combine multiple protoc plugin invocations into a single plugin.

## Status: Alpha

This repository should be considered unstable.

## Legal

Offered under the [Apache 2 license][license].

[license]: https://github.com/bufbuild/tools/blob/main/LICENSE
