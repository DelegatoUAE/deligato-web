# Adopting the design system (for the Frontend agent)

Owner of `web/src/design/**`: UI/UX agent. You own pages, `App.jsx`, `App.css`, `index.css`, `main.jsx`. Nothing in this folder needs editing to adopt it. If a primitive is missing a prop you need, write `BUILD/requests/uiux-<topic>.md` and don't fork the component.

## 1. Wire it up (three small edits in your files)

1. **CSS.** `index.css` already does `@import './design/tokens.css'`. Keep the line `main.jsx` already has (uncommitted, from the VS Code session):
   ```js
   import './index.css';
   import './design/components.css';
   ```
   `components.css` must load after `index.css`, and `App.css` must load after both, so old screens still win where they overlap during migration.
2. **Toasts.** Wrap the app once, in `main.jsx` or at the top of `App.jsx`:
   ```jsx
   import { ToastProvider } from './design/ui';
   <ToastProvider><App /></ToastProvider>
   ```
3. **Route.** Add `/design` → `src/design/Showcase.jsx` (default export). It renders its own AppShell and ToastProvider, so mount it outside `Layout`.

## 2. Importing

```jsx
import { Button, Card, ScoreRing, FitList, useToast } from '../design/ui';   // barrel
import Button from '../design/ui/Button.jsx';                               // or per file
```
Each component is one file with a default export, written in plain JSX. `design/ui/index.js` re-exports all of them under their names.

## 3. Naming

- All classes are prefixed `ui-`: root `.ui-<block>`, parts `.ui-<block>-<part>`, variants and tones `.ui-<block>-<variant>`, runtime state `.is-<state>` (`is-active`, `is-open`, `is-loading`).
- Selectors are single-class where possible, so a page can override one with one class.
- Tokens: use the semantic layer (`--bg`, `--surface`, `--text`, `--text-soft`, `--border`, `--accent`, `--fit-*`) in page CSS. Use the raw scales (`--navy-600`, `--gold-200`) only when you need a specific step.
- `.ui-on-navy` re-points the semantic tokens for anything placed on navy. Panel `tone="navy"`, the sidebar, the readiness dial and navy stat tiles apply it for you.
- Light / Dark / System is live (D54). See §8: page CSS uses semantic tokens only, and `src/lib/tokens.test.js` fails the build's tests on a literal colour or a raw scale step outside the brand chrome.
- Old token names still work (`--brand`, `--brand-2`, `--brand-3`, `--brand-soft`, `--surface`, `--radius`, `--shadow`, `--error`, `--success`, `--focus`), so App.css keeps rendering while you migrate.

## 4. Components

