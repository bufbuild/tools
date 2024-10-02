import {
  createFileRegistry,
  type DescEnum,
  type DescExtension,
  type DescFile,
  type DescMessage,
  type DescMethod,
  type DescService,
  type FileRegistry,
  fromBinary,
} from "@bufbuild/protobuf";
import { FileDescriptorSetSchema } from "@bufbuild/protobuf/wkt";
import { bufBuild, type BufBuildFlags } from "./buf-build.js";

export type CompileOptions = {
  /**
   * Flags to pass to `buf build`.
   */
  flags?: BufBuildFlags;
  /**
   * Protobuf files that the input imports.
   */
  imports?: Record<string, string>;
};

/**
 * Compile an enumeration.
 */
export function compileEnum(proto: string, options?: CompileOptions): DescEnum {
  const file = compileFile(proto, options);
  if (file.enums.length != 1) {
    throw new Error(
      `input must define exactly 1 enum, got ${file.enums.length}`,
    );
  }
  return file.enums[0];
}

/**
 * Compile a message.
 */
export function compileMessage(
  proto: string,
  options?: CompileOptions,
): DescMessage {
  const file = compileFile(proto, options);
  if (file.messages.length != 1) {
    throw new Error(
      `input must define exactly 1 message, got ${file.messages.length}`,
    );
  }
  return file.messages[0];
}

/**
 * Compile an extension.
 */
export function compileExtension(
  proto: string,
  options?: CompileOptions,
): DescExtension {
  const file = compileFile(proto, options);
  if (file.extensions.length != 1) {
    throw new Error(
      `input must define exactly 1 extension, got ${file.extensions.length}`,
    );
  }
  return file.extensions[0];
}

/**
 * Compile a service.
 */
export function compileService(
  proto: string,
  options?: CompileOptions,
): DescService {
  const file = compileFile(proto, options);
  if (file.services.length != 1) {
    throw new Error(
      `input must define exactly 1 service, got ${file.services.length}`,
    );
  }
  return file.services[0];
}

/**
 * Compile an RPC.
 */
export function compileMethod(
  proto: string,
  options?: CompileOptions,
): DescMethod;

/**
 * Compile an RPC with a specific streaming type.
 */
export function compileMethod<Kind extends DescMethod["methodKind"]>(
  proto: string,
  methodKind: Kind,
  options?: CompileOptions,
): DescMethod & { methodKind: Kind };

export function compileMethod(
  proto: string,
  methodKindOrOptions?: string | CompileOptions,
  options?: CompileOptions,
): DescMethod {
  const opt: CompileOptions | undefined =
    typeof methodKindOrOptions == "string" ? options : methodKindOrOptions;
  const methodKind =
    typeof methodKindOrOptions == "string"
      ? (methodKindOrOptions as DescMethod["methodKind"])
      : undefined;
  const service = compileService(proto, opt);
  if (service.methods.length != 1) {
    throw new Error(
      `input must define exactly 1 rpc, got ${service.methods.length}`,
    );
  }
  const method = service.methods[0];
  if (methodKind !== undefined && method.methodKind !== methodKind) {
    throw new Error(
      `input must define ${methodKind} rpc, got ${method.methodKind}`,
    );
  }
  return method;
}

/**
 * Compile a file.
 */
export function compileFile(proto: string, options?: CompileOptions): DescFile {
  const [inputName, files] = getFiles(proto, options?.imports);
  const registry = compileFiles(files, options?.flags);
  const file = registry.getFile(inputName);
  if (!file) {
    throw new Error(`missing file ${inputName}`);
  }
  return file;
}

/**
 * Compile multiple files to a registry.
 */
export function compileFiles(
  files: Record<string, string>,
  flags?: BufBuildFlags,
): FileRegistry {
  const bytes = bufBuild(files, flags);
  const fileDescriptorSet = fromBinary(FileDescriptorSetSchema, bytes);
  return createFileRegistry(fileDescriptorSet);
}

function getFiles(
  proto: string,
  imports: Record<string, string> | undefined,
): [inputName: string, files: Record<string, string>] {
  const files: Record<string, string> = {
    ...imports,
  };
  let inputName = "input.proto";
  for (let i = 1; Object.prototype.hasOwnProperty.call(files, inputName); i++) {
    inputName = `input${i}.proto`;
  }
  files[inputName] = proto;
  return [inputName, files];
}
