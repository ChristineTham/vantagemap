# shadcn/ui Migration Guide

## Status: Partially Complete

The following mechanical fixes have already been applied:

| Fix                                                               | Count     | Status   |
| ----------------------------------------------------------------- | --------- | -------- |
| `w-N h-N` → `size-N`                                              | 173       | ✅ Done  |
| `space-y-N` → `flex flex-col gap-N`                               | 92        | ✅ Done  |
| Dialog a11y (`role`, `aria-modal`, `aria-labelledby`, Escape key) | 4 dialogs | ✅ Done  |
| `dark:` overrides                                                 | 0 found   | ✅ Clean |
| Raw Tailwind colors                                               | 0 found   | ✅ Clean |

---

## Phase 1: Install shadcn Primitives (Codespaces)

Run in GitHub Codespaces (requires npm access):

```bash
npx shadcn@latest add dialog button input label badge alert separator skeleton dropdown-menu card select textarea
```

This creates `src/components/ui/` with all the primitives needed for the migration.

---

## Phase 2: Migrate Dialogs → shadcn Dialog

**Priority: HIGH** — Biggest a11y improvement (focus trapping, proper portal, Escape dismiss via Radix).

### Files to Migrate

| Current File                               | Notes                                                      |
| ------------------------------------------ | ---------------------------------------------------------- |
| `src/components/BulkEditDialog.tsx`        | Has tabbed content + form                                  |
| `src/components/DeleteConfirmDialog.tsx`   | Confirmation pattern → use `AlertDialog`                   |
| `src/components/DocumentEditDialog.tsx`   | Large form, scrollable                                     |
| `src/components/RelationshipAddDialog.tsx` | Multi-step wizard                                          |
| `src/components/SearchModal.tsx`           | Already has good a11y; could use `Command` inside `Dialog` |

### Migration Pattern

Replace the hand-rolled overlay:

```tsx
// BEFORE (custom)
<div className="fixed inset-0 z-50 ..." role="dialog" aria-modal="true">
  <div className="absolute inset-0 bg-rosely-night/30" onClick={onClose} />
  <div className="relative w-full max-w-md ...">
    <h2>Title</h2>
    ...
  </div>
</div>;

// AFTER (shadcn Dialog)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Subtitle if needed</DialogDescription>
    </DialogHeader>
    {/* body */}
    <DialogFooter>{/* actions */}</DialogFooter>
  </DialogContent>
</Dialog>;
```

For `DeleteConfirmDialog`, use `AlertDialog` instead (blocks interaction until confirmed):

```tsx
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
```

---

## Phase 3: Migrate Forms → shadcn Input/Label

**Priority: MEDIUM** — Eliminates repeated inline styling on every `<input>` and `<label>`.

### Files to Migrate

All auth pages and admin forms:

- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/technical-users/page.tsx`
- `src/components/DocumentCreateForm.tsx`
- `src/components/DocumentEditDialog.tsx`
- `src/components/SurveyListView.tsx`

### Migration Pattern

```tsx
// BEFORE (repeated inline styling)
<div>
  <label className="block text-sm font-medium text-rosely-night mb-1">Email</label>
  <input
    type="email"
    className="w-full rounded-lg border border-rosely-blush bg-white px-3 py-2 text-sm text-rosely-night placeholder:text-rosely-mist focus:border-rosely-lilac focus:outline-none focus:ring-2 focus:ring-rosely-lilac/30"
  />
</div>;

// AFTER (shadcn)
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="flex flex-col gap-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" />
</div>;
```

**Note:** The shadcn `Input` component will need its default styles customized to match Rosely tokens. Edit `src/components/ui/input.tsx` after installation to use `border-rosely-blush focus-visible:ring-rosely-lilac`.

---

## Phase 4: Migrate Error Alerts → shadcn Alert

**Priority: MEDIUM** — 16 identical inline patterns across the codebase.

### Files Containing Error Alerts

```
src/components/BulkEditDialog.tsx
src/components/DeleteConfirmDialog.tsx
src/components/RelationshipAddDialog.tsx
src/components/DocumentCreateForm.tsx
src/components/DocumentEditDialog.tsx
src/components/SurveyListView.tsx
src/app/profile/page.tsx (×2)
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/reset-password/page.tsx
src/app/admin/users/page.tsx
src/app/admin/technical-users/page.tsx
```

### Migration Pattern

```tsx
// BEFORE (16 identical copies)
{
  error && (
    <div className="rounded-lg border border-rosely-rose/30 bg-rosely-rose/10 px-4 py-3 text-sm text-rosely-rose">
      {error}
    </div>
  );
}

// AFTER (shadcn Alert)
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

