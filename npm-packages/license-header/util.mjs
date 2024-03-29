// Copyright 2023 Buf Technologies, Inc.
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

import path from "node:path"
import {existsSync, readFileSync} from "node:fs"
import process from "node:process";
import {spawnSync} from "node:child_process";
import picomatch from "picomatch";

/**
 * @typedef {Object} GentleError
 * @property {false} ok
 * @property {string} errorMessage
 */

/**
 * @typedef {Object} PackageJsonConfig
 * @property {true} ok
 * @property {string} [licenseType]
 * @property {string} [yearRange]
 * @property {string} [copyrightHolder]
 */

/**
 * @typedef {Object} CommandLineArgs
 * @property {string} path
 * @property {string} [licenseType]
 * @property {string} [yearRange]
 * @property {string} [copyrightHolder]
 * @property {Array<string>} ignorePatterns
 * @property {boolean} check
 * @property {boolean} version
 * @property {boolean} help
 */

/**
 *
 * @param {Array<string>} args
 * @returns {CommandLineArgs|GentleError}
 */
export function parseCommandLineArgs(args) {
    const parsed = {
        ok: true,
        ignorePatterns: [],
        check: false,
        version: false,
        help: false,
    }
    while (args.length > 0) {
        const arg = args.shift();
        switch (arg) {
            case "-h":
            case "--help":
                if (parsed.help) {
                    break;
                }
                parsed.help = true;
                break;
            case "--version":
                parsed.version = true;
                break;
            case "--check":
                if (parsed.check) {
                    break;
                }
                parsed.check = true;
                break;
            case "--ignore":
                const val = args.shift();
                if (val === undefined) {
                    return {
                        ok: false,
                        errorMessage: `missing value for --ignore`
                    };
                }
                parsed.ignorePatterns.push(val);
                break;
            case "--license-type":
                parsed.licenseType = args.shift();
                if (parsed.licenseType === undefined) {
                    return {
                        ok: false,
                        errorMessage: `missing value for --license-type`
                    };
                }
                break;
            case "--year-range":
                parsed.yearRange = args.shift();
                if (parsed.yearRange === undefined) {
                    return {
                        ok: false,
                        errorMessage: `missing value for --year-range`
                    };
                }
                break;
            case "--copyright-holder":
                parsed.copyrightHolder = args.shift();
                if (parsed.copyrightHolder === undefined) {
                    return {
                        ok: false,
                        errorMessage: `missing value for --copyright-holder`
                    };
                }
                break;
            default:
                if (parsed.path !== undefined) {
                    return {
                        ok: false,
                        errorMessage: `path can only be given once`
                    };
                }
                parsed.path = arg;
                break;
        }
    }
    return {path: ".", ...parsed};
}


/**
 * @param {string} [cwd]
 * @return {PackageJsonConfig|null|GentleError}
 */
export function findPackageJsonConfig(cwd) {
    const repoRoot = gitRevParseTopLevel(cwd);
    if (typeof repoRoot != "string") {
        return repoRoot;
    }
    let base = path.resolve(cwd ?? process.cwd());
    for (; ;) {
        const pkgPath = path.join(base, "package.json");
        if (existsSync(pkgPath)) {
            const conf = parsePackageJsonConfig(pkgPath);
            if (conf !== null) {
                return conf;
            }
        }
        base = path.resolve(base, "..");
        // stop at top level of git repo
        if (!base.startsWith(repoRoot)) {
            break;
        }
    }
    return null;
}


/**
 * @param {string} pkgPath
 * @return {PackageJsonConfig|GentleError|null}
 */
