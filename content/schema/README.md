# Content schemas

Errata's broker / platform / law / record / template content is **versioned
structured data**, never hardcoded in components (scope/docs/03, /05). These JSON
Schemas (Draft 2020-12) are the contract; `lib/content/validate.mjs` enforces
them in CI.

| Schema | Applies to | Notes |
|--------|-----------|-------|
| `common.schema.json` | shared `$defs` | hierarchical jurisdiction, dates, risk, permanence |
| `broker.schema.json` | `content/brokers/<country>/*.json` | opt-out steps required (no dead-ends); `optOutExposesLinkage` flags the opt-out paradox (R13) |
| `platform.schema.json` | `content/platforms/*.json` | hardening steps required; deadname-removal optional but typed |
| `law.schema.json` | `content/law/<country[-region]>/*.json` | `appliesNationally:false` ⇒ must name its `region`; disclaimer required (R4) |
| `record.schema.json` | `content/records/<country[-region]>/*.json` | **no-dead-end rule encoded** (see below) |
| `template.schema.json` | `content/templates/*.json` | opt-out output; placeholders filled in-memory |

## The no-dead-end rule (encoded)

`record.schema.json` will **fail validation** unless an item either:

1. carries a non-empty `actions` array, **or**
2. is an explicit `monitorOnly: true` + `permanence: "high"` item **with**
   `harmReduction` text.

This makes "a finding with nothing the user can do" un-shippable. Brokers and
platforms get the same guarantee structurally (opt-out `steps` / `hardening.steps`
are `minItems: 1`). See scope/docs/09-removal-feasibility.md.

## Path → type

The validator infers a file's type from its directory: `content/brokers/**` →
broker, `content/records/**` → record, etc. Region (e.g. `us-CA`) lives in each
record's `jurisdiction` field; the directory name is for humans.

## Run locally

```
npm run validate:content
```