| Need | Component | Notes |
|---|---|---|
| Layout | `AppShell` | Navy sidebar, sticky top bar, off-canvas below 1024px. Pass `LinkComponent={NavLink}` and `nav=[{ title, items:[{ id, label, icon, href, end, badge }] }]`. |
| Page top | `PageHeader` | `breadcrumbs`, `eyebrow`, `title`, `subtitle`, `meta`, `actions`. |
| Containers | `Card`, `Panel`, `CardHeader` | Card `tone` default/sunken/outline, `interactive`, `selected`, `footer`. Panel `tone` navy/cream. |
| Actions | `Button` | `variant` primary/accent/secondary/ghost/danger/link; `size` sm/md/lg; `loading`, `iconLeft`/`iconRight` (Icon name), `as={Link}`. **One `accent` (gold) button per view.** |
| Figures | `StatTile`, `ProgressBar` | StatTile `value`, `unit`, `delta={{ value, direction, label }}`, `tone`, `loading`. |
| Readiness score | `ScoreRing variant="readiness"` | `value` 0–100 or null (unscored), `band` (label from the readiness engine), `bandTone` critical/very-high/high/medium/semi/ready/exceptional, `showBands`, `size` sm/md. Draws only; never computes the band. |
| Capital Match Score | `ScoreRing variant="match"` | `value` or null, `confidence` high/medium/low (low fades it), `size` sm/md/lg. **Never use the readiness dial for a match score, or the reverse.** |
| Eligibility | `FitList`, `FitRow`, `Fit`, `FitLegend`, `FitMark` | State is yes/partial/no/unknown. Anything else, including `undefined`, renders as **unknown**, and unknown is never green. `Fit` is the inline chip for tables. |
| Certainty | `ConfidenceBadge` | `level` high/medium/low. |
| Labels | `Badge`, `Tag`, `ChipToggle` | Badge is read-only. Tag can be removable (`onRemove`) or a toggle (`onClick` + `selected`). |
| Journey | `ProgressSteps` | `steps=[{ label, description, status: done/current/upcoming/blocked, href/onClick }]` or `current={i}`; `orientation="vertical"`, `compact`. |
| Navigation in page | `Tabs` | Controlled: `items`, `value`, `onChange`, `variant` underline/pill; children `(id) => panel`. |
| Data | `Table` | `columns=[{ key, header, numeric, align, render }]`, `rows`, `onRowClick`, `loading`, `empty`, `dense`. |
| Pipeline | `KanbanBoard`, `KanbanColumn`, `KanbanCard` | Styles plus structure. No drag library; wire your own and use `isOver`/`dragging`. |
| People | `Avatar` | `name`, `shape="org"` for funds and companies, `ring`. `.ui-avatars` stacks a group; `.ui-who` is avatar + name + sub. |
| Forms | `FormField` (alias `Field`), `Input`, `Textarea`, `Select` | FormField injects `id`, `aria-describedby` and `aria-invalid` into its single child. `Input prefix="$" numeric`. `Select options=[...]`. Grid: `.ui-form .ui-form-2`. |
| Feedback | `Alert`, `Toast` + `ToastProvider`/`useToast`, `EmptyState`, `Skeleton`, `SkeletonCards` | `useToast().success/error/info(msg)` or `.push({ tone, title, message, action })`. EmptyState takes `title` + `body` + `action`, and all three are expected. |
| Overlays | `Modal`, `Drawer`, `ConfirmDialog` | Escape, focus trap and focus return are built in. ConfirmDialog has `title`, `body` (say what will be destroyed), `confirmLabel` (repeat the action), `busy`, `onConfirm`, `onCancel`. |
| Misc | `Icon`, `Divider`, `Tooltip`, `cx` | Icon names are listed in `ui/Icon.jsx`. |

### Replace these now (correctness, not taste)
- `pages/MatchPage.jsx:70` `alert(\`Could not allocate: ...\`)` → `const toast = useToast(); toast.error(\`Could not allocate: ${e.message}\`)`.
- Any `window.confirm(...)` → `ConfirmDialog` with a body that names what is removed.
- `.cap-fit-*` markup → `FitRow`/`Fit`. The new component forces unknown for missing data.
- "Loading…" text → `Skeleton`/`SkeletonCards`/`Table loading`.
- "No data" text → `EmptyState` with title, why it's empty, and the one action.

## 5. Old App.css class → new primitive

