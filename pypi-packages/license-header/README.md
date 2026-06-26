# license-header

A tool to add and update license headers in source code.

## Usage

Add `license-header` as a dev dependency.

```shellsession
uv add --dev license-header
```

Configure your license settings in `pyproject.toml`.

```toml
[tool.licenseheader]
copyright-holder = "Buf Technologies, Inc."
year-range = "2025-2026"
```

and run!

```shellsession
uv run license-header
```

This will add license headers to any files missing them. To fail on missing headers instead,
run with `--check`.
