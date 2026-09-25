# Foundation decisions

- Reuse the GitTeach repository/history; do not start an unrelated new repository.
- Build a clean core alongside legacy code, then migrate/delete legacy pieces intentionally.
- Keep `src/core/` independent from legacy Electron/renderer runtime.
- Move the durable implementation toward a Rust library core after the evidence contracts stabilize.
- Do not duplicate OmnySys graph/governance responsibilities.
- Use deterministic extraction for Git/file/manifests/tests/dates/hashes whenever possible.
- Use Jev only where semantic interpretation adds value: project purpose, domains, capabilities, practices, concise summaries and ambiguous classifications.
- Store source references with every Jev-derived professional claim.
- Do not equate code presence with authorship or mastery; preserve ownership/context uncertainty where it exists.
- Generated documents are views over the curated profile, not independent sources of truth.
- Changelog details live in `changelog/`; root `CHANGELOG.md` remains an index.
