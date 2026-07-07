---
tags:
aliases:
related:
publish: true
created-on: '[[2025-07-11]]'
url: https://ampcode.com/AGENT.md
---

2. Specification
The AGENT.md file MUST be placed in the root directory of a software project and MUST use Markdown formatting. The file SHOULD contain the following sections:

Project structure and organization
Build, test, and development commands
Code style and conventions
Architecture and design patterns
Testing guidelines
Security considerations
The format is designed to be human-readable while providing structured information that can be parsed by agentic coding tools.

2.1. Multiple AGENT.md Files
Implementations MUST support multiple AGENT.md files in a hierarchical structure:

Root-level AGENT.md for general project guidance
Subdirectory AGENT.md files for specific subsystem guidance
User-global AGENT.md in ~/.config/AGENT.md for personal preferences
When multiple files exist, tools SHOULD merge the configurations with more specific files taking precedence over general ones.

2.2. File References
AGENT.md files MAY reference other files using @-mentions (e.g., @filename.md) to include additional context or documentation that should be considered when working in the project.
