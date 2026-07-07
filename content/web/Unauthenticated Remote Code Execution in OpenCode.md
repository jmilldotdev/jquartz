---
tags: 
aliases:
related:
publish: true
created-on: '[[2026-01-17]]'
url: https://cy.md/opencode-rce/
---


Before v1.1.10, OpenCode automatically and silently started an unauthenticated web server which allowed connecting peers to execute arbitrary code.
Before v1.0.216, any website could execute arbitrary code on your machine if OpenCode was running — no user interaction or configuration necessary.
Since v1.1.10, the server is disabled by default, but when enabled (via flags or config) it remains completely unauthenticated.

![[attachments/unauthenticated-remote-code-execution-in-opencode - 2026-01-17.webp]]
