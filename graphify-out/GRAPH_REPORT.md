# Graph Report - C:\Users\Lenovo\CGTK-Web-Frontend  (2026-10-05)

## Corpus Check
- Corpus is ~3,912 words - fits in a single context window. You may not need a graph.

## Summary
- 151 nodes · 193 edges · 10 communities
- Extraction: 88% EXTRACTED · 11% INFERRED · 1% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `api.ts as the Only Door to the Backend` - 7 edges
3. `Per-Owner Page Folders (rijal, fariz, haqi)` - 6 edges
4. `scripts` - 5 edges
5. `Shared State Components (Memuat, PesanError, Kosong, Kerangka, WajibLogin)` - 5 edges
6. `WajibLogin()` - 4 edges
7. `useMuat()` - 4 edges
8. `lib` - 4 edges
9. `Web App CGTK 2027 Frontend` - 4 edges
10. `Display Server Error Messages Verbatim (pesanDari)` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Indonesian Document Language (lang="id")` --semantically_similar_to--> `Display Server Error Messages Verbatim (pesanDari)`  [INFERRED] [semantically similar]
  index.html → README.md
- `Mobile Viewport Meta` --semantically_similar_to--> `useMuatUlangBerkala Visibility-Aware Polling`  [INFERRED] [semantically similar]
  index.html → README.md
- `color-scheme light dark Declaration` --conceptually_related_to--> `Shared State Components (Memuat, PesanError, Kosong, Kerangka, WajibLogin)`  [AMBIGUOUS]
  index.html → README.md
- `#root Mount Element` --shares_data_with--> `Per-Owner Page Folders (rijal, fariz, haqi)`  [INFERRED]
  index.html → README.md
- `/src/main.tsx Module Entry Script` --references--> `Web App CGTK 2027 Frontend`  [INFERRED]
  index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Standard Page Data Flow: load, poll, render, surface errors** — readme_api_single_door, readme_use_muat_hook, readme_use_muat_ulang_berkala, readme_verbatim_server_error_messages, readme_shared_state_components, readme_halaman_info_reference_page [EXTRACTED 1.00]
- **Frontend Secret Boundary: anon key in, everything else out** — readme_anon_key_safe_in_browser, readme_supabase_login_only, readme_api_single_door, readme_env_fail_fast [EXTRACTED 1.00]
- **Three-Developer Consistency Regime** — readme_per_owner_page_folders, readme_one_pr_one_page, readme_one_team_one_library_choice, readme_shared_api_types, readme_build_before_pr_gate, index_root_element [INFERRED 0.85]

## Communities (10 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (30): color-scheme light dark Declaration, Indonesian Document Language (lang="id"), /src/main.tsx Module Entry Script, Mobile Viewport Meta, #root Mount Element, VITE_SUPABASE_ANON_KEY Safe in the Browser, 04-API-CONTRACT.md, api.ts as the Only Door to the Backend (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2022, src, vite/client, vite.config.ts, compilerOptions, isolatedModules (+16 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (17): ambilToken(), HasilBerhalaman, KesalahanApi, panggil(), Pilihan, Acara, Halaman, Jawaban (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (15): devDependencies, tailwindcss, @tailwindcss/vite, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (13): allowScripts, esbuild@0.21.5, engines, node, name, private, scripts, build (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.22
Nodes (9): WajibLogin(), api, IsiSesi, Konteks, Pengguna, PenyediaSesi(), useSesi(), masukDenganGoogle() (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (5): BelumDibuat(), Beranda(), rute, TidakDitemukan(), Kerangka()

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (7): HalamanInfo(), Kosong(), Memuat(), PesanError(), pesanDari(), Keadaan, useMuat()

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (9): dependencies, react, react-dom, react-router-dom, @supabase/supabase-js, react, react-dom, react-router-dom (+1 more)

## Ambiguous Edges - Review These
- `Shared State Components (Memuat, PesanError, Kosong, Kerangka, WajibLogin)` → `color-scheme light dark Declaration`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to
- `Shared State Components (Memuat, PesanError, Kosong, Kerangka, WajibLogin)` → `02-DIAGRAM.md (page map and access rights, items 4 and 27)`  [AMBIGUOUS]
  README.md · relation: cites

## Knowledge Gaps
- **60 isolated node(s):** `name`, `private`, `version`, `type`, `node` (+55 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Shared State Components (Memuat, PesanError, Kosong, Kerangka, WajibLogin)` and `color-scheme light dark Declaration`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Shared State Components (Memuat, PesanError, Kosong, Kerangka, WajibLogin)` and `02-DIAGRAM.md (page map and access rights, items 4 and 27)`?**
  _Edge tagged AMBIGUOUS (relation: cites) - confidence is low._
- **Why does `devDependencies` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 8` to `Community 4`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `api.ts as the Only Door to the Backend` (e.g. with `Shared API Types (src/types/api.ts)` and `useMuat Data-Loading Hook`) actually correct?**
  _`api.ts as the Only Door to the Backend` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Per-Owner Page Folders (rijal, fariz, haqi)` (e.g. with `#root Mount Element` and `One Pull Request, One Page`) actually correct?**
  _`Per-Owner Page Folders (rijal, fariz, haqi)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _60 weakly-connected nodes found - possible documentation gaps or missing edges._