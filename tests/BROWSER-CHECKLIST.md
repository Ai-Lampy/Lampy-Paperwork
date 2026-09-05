# V33.2 browser release checks

**Use this checklist only when the user explicitly requests browser testing.** Interface changes, implementation requests and releases do not authorise browser testing. Static validation remains the default.

When explicitly requested, run against localhost and the built artifact. Use separate test projects, never live tour data.

| Check | Chrome/Chromium | Firefox | Safari |
| --- | --- | --- | --- |
| Startup, visible welcome dismissal, keyboard focus | Required | Required | Required |
| Fixture picker with apostrophes in names | Required | Required | Required |
| 2,300 W fixture on 230 V circuit reports 10 A | Required | Required | Required |
| Unknown watts show incomplete circuit and phase totals | Required | Required | Required |
| Add, resize and delete first/middle distros; preserve other labels | Required | Required | Required |
| Save/reload and portable project round trip | Required | Required | Required |
| Malformed project leaves current work unchanged | Required | Required | Required |
| Storage denied/full shows recovery action; second tab pauses writes | Required | Required | Required |
| ZIP/GDTF import, corrupt ZIP rejected, built GDTF thumbnail | Required | Required | Required |
| Device Config single-port parent promotion, multi-port children and full-width tables | Required | Required | Required |
| Device Config VLAN Setup opens and refreshes; IP Address' has no VLAN Setup action | Required | Required | Required |
| Device Config Shift ranges, list drag-fill, Facing column and constrained directions | Required | Required | Required |
| DMX Node and Network Switch management fields remain on parent rows | Required | Required | Required |
| Filters start collapsed; Global Subnet defaults new devices and applies only on command | Required | Required | Required |
| `+ Supply` loads JSON labels, starts blank and cancels cleanly if loading fails | Required | Required | Required |
| Power and label PDF preview/download; inspect physical dimensions | Required | Required | Required |
| 1,000-fixture project editing, navigation and exports | Required | Required | Required |

`node tests/release-regressions.cjs` covers calculation, migration, import and storage failures plus a 10,000-fixture data round trip. This is not a claim that the browser matrix or large-project rendering has passed. Record browser/version and actual outcomes when publishing.
