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

const licenseTypeNone = "none";
const licenseTypeApache = "apache";
const licenseTypeProprietary = "proprietary";

export const hashbangPrefix = "#!";

export const extToCommentPrefix = {
    ".go": "//",
    ".js": "//",
    ".jsx": "//",
    ".mjs": "//",
    ".cjs": "//",
    ".proto": "//",
    ".sql": "---",
    ".ts": "//",
    ".tsx": "//",
    ".bazel": "#",
    ".bzl": "#",
    ".kt": "//",
    ".swift": "//",
    ".java": "//",
    ".cc": "//",
    ".c": "//",
    ".h": "//",
    ".py": "#",
    ".pyi": "#",
};

// All known extensions combined to a single pattern, **/*.{go,js,jsx} etc
export const extPattern =
    `**/*.{${Object.keys(extToCommentPrefix)
        .map(ext => ext.substring(1))
        .join(",")}}`

export const licenseMatchingPhrases = [
    "copyright",
];


export const licenses = {
    [licenseTypeNone]: () => "",

    /**
     * @param {string} yearRange
     * @param {string} copyrightHolder
     * @returns {string}
     */
    [licenseTypeApache](yearRange, copyrightHolder) {
        if (yearRange.length === 0 || copyrightHolder.length === 0) {
            throw `year-range and copyright-holder are required for license ${licenseTypeApache}`;
        }
        return `Copyright ${yearRange} ${copyrightHolder}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`;
    },

    /**
     * @param {string} yearRange
     * @param {string} copyrightHolder
     * @returns {string}
     */
    [licenseTypeProprietary](yearRange, copyrightHolder) {
        if (yearRange.length === 0 || copyrightHolder.length === 0) {
            throw `year-range and copyright-holder are required for license ${licenseTypeProprietary}`;
        }
        return `Copyright ${yearRange} ${copyrightHolder}

All rights reserved.`;
    },
}