{
  error && (
    <Alert variant="destructive">
      <AlertCircle className="size-4" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
```

**Style customization:** Edit `src/components/ui/alert.tsx` variants to use Rosely tokens:

- `destructive`: `border-rosely-rose/30 bg-rosely-rose/10 text-rosely-rose`

---

## Phase 5: Migrate Badges → shadcn Badge

**Priority: MEDIUM** — Standardizes the 3 custom badge components.

### Files to Migrate

| Current Component                 | Purpose                |
| --------------------------------- | ---------------------- |
| `src/components/StatusBadge.tsx`  | Health status pills    |
| `src/components/LifecycleTag.tsx` | Lifecycle phase tags   |
| Inline `<span>` badges            | Various one-off badges |

### Migration Pattern

```tsx
// BEFORE (custom)
<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-rosely-teal/20 text-rosely-teal">
  Active
</span>;

// AFTER (shadcn Badge with custom variants)
import { Badge } from "@/components/ui/badge";

<Badge variant="success">Active</Badge>;
```

**Customization:** Add Rosely variants to `src/components/ui/badge.tsx`:

```tsx
const badgeVariants = cva("...", {
  variants: {
    variant: {
      default: "border-transparent bg-primary text-primary-foreground",
      secondary: "border-transparent bg-secondary text-secondary-foreground",
      destructive: "border-transparent bg-rosely-rose/15 text-rosely-rose",
      success: "border-transparent bg-rosely-teal/15 text-rosely-teal",
      warning: "border-transparent bg-rosely-golden/15 text-rosely-night",
      info: "border-transparent bg-rosely-periwinkle/15 text-rosely-periwinkle",
      outline: "border-rosely-blush text-rosely-dusk",
    },
  },
});
```

---

## Phase 6: Migrate Dropdowns → shadcn DropdownMenu

**Priority: MEDIUM** — 2 custom dropdown menus without proper keyboard navigation.

### Files to Migrate

| File                                              | Current Pattern                                  |
| ------------------------------------------------- | ------------------------------------------------ |
| `src/app/admin/users/page.tsx` (`UserActionMenu`) | Absolute-positioned div, manual open/close state |
| `src/components/UserMenu.tsx`                     | Bottom-anchored popover in sidebar               |

### Migration Pattern

```tsx
// BEFORE (custom)
const [open, setOpen] = useState(false);
<div className="relative">
  <button onClick={() => setOpen(!open)}>⋯</button>
  {open && (
    <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border ...">
      <button onClick={action1}>Edit</button>
      <button onClick={action2}>Delete</button>
    </div>
  )}
</div>;

// AFTER (shadcn)
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button>⋯</button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={action1}>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={action2} className="text-rosely-rose">
      Delete
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>;
```

---

## Phase 7: Migrate Cards → shadcn Card

**Priority: LOW** — Cosmetic consistency, not a functional issue.

### Pattern

```tsx
// BEFORE
<div className="rounded-xl border border-rosely-blush bg-white p-5">
  <h3>Title</h3>
  <p>Content</p>
</div>;

// AFTER
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
</Card>;
```

**Style customization:** Edit `src/components/ui/card.tsx` to use:

- `border-rosely-blush rounded-xl` (instead of default gray border)

---

## Phase 8: Replace Inline Skeletons with Component

**Priority: LOW** — Already have a `Skeleton` component; some places use raw `animate-pulse` divs instead.

### Files Using Inline Skeletons

```
src/app/page.tsx (loading fallback for dynamic charts)
src/app/reports/page.tsx (loading fallback for dynamic charts)
src/app/(auth)/layout.tsx
src/app/profile/page.tsx
src/app/admin/roles/page.tsx
src/app/admin/users/page.tsx
src/app/admin/technical-users/page.tsx
src/components/UserMenu.tsx
src/components/DocumentDetail.tsx
```

### Migration Pattern

```tsx
// BEFORE
<div className="h-60 animate-pulse rounded-lg bg-rosely-blush/30" />;

// AFTER
import { Skeleton } from "@/components/Skeleton";
<Skeleton className="h-60" />;
```

---

## Phase 9: Button Loading States (After shadcn Button)

### Files with Custom Spinners

```
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/reset-password/page.tsx
src/components/DocumentEditDialog.tsx
src/components/DocumentCreateForm.tsx
src/components/DeleteConfirmDialog.tsx
src/components/BulkEditDialog.tsx
src/components/RelationshipAddDialog.tsx
```

### Migration Pattern

```tsx
// BEFORE
<button disabled={saving} className="...">
  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
  {saving ? "Saving..." : "Save"}
</button>;

// AFTER (shadcn Button)
import { Button } from "@/components/ui/button";

<Button disabled={saving}>
  {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
  {saving ? "Saving..." : "Save"}
</Button>;
```

---

## Execution Checklist

Run all steps in GitHub Codespaces:

```bash
# 1. Install shadcn components
npx shadcn@latest add dialog alert-dialog button input label badge alert separator skeleton dropdown-menu card select textarea

# 2. Customize component styles for Rosely palette
#    Edit src/components/ui/input.tsx, badge.tsx, alert.tsx, card.tsx

# 3. Migrate dialogs (Phase 2) — one at a time, test after each

# 4. Migrate forms (Phase 3)

# 5. Migrate alerts (Phase 4) — bulk find-replace

# 6. Migrate badges (Phase 5)

# 7. Migrate dropdowns (Phase 6)

# 8. Migrate cards (Phase 7)

# 9. Replace inline skeletons (Phase 8)

# 10. Migrate button loading (Phase 9)

# 11. Run tests
npm run build
npm run lint
npm run test
```

---

## Verification

After each phase, verify:

1. `npm run build` passes (no TypeScript errors)
2. `npm run lint` passes
3. Visually inspect affected pages — no layout shifts or missing styles
4. Test keyboard navigation on dialogs (Tab, Shift+Tab, Escape)
5. Test screen reader announces dialog titles correctly
