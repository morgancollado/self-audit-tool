# NOTICE — licensing of code vs. content

Errata is dual-licensed, because the **code** and the **content** come from
different places and carry different obligations.

## Code — MIT

All source code (everything outside `content/`) is licensed under the MIT
license in [`LICENSE`](./LICENSE).

## Content — CC BY-NC-SA 4.0

The data-broker opt-out content under **`content/brokers/`** is derived in part
from the **Big Ass Data Broker Opt-Out List** by Yael Grauer and contributors,
which is licensed **CC BY-NC-SA 4.0**
(https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List).

Because that license is **ShareAlike**, our derived broker content inherits it.
Therefore:

- The contents of `content/brokers/**` are licensed **CC BY-NC-SA 4.0**, not MIT
  (see [`content/brokers/LICENSE`](./content/brokers/LICENSE)).
- Attribution is preserved per-entry in each broker file's `attribution` and
  `sourceUrl` fields, and collectively here.
- **NonCommercial:** this content may not be used for commercial purposes. Errata
  is operated as a free, non-commercial tool; any fork redistributing this
  content must remain non-commercial and ShareAlike.

Broker entries that are **independently authored from a broker's own opt-out
page** (not derived from the list) are noted as such in their `attribution`
field and are contributed under CC BY-NC-SA 4.0 as well, so the whole
`content/brokers/` tree shares one license.

Other content (`content/law/`, `content/platforms/`, `content/records/`, etc.)
is original work contributed under CC BY-NC-SA 4.0 unless a file's `attribution`
states otherwise.

**Translations:** the `*.<locale>.json` overlay files (e.g. `spokeo.es.json`)
are translations of their sibling base files and carry the base file's license —
overlays under `content/brokers/**` are CC BY-NC-SA 4.0 derivatives of the same
upstream, and overlays elsewhere are original work under CC BY-NC-SA 4.0.

## Fonts — SIL Open Font License 1.1

The web fonts under **`public/fonts/`** are self-hosted (no font CDN, per the
no-phone-home rule) and licensed under the **SIL Open Font License, Version
1.1**. The full license text ships alongside them:

- **Newsreader** — © 2020 The Newsreader Project Authors
  (https://github.com/productiontype/Newsreader). License:
  [`public/fonts/OFL-Newsreader.txt`](./public/fonts/OFL-Newsreader.txt).
  Files: `Newsreader-Medium500.woff2`, `Newsreader-Italic400.woff2`.
- **IBM Plex Mono** — © 2017 IBM Corp., with Reserved Font Name "Plex"
  (https://github.com/IBM/plex). License:
  [`public/fonts/OFL-IBMPlexMono.txt`](./public/fonts/OFL-IBMPlexMono.txt).
  Files: `IBMPlexMono-Regular.woff2`, `IBMPlexMono-SemiBold.woff2`.
