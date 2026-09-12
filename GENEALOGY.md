---
genealogy-version: "0.1.0-draft.2"
project:
  id: "https://github.com/abusamt/recipes"
  name: "Muminah's Recipes"
self-citation:
  - id: "markdown-recipe-ssot"
    subject: "The Markdown-first recipe archive model in which one Markdown file per recipe is the editable source and JSON, JSONL, and browser data are generated artifacts."
    cite-when:
      - "Substantially reimplementing this recipe-specific Markdown-to-generated-data model."
    do-not-cite-when:
      - "Using Markdown, JSON, JSONL, or static-site generation generically without adopting this recipe-specific data flow."
  - id: "fork-aware-github-editing"
    subject: "The fork-aware static recipe interface that opens authenticated GitHub Edit and New File routes for the current repository while keeping credentials outside the site."
    cite-when:
      - "Substantially reimplementing this repository-aware GitHub editing and recipe-creation workflow."
    do-not-cite-when:
      - "Linking to GitHub files generically without adopting this repository-aware recipe workflow."
lineage:
  - source: "https://www.copymethat.com/recipebox/muminah/6566850/"
    subject: "The initial 73-recipe collection imported from the supplied CopyMeThat export and normalized into this repository's Markdown recipe records."
    relationship: "adapted"
    seen: "2026-07-12"
    applies-to:
      - "data/recipes-md/"
      - "data/recipes/"
    uncertainty: "This records the export as the source of the imported collection; it does not claim that CopyMeThat authored every underlying recipe or establish the provenance of each recipe's original content."
  - source: "https://www.copymethat.com/recipebox/muminah/6566850/"
    subject: "The recipe-box browsing and editing experience used as a reference for this repository's static recipe interface."
    relationship: "inspired"
    seen: "2026-07-12"
    applies-to:
      - "index.html"
      - "app.js"
      - "styles.css"
    uncertainty: "The interface is an independent static implementation and does not claim copied CopyMeThat code or product ownership."
---

# Genealogy

This document publishes narrow, feature-scoped self-citation guidance for descendants of this repository. It does not claim exhaustive provenance, independent invention, copying, legal derivation, licence compliance, or historical verification.

The inspected project record supports the self-citation subjects above through the repository README, build scripts, Markdown recipe corpus, browser interface, Git history, and the supplied CopyMeThat export and saved recipe-box pages. The two CopyMeThat entries are bounded to the imported collection and interface reference; they are not claims about the provenance of every underlying recipe.

The `lineage` block is non-exhaustive. Its contents do not claim that an exhaustive antecedent search was performed.
