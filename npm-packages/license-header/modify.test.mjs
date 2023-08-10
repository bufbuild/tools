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
import {modify} from "./modify.mjs";

const testCopyrightHolder = "Foo Bar, Inc.";
const testYearRange = "2020-2021";
const testApacheHeader = `// Copyright 2020-2021 Foo Bar, Inc.
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
// limitations under the License.`
const testProprietaryHeader = `// Copyright 2020-2021 Foo Bar, Inc.
//
// All rights reserved.`;


describe("modify", () => {
    it("should error on unrecognized license type", () => {
        assert.throws(() => modify(
            "foo",
            "fake-owner",
            "fake-year",
            "fake-file.js",
            "fake-content",
        ), /unrecognized license type: foo/);
    });
    it("should error on unrecognized file extension", () => {
        assert.throws(() => modify(
            "apache",
            "fake-owner",
            "fake-year",
            "fake-file.xls",
            "fake-content",
        ), /unrecognized file extension for file: fake-file.xls/);
    });
    it("keeps hashbang", () => {
        let data = modify(
            "apache",
            testCopyrightHolder,
            testYearRange,
            "foo/bar.js",
            "#!/bin/foo\nexport const x = 123;",
        );
        assert.strictEqual(data, `#!/bin/foo\n\n${testApacheHeader}\n\nexport const x = 123;`);

        data = modify(
            "proprietary",
            testCopyrightHolder,
            testYearRange,
            "foo/bar.js",
            data,
        );
        assert.strictEqual(data, `#!/bin/foo\n\n${testProprietaryHeader}\n\nexport const x = 123;`);
    });
    it("should modify license header", () => {
        // add apache header
        let data = modify(
            "apache",
            testCopyrightHolder,
            testYearRange,
            "foo/bar.js",
            "export const x = 123;",
        );
        assert.strictEqual(data, `${testApacheHeader}\n\nexport const x = 123;`);

        // replace with proprietary
        data = modify(
            "proprietary",
            testCopyrightHolder,
            testYearRange,
            "foo/bar.js",
            data,
        );
        assert.strictEqual(data, `${testProprietaryHeader}\n\nexport const x = 123;`);

        // remove header
        data = modify(
            "none",
            testCopyrightHolder,
            testYearRange,
            "foo/bar.js",
            data,
        );
        assert.strictEqual(data, `export const x = 123;`);

        // add apache again
        data = modify(
            "apache",
            testCopyrightHolder,
            testYearRange,
            "foo/bar.js",
            data,
        );
        assert.strictEqual(data, `${testApacheHeader}\n\nexport const x = 123;`);

        // keep comments
        data = modify(
            "apache",
            testCopyrightHolder,
            testYearRange,
            "foo/bar.js",
            "// foo\nexport const x = 123;",
        );
        assert.strictEqual(data, `${testApacheHeader}\n\n// foo\nexport const x = 123;`);
    });
});