function parsePackageJsonConfig(pkgPath) {
    const pkgString = readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(pkgString);
    if (typeof pkg !== "object" || pkg === null) {
        return null;
    }
    if (!("licenseHeader" in pkg)) {
        return null;
    }
    const validShape = typeof pkg["licenseHeader"] == "object"
        && pkg["licenseHeader"] !== null
        && (typeof pkg["licenseHeader"]["licenseType"] == "string" || pkg["licenseHeader"]["licenseType"] === undefined)
        && (typeof pkg["licenseHeader"]["yearRange"] == "string" || pkg["licenseHeader"]["yearRange"] === undefined)
        && (typeof pkg["licenseHeader"]["copyrightHolder"] == "string" || pkg["licenseHeader"]["copyrightHolder"] === undefined);
    if (!validShape) {
        return {
            ok: false,
            errorMessage: `Invalid "licenseHeader" configuration found in ${pkgPath}`,
        }
    }
    return {
        ok: true,
        licenseType: pkg["licenseHeader"]["licenseType"] ?? "",
        yearRange: pkg["licenseHeader"]["yearRange"] ?? "",
        copyrightHolder: pkg["licenseHeader"]["copyrightHolder"] ?? "",
    }
}

/**
 * @param {string} [cwd]
 * @return {string|GentleError}
 */
function gitRevParseTopLevel(cwd) {
    const stdOut = runStdOut("git", ["rev-parse", "--show-toplevel"], cwd);
    if (typeof stdOut != "string") {
        return stdOut;
    }
    return stdOut.trim();
}


/**
 * @typedef {Object} GitLsFilesOptions
 * @property {string} [path] - path to list, defaults to .
 * @property {string} [cwd] - current working directory, defaults to process.cwd()
 * @property {string|Array<string>} [include] - glob patterns to include
 * @property {string|Array<string>} [ignore] - glob patterns to ignore
 */

/**
 * @typedef {Object} GitLsFilesResult
 * @property {true} ok
 * @property {Array<string>} files
 */
/**
 * @param {GitLsFilesOptions|undefined} opt
 * @return {GitLsFilesResult|GentleError}
 */
export function gitLsFiles(opt) {
    const allOut = runStdOut("git", [
        "ls-files",
        "--cached",
        "--modified",
        "--others",
        "--exclude-standard",
        "--deduplicate",
        opt?.path ?? ".",
    ], opt.cwd);
    if (typeof allOut != "string") {
        return allOut;
    }
    const deletedOut = runStdOut("git", [
        "ls-files",
        "--deleted",
        opt?.path ?? ".",
    ], opt.cwd);
    if (typeof deletedOut != "string") {
        return deletedOut;
    }
    const allFiles = allOut.trim().split("\n").filter(f => f !== "");
    const deletedFiles = deletedOut.trim().split("\n").filter(f => f !== "");
    const matchInclude = opt?.include ?? "**/*";
    const matchIgnore = opt?.ignore ?? [];
    matchIgnore.push(deletedFiles);
    const match = picomatch(matchInclude, {
        ignore: matchIgnore,
        dot: true,
    });
    return {
        ok: true,
        files: allFiles.filter(f => match(f)),
    };
}


/**
 * @param {string} command
 * @param {Array<string>} args
 * @param {string} [cwd]
 * @return {string|GentleError}
 */
function runStdOut(command, args, cwd) {
    const r = spawnSync(command, args, {
        cwd: path.resolve(cwd ?? process.cwd()),
        encoding: "utf-8",
    });
    const fullCommand = command + (args.length > 0 ? (" " + args.join(" ")) : "");
    if (r.error) {
        return {
            ok: false,
            errorMessage: `Failed to run ${fullCommand}: ${r.error}`,
        };
    }
    if (r.status !== 0) {
        return {
            ok: false,
            errorMessage: `${fullCommand} exited with code ${r.status}: \n${r.stderr}`,
        };
    }
    return r.stdout;
}

export function getSelfVersion() {
    const packageContent = readFileSync(
        new URL("./package.json", import.meta.url).pathname,
        "utf-8"
    );
    const pkg = JSON.parse(packageContent);
    const v = pkg.version;
    if (typeof v == "string") {
        return v;
    }
    return "?"
}
