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

import { spawnSync } from "node:child_process";
import { zipSync } from "fflate";

export type BufBuildFlags = {
  excludeSourceInfo?: boolean;
  excludeSourceRetentionOptions?: boolean;
  asFileDescriptorSet?: boolean;
};

export function bufBuild(
  files: Record<string, string>,
  flags?: BufBuildFlags & TestFlags,
): Uint8Array {
  const zip = zipFiles(files);
  const p = spawnSync(
    "buf",
    [
      "build",
      ...flagsToStrings(flags),
      "--error-format=json",
      "-#format=zip",
      "--output",
      "-",
    ],
    {
      encoding: "buffer",
      input: zip,
      windowsHide: true,
    },
  );
  if (p.error != undefined) {
    throw p.error;
  }
  if (p.status !== 0) {
    const stderr = p.stderr.toString();
    if (p.status === 100) {
      // Since v0.41.0, buf exits with code 100 for file annotations
      const annotations = parseFileAnnotations(stderr);
      if (annotations === null) {
        throw new Error(stderr);
      }
      if (annotations.length == 0) {
        throw new Error("failed to compile");
      }
      const first = annotations[0];
      throw new Error(
        `${first.path}:${first.start_line}:${first.end_line}: ${first.message}`,
      );
    } else {
      throw new Error(stderr);
    }
  }
  return p.stdout;
}

type TestFlags = {
  garbage?: boolean;
};

function flagsToStrings(
  flags: (BufBuildFlags & TestFlags) | undefined,
): string[] {
  const f: string[] = [];
  if (flags !== undefined) {
    if (flags.excludeSourceInfo) {
      f.push("--exclude-source-info");
    }
    if (flags.excludeSourceRetentionOptions) {
      f.push("--exclude-source-retention-options");
    }
    if (flags.asFileDescriptorSet) {
      f.push("--as-file-descriptor-set");
    }
    if (flags.garbage) {
      f.push("--garbage");
    }
  }
  return f;
}

type FileAnnotation = {
  path: string;
  start_line: number;
  start_column: number;
  end_line: number;
  end_column: number;
  type: string;
  message: string;
};

function parseFileAnnotations(stderr: string): null | FileAnnotation[] {
  try {
    return stderr
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as FileAnnotation);
  } catch (_) {
    return null;
  }
}

function zipFiles(files: Record<string, string>): Uint8Array {
  const utf8 = new TextEncoder();
  const binaryFiles: Record<string, Uint8Array> = {};
  for (const [name, content] of Object.entries(files)) {
    binaryFiles[name] = utf8.encode(content);
  }
  return zipSync(binaryFiles);
}
