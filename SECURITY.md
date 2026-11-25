# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| < 0.1 | No |

## Reporting a vulnerability

Use GitHub's **private vulnerability reporting** on the repository's Security tab. Do not open a public issue for an unfixed vulnerability.

Please include:

- affected version and interface (CLI/HTTP/MCP);
- reproduction steps;
- impact assessment;
- whether a remote provider or non-loopback bind is involved;
- any suggested mitigation.

You can expect an initial acknowledgement within 3 business days. We will coordinate disclosure after a fix is available. Do not include real API keys, customer data, or proprietary prompts in reports.

## Scope

In scope:

- prompt injection that escapes the text-only boundary;
- authentication bypass on the HTTP server;
- SSRF or credential leakage through provider configuration;
- denial of service through request parsing;
- secret leakage in logs or error responses;
- supply-chain issues in published artifacts.

Out of scope:

- model output being factually wrong;
- downstream agent misuse;
- issues requiring a compromised local machine;
- vulnerabilities in third-party model providers.

## Safe defaults

- Loopback bind by default.
- Non-loopback bind requires a token.
- 1 MB request body limit.
- No prompt logging or persistence.
- No runtime dependencies.
- No postinstall scripts.
- API keys from environment variables only.

## Release integrity

Releases should be published with npm provenance and a GitHub Release containing the npm tarball and SHA-256. Verify the tag and checksum before deploying.