| Old class(es) | Use instead |
|---|---|
| `.dashboard`, `.topbar`, `.topbar-left`, `.brand-mark`, `.main-nav`, `.nav-divider`, `.content` | `AppShell` (nav sections replace `.nav-divider`) |
| `.user-chip`, `.role-pill`, `.link-btn` (sign out) | `AppShell user={{ name, sub: role }}` + `footer={<Button variant="ghost" size="sm">Sign out</Button>}` |
| `.page-header`, `.welcome` | `PageHeader` |
| `.card`, `.panel`, `.panel-head`, `.table-card`, `.card-link`, `.card-foot` | `Card` (`title`/`action`/`footer`; `interactive` for links), `Panel` for feature blocks |
| `.cards`, `.card-label`, `.card-value` | `.ui-grid .ui-grid-4` + `StatTile` |
| `.btn-primary`, `.btn-secondary`, `.link-button`, `.match-cta`, `.cap-match-cta`, `.cap-pipeline-cta` | `Button` primary / secondary / link; the one forward CTA → `variant="accent"` |
| `.chip`, `.tag`, `.tag-row`, `.tag-strong`, `.tag-matched` | `Tag` / `.ui-tags`; matched → `Badge tone="ok"` |
| `.status-pill`, `.status-active/.completed/.on_hold/.cancelled` | `Badge tone` ok / brand / warn / bad with `dot` |
| `.avail-pill`, `.avail-available/.partial/.booked/.leave` | `Badge` ok / warn / bad / neutral |
| `.provider-badge`, `.provider-openai`, `.provider-heuristic` | `Badge tone="info"` / `Badge tone="outline"` |
| `.avatar` | `Avatar` |
| `.data-table`, `.row-list` | `Table` |
| `.filter-bar`, `.filters` | `.ui-row` + `Select`, `ChipToggle`, or `Tabs variant="pill"` |
| `.field`, `.auth-card label/input/select`, `.cap-form`, `.cap-form-actions`, `.cap-edit` | `FormField` + `Input`/`Select`/`Textarea` in `.ui-form` |
| `.error`, `.ok`, `.success-box`, `.cap-caveat`, `.cap-legend-note` | `Alert` bad / ok / ok / warn / brand |
| `.empty` | `EmptyState` |
| `.muted` | `.ui-muted` |
| `.drawer`, `.drawer-overlay`, `.drawer-footer` | `Drawer` (`footer` prop) |
| `.two-col` | `.ui-grid .ui-grid-2` |
| `.auth-shell`, `.auth-card` | Keep for now (outside the shell). Rebuild the inner form with `Card` + `FormField` + `Button block`. |
| `.consultant-card/-grid/-head/-meta/-name`, `.project-summary` | `Card interactive` + `.ui-who` + `Badge`/`Tag` in `.ui-grid-3` (Expert Support, D1) |
| `.match-list`, `.match-row`, `.match-row-head`, `.match-main`, `.match-mini`, `.match-reasoning`, `.match-score-block`, `.match-score-num` | `Card` per match: `ScoreRing variant="match" size="sm"` + `FitRow compact` chips + reasoning paragraph |
| `.cap-grid`, `.cap-profile-strip`, `.cap-profile-chip` | `.ui-grid` + `Tag` |
| `.cap-match`, `.cap-match-head`, `.cap-match-list`, `.cap-match-meta`, `.cap-match-score`, `.cap-score-chip`, `.cap-score-num` | `Card` + `ScoreRing variant="match"` + `ConfidenceBadge` |
| `.cap-fits`, `.cap-fit`, `.cap-fit-yes/-partial/-no/-unknown`, `.cap-checks`, `.cap-check` | `FitList` / `FitRow` (or `Fit` chips) + `FitLegend` |
| `.cap-conf`, `.cap-conf-high/-medium/-low` | `ConfidenceBadge` |
| `.cap-why`, `.cap-why-ai`, `.cap-gaps` | `Card tone="sunken"` with `Badge tone="info"` labelling AI-written text |
| `.cap-nonmatch`, `.cap-nonmatch-list` | `Tabs` "Not eligible" + `FitList` showing the failing criterion |
| `.cap-gate`, `.cap-gate-inline`, `.cap-locked` | `Alert tone="brand"` with an action, or `EmptyState` with `icon="lock"` |
| `.cap-run-summary`, `.cap-run-stat` | `StatTile` row |
| `.cap-pipeline-head/-list/-row/-detail`, `.cap-stage-group`, `.cap-stage-head` | `KanbanBoard`/`KanbanColumn`/`KanbanCard`, with `Drawer` for detail |
| `.cap-deadline`, `.cap-overdue`, `.cap-activity` | `Badge tone="gold" dot` (due) / `Badge tone="bad" dot` (overdue); activity list as `Card` |
| `.cap-route`, `.cap-portfolio` | `Tag` list inside `Card` |

Delete an App.css block once no page uses it.

## 6. What moved

The VS Code session's `web/src/components/ui/index.jsx` (uncommitted, never imported) was ported into `design/ui/` as one file per component, and the original was removed. Its APIs are preserved, so code written against it ports by changing the import path:
`Button` (`icon` still works as an alias of `iconLeft`; `gold` still works as a variant), `Card` (`pad` still works; `padded` is the new name), `CardHeader`, `Badge`, `Fit`, `StatTile`, `ProgressBar`, `ProgressRing`, `Skeleton` (`SkeletonText` is now `<Skeleton variant="text" lines={n} />`), `SkeletonCards`, `EmptyState`, `Alert`, `Field` (`= FormField`), `Input`, `Textarea`, `Select`, `ChipToggle`, `ToastProvider`/`useToast` (same `push/success/error/info` API), `ConfirmDialog` (same props), `PageHeader`, `Divider`, `Tooltip`. A backup copy is in the UI/UX agent's scratchpad.

## 7. Preview

`npm run dev -- --port 5180`, then open `http://localhost:5180/design-preview.html`. That file and `src/design/preview-main.jsx` are a scratch entry for visual checks. Vite only builds `index.html`, so they are not in the production bundle.

