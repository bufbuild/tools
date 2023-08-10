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

import {extToCommentPrefix, hashbangPrefix, licenseMatchingPhrases, licenses,} from "./constants.mjs";
import {extname} from "node:path";

/**
 * Gets the comment prefix for the filename.
 *
 * @param {string} licenseType
 * @param {string} copyrightHolder
 * @param {string} yearRange
 * @param {string} filename
 * @param {string} data
 * @return {string}
 */
export function modify(
    licenseType,
    copyrightHolder,
    yearRange,
    filename,
    data,
) {
  if (!(licenseType in licenses)) {
    throw `unrecognized license type: ${licenseType}`;
  }
  const commentPrefix = extToCommentPrefix[extname(filename)];
  if (commentPrefix === undefined) {
    throw `unrecognized file extension for file: ${filename}`;
  }
  const {hashbang, remainder} = getContentWithoutLicense(data, commentPrefix);
  const licenseHeader = makeLicenseHeader(licenseType, yearRange, copyrightHolder, commentPrefix);
  const parts = [];
  if (hashbang.length > 0) {
    parts.push(hashbang.trim());
    parts.push("\n\n");
  }
  if (licenseHeader.length > 0) {
    parts.push(licenseHeader);
    parts.push("\n\n");
  }
  if (remainder.length > 0) {
    parts.push(remainder.trimStart());
  }
  return parts.join("");
}

/**
 * @param {string} licenseType
 * @param {string} copyrightHolder
 * @param {string} yearRange
 * @param {string} commentPrefix
 * @return {string}
 */
function makeLicenseHeader(licenseType, yearRange, copyrightHolder, commentPrefix) {
  const content = licenses[licenseType](yearRange, copyrightHolder);
  if (content.length === 0) {
    return "";
  }
  return content
      .split("\n")
      .map(line => {
        if (line.length > 0) {
          return `${commentPrefix} ${line}`;
        }
        return commentPrefix;
      })
      .join("\n");
}


/**
 * @typedef {Object} ContentWithoutLicense
 * @property {string} hashbang
 * @property {string} remainder
 */

/**
 * Gets the contents of the file without the license header.
 *
 * @param {string} data
 * @param {string} commentPrefix
 * @return {ContentWithoutLicense}
 */
function getContentWithoutLicense(data, commentPrefix) {
  const lines = data.split("\n");
  let i = 0;

  const hashbangLines = [];
  for (; i < lines.length; i++) {
    if (hashbangLines.length === 0) {
      if (lines[i].startsWith(hashbangPrefix)) {
        hashbangLines.push(lines[i]);
      } else {
        break;
      }
    } else {
      if (lines[i].trim().length === 0) {
        // empty lines following the hashbang belong to the hashbang
        hashbangLines.push(lines[i]);
      } else {
        break;
      }
    }
  }

  const headerLines = [];
  for (; i < lines.length; i++) {
    if (lines[i].startsWith(commentPrefix)) {
      headerLines.push(lines[i]);
    } else {
      break;
    }
  }

  const remainingLines = lines.slice(i);

  const containsALicense = headerLines.some(
      line => licenseMatchingPhrases.some(phrase => line.toLowerCase().includes(phrase))
  );
  if (containsALicense) {
    return {
      hashbang: hashbangLines.join("\n"),
      remainder: remainingLines.join("\n"),
    };
  }
  return {
    hashbang: hashbangLines.join("\n"),
    remainder: headerLines.concat(remainingLines).join("\n"),
  };
}
