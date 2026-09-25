# Evidence-backed profile core

## Data flow

```text
Repository sources
  -> deterministic collector
  -> RepoEvidenceBundle v1
     -> deterministic repository facts ----------------------+
     -> EvidenceLedger -> bounded evidence -> Jev semantics -+--> attribution/profile aggregation
                                                             |
Actor evidence sources --------------------------------------+
  -> Git identity links
  -> review / decisions / debug / test / maintenance
  -> privacy-bounded agent-workflow receipts
  -> explicit user confirmation

attribution/profile aggregation
  -> DeveloperProfile v1
  -> DocumentInput v1 publication firewall
  -> project/personal renderers
```

## Authority

1. Repository/Git/filesystem facts are exact deterministic inputs and should not require Jev.
2. Jev observations are project-scoped semantic/advisory interpretations over bounded evidence.
3. Actor evidence separately establishes identity linkage or observable agency; Git authorship alone does not establish manual code authorship.
4. Personal experience claims require both project support and sufficient actor attribution.
5. AI-assisted/mixed implementation origin is preserved as provenance.
6. Writing models may format/present curated claims but cannot create unsupported project semantics, actor relations, expertise or seniority.

## Integration boundary

Kode may later embed `giteach-core` directly. OmnySys and MauroPrime/Bridge/MSSR may export bounded evidence through adapters. Those integrations do not change GitTeach's ownership of the professional-profile domain and must not import raw private prompts by default.
