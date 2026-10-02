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
- Dark theme is opt-in only (`<html data-theme="dark">`). It does not switch on `prefers-color-scheme`, because App.css still hard-codes white cards and navy headings. This is a deliberate change from the v0 tokens.
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