## 8. Theming: Light / Dark / System (D54)

**How it switches.** `index.html` runs a tiny boot script before the bundle: it reads `localStorage['deligato.theme']` (`light` / `dark` / `system`, default `system`), resolves System with `prefers-color-scheme`, and sets `<html data-theme="light|dark" data-theme-pref="…">` before the first paint. `ThemeProvider` (`components/ThemeProvider.jsx`, `useTheme()` from `components/theme-context.js`) keeps it in step with the user's choice, OS changes and other tabs. Pure logic lives in `lib/theme.js`. Controls: `ThemeToggle` (top bar and auth pages, a keyboard radio group) and Settings → Account → Appearance. Storage is local only until the API has a field (`BUILD/requests/web-appearance-api.md`).

**Where colour lives.** Only in `tokens.css`: `:root` holds the light values, `:root[data-theme='dark']` the dark ones, and `@media (prefers-color-scheme: dark) { :root:not([data-theme]) }` repeats the dark block as a no-script fallback (a test keeps the two identical). `.ui-on-navy` re-points the same names for the navy brand chrome, which looks the same in both themes.

**Rules for page and component CSS**
1. Use the semantic names below. Never `#hex`, `rgba()`, `white`, or a raw step (`--navy-200`, `--gold-dark`, `--ok-600`, `--cream-2`).
2. The exception is the fixed navy brand chrome (sidebar, auth panel, landing hero and footer, readiness dial, navy panel, match-score tile, compare bar): white type on navy, gold glows. Those selectors are listed in `lib/tokens.test.js` (`CHROME`); add one there only if it really is navy in both themes.
3. Never invert or filter images, uploaded documents, logos or the OG image. Images sit on `--surface` as they are.
4. New screens (Company Intelligence, Financial Health, Company Record) need nothing new: build with these tokens and both themes work. If a colour role is missing, add a semantic token to all three blocks and a contrast pair to `tokens.test.js`.

| Role | Tokens |
|---|---|
| Surfaces | `--bg` page · `--bg-sunken` wells, pill tracks · `--surface` cards · `--surface-2` insets, table heads, card feet · `--surface-raised` modals, drawers, menus · `--surface-hover` · `--surface-selected` selected rows/options · `--surface-warm` cream panels, grouped rows |
| Lines | `--border` · `--border-soft` · `--border-strong` · `--border-control` input edges (3:1) · `--border-focus` |
| Text | `--text` · `--text-strong` headings and figures · `--text-soft` · `--text-faint` (still AA) · `--text-link` · `--text-accent` gold words |
| Brand fill | `--brand-fill` / `--on-brand-fill` primary buttons, selected chips, done steps, match segments (navy in light, cream in dark) · `--brand-fill-hover` · `--brand-mid`, `--brand-muted` medium/low marks · `--brand-tint` / `--on-brand-tint` neutral badges and counters |
| Gold | `--accent` gold fills, focus, the one CTA · `--accent-hover` · `--accent-strong` gold marks (not small text) · `--gold-tint` / `--on-gold-tint` · `--gold-wash` · `--gold-line` |
| Status (ok, warn, bad, info) | `--X-bg` wash (alerts) · `--X-tint` badge fill · `--X-border` · `--X-fg` text on tint or card · `--X-fg-strong` text on wash · `--X-solid` / `--on-X-solid` dots, bars, toast marks, danger button · `--bad-soft`, `--ok-soft` second shades |
| Fit (correctness-critical) | `--fit-{yes,partial,no,unknown}-{fg,bg,mark}` · `--fit-yes-on-mark`. Unknown is never green; shape and glyph differ too. |
| Overlays | `--scrim`, `--scrim-soft` · `--toast-bg`, `--toast-border`, `--toast-fg`, `--toast-fg-strong`, `--toast-fg-soft` · `--tip-bg`, `--tip-fg` · `--chrome-border` |
| Bands | `--band-*` (on the navy dial) · `--on-band` words on a band colour |
| Depth, focus | `--shadow-*` (re-tuned for dark) · `--ring`, `--ring-danger` |

**Checks.** `npm test` runs `lib/tokens.test.js` (WCAG AA for ~70 text/control pairs in light, dark and navy chrome; dark block covers every light colour; fallback block identical; no literal colours) and `lib/theme.test.js` (System/explicit/storage failure, and the boot script agrees with `resolveTheme`).
