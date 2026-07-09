# Botmux Plugin Market

Static marketplace index for botmux plugins.

This repository does not host plugin code. Plugin packages are published to npm,
usually under the `@botmux-ai/plugin-<id>` naming convention. The market only
maps a short plugin id to package metadata that `botmux plugin search`, `info`,
and `install <id>` can consume.

## Layout

```text
plugins/<id>.json              plugin entry submitted by authors
schema/plugin-entry.schema.json entry schema for docs and validation
scripts/validate.mjs           validates entries and regenerates index.json
index.json                     generated aggregate index
```

## Entry Example

```json
{
  "id": "agent-chrome",
  "package": "@botmux-ai/plugin-agent-chrome",
  "displayName": "Agent Chrome",
  "description": "Chrome browser control for botmux agents.",
  "repo": "https://github.com/botmux-ai/botmux-plugin-agent-chrome",
  "docs": "https://github.com/botmux-ai/botmux-plugin-agent-chrome#readme",
  "categories": ["browser", "mcp"],
  "compatibility": { "botmux": ">=0.0.0" }
}
```

## Submit A Plugin

1. Publish the plugin package to npm.
2. Add `plugins/<id>.json`.
3. Run `npm test`.
4. Open a pull request.

Validation checks id format, duplicate ids, package-name shape, URL fields, and
regenerates `index.json`. The botmux installer still performs package-level
validation after download; this market is discovery metadata, not a trust
boundary.

