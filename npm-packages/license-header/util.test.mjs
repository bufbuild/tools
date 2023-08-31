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

import assert from "node:assert/strict";
import {describe, it} from "node:test";
import {findPackageJsonConfig, gitLsFiles, parseCommandLineArgs} from "./util.mjs";


describe("gitLsFiles", () => {
    it("should use path argument", () => {
        const l = gitLsFiles({
            path: "testdata",
        })
        assert.ok(l.ok);
        assert.deepStrictEqual(l.files, [
            "testdata/config/golden/package.json",
            "testdata/config/incomplete/package.json",
            "testdata/config/invalid-type/package.json",
            "testdata/files/.eslintrc.js",
            "testdata/files/a.js",
            "testdata/files/b.js",
            "testdata/files/c.js"
        ]);
    });
    it("should use cwd argument", () => {
        const l = gitLsFiles({
            cwd: "testdata",
        })
        assert.ok(l.ok);
        assert.deepStrictEqual(l.files, [
            "config/golden/package.json",
            "config/incomplete/package.json",
            "config/invalid-type/package.json",
            "files/.eslintrc.js",
            "files/a.js",
            "files/b.js",
            "files/c.js"
        ]);
    });
    it("should use include argument", () => {
        const l = gitLsFiles({
            include: ["**/golden/**/*", "**/incomplete/**/*"],
        })
        assert.ok(l.ok);
        assert.deepStrictEqual(l.files, [
            "testdata/config/golden/package.json",
            "testdata/config/incomplete/package.json",
        ]);
    });
    it("should use ignore argument", () => {
        const l = gitLsFiles({
            path: "testdata",
            ignore: ["*/files/**/*"],
        })
        assert.ok(l.ok);
        assert.deepStrictEqual(l.files, [
            "testdata/config/golden/package.json",
            "testdata/config/incomplete/package.json",
            "testdata/config/invalid-type/package.json",
        ]);
    });
});

describe("findPackageJsonConfig", () => {
    it("should parse golden", () => {
        const c = findPackageJsonConfig("testdata/config/golden");
        assert.deepStrictEqual(c, {
            ok: true,
            "licenseType": "apache",
            "yearRange": "2023",
            "copyrightHolder": "2023",
        });
    });
    it("should parse incomplete", () => {
        const c = findPackageJsonConfig("testdata/config/incomplete");
        assert.deepStrictEqual(c, {
            ok: true,
            "licenseType": "apache",
            "yearRange": "",
            "copyrightHolder": "2023",
        });
    });
    it("should parse golden", () => {
        const c = findPackageJsonConfig("testdata/config/invalid-type");
        assert.strictEqual(false, c.ok);
        assert.match(c.errorMessage, /^Invalid "licenseHeader" configuration found in .*\/npm-packages\/license-header\/testdata\/config\/invalid-type\/package\.json/);
    });
});

describe("parseCommandLineArgs", () => {
    it("should accept zero args", () => {
        const c = parseCommandLineArgs([]);
        assert.deepStrictEqual(c, {
            ok: true,
            path: ".",
            ignorePatterns: [],
            check: false,
            version: false,
            help: false,
        });
    });
    for (const arg of ["--year-range", "--license-type", "--copyright-holder", "--ignore"]) {
        it(`should error on missing value for ${arg}`, () => {
            const c = parseCommandLineArgs([arg]);
            assert.strictEqual(c.ok, false);
            assert.match(c.errorMessage, new RegExp(`^missing (value) for ${arg}`));
        });
    }
    it("should error on duplicate path", () => {
        const c = parseCommandLineArgs(["a", "b"]);
        assert.deepStrictEqual(c, {
            ok: false,
            errorMessage: "path can only be given once"
        });
    });
    it("should parse the happy path", () => {
        const c = parseCommandLineArgs([
            "--help",
            "--version",
            "--check",
            "--ignore",
            "foo",
            "--ignore",
            "bar",
            "--license-type",
            "fake-license",
            "--copyright-holder",
            "fake owner",
            "--year-range",
            "fake year",
            "fake-path",
        ]);
        assert.deepStrictEqual(c, {
            ok: true,
            path: "fake-path",
            ignorePatterns: ["foo", "bar"],
            licenseType: "fake-license",
            yearRange: "fake year",
            copyrightHolder: "fake owner",
            check: true,
            version: true,
            help: true,
        });
    });
});

