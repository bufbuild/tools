#!/usr/bin/env node

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

import {extPattern, licenses} from "./constants.mjs";
import {readFileSync, writeFileSync} from "node:fs";
import {modify} from "./modify.mjs";
import {findPackageJsonConfig, getSelfVersion, gitLsFiles, parseCommandLineArgs} from "./util.mjs";


const args = parseCommandLineArgs(process.argv.slice(2));
if (!args.ok) {
    console.error(args.errorMessage);
    process.exit(1);
}
if (args.help) {
    console.log(`USAGE: license-header [path] [--ignore glob-pattern...] [--license-type ${Object.keys(licenses).join("|")}] [--year-range text] [--copyright-holder text]`);
    console.log(`As an alternative to the command line, license properties can be defined in package.json under "licenseHeader".`);
    process.exit(0);
}
if (args.version) {
    console.log(getSelfVersion());
    process.exit(0);
}
const pkgConfig = findPackageJsonConfig();
if (pkgConfig?.ok === false) {
    console.error(pkgConfig.errorMessage);
    process.exit(1);
}
if (pkgConfig !== null) {
    Object.assign(args, pkgConfig);
}


const lsFiles = gitLsFiles({
    path: args.path,
    cwd: process.cwd(),
    include: extPattern,
    ignore: args.ignorePatterns,
});
if (!lsFiles.ok) {
    process.stderr.write(lsFiles.errorMessage);
    process.exit(1);
}

let updated = 0;
for (const filename of lsFiles.files) {
    try {
        const data = readFileSync(filename, "utf-8");
        const result = modify(
            args.licenseType,
            args.copyrightHolder,
            args.yearRange,
            filename,
            data
        );
        if (data !== result) {
            writeFileSync(filename, result, "utf-8");
            updated++;
        }
    } catch (e) {
        process.stderr.write(`${String(e)}\n`);
        process.exit(1);
    }
}
console.log(`updated ${updated} license headers in ${lsFiles.files.length} files.`);


