// Source-of-truth CodeGraph screen strings.
// Every other locale falls back to these when its own copy is missing.

export default {
  eyebrow: "Code intelligence",
  title: "CodeGraph",
  summary:
    "Index a repository once, then ask structural questions about it. CodeGraph walks the AST to map entry points, imports, and call edges so the agent can reason about code it has not read line by line.",
  runtime: "Local runtime",
  repos: {
    title: "Indexed repositories",
    empty:
      "No repositories indexed yet. Add a repository below to build its graph.",
  },
  addRepo: "Add repository",
  files: "files",
  nodes: "nodes",
  edges: "edges",
  cli: {
    installed: "CLI installed",
    version: "Version",
    missingTitle: "CodeGraph CLI not found",
    missingBody:
      "Install the CodeGraph CLI to index repositories, or point Hermes at an existing index. The desktop never installs it for you.",
    install: "Install CodeGraph CLI",
    setupHermes: "Configure Hermes",
  },
  contextBundle: "Context bundle",
  contextBundleHint:
    "Describe the architecture or code path you want context for. CodeGraph assembles the relevant files and edges into a single attachment you can drop into Chat.",
  promptPlaceholder:
    "Summarize the architecture, hot paths, and likely extension points for …",
  build: "Build bundle",
  building: "Building…",
  embeddedSearch: "Embedded search",
  embeddedSearchHint:
    "Query the index directly from the shell. Results are ranked by graph proximity, not just text match.",
  embeddedSdkVersion: "SDK version",
  embeddedProjectOpen: "Project open",
  embeddedOpenProject: "Open project",
  embeddedSearchPlaceholder: "Ask a structural question, e.g. where is auth enforced?",
  embeddedSearchCta: "Search graph",
};
