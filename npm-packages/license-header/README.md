# @bufbuild/license-header

A tool to add and update license headers in source code.

Example usage:

```bash
$ npm install @bufbuild/license-header
npx license-header --year-range 2023 --copyright-holder "Acme, Inc." --license-type apache
```

This command will go through all checked-in and unstaged files, and update their license
headers.

As an alternative to the command line, license properties can be defined in package.json
under "licenseHeader".
