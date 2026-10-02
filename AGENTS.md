# Project Rules: SimpleBlog v2 Frontend

This document establishes the mandatory design and architecture rules for all frontend development in `frontend-simple-blog-v2`. Every agent and developer must comply with these standards automatically.

---

## Authoritative Specification
The single source of truth for design architecture is located in:
**[docs/PRODUCT_DESIGN_AUDIT_AND_GUIDELINES.md](file:///c:/Data/Project%20Golang/frontend-simple-blog-v2/docs/PRODUCT_DESIGN_AUDIT_AND_GUIDELINES.md)**

## Core Development Rules

1. **Zero Browser Dialogs:**
   - Never use `alert()`, `confirm()`, or `prompt()`.
   - Always implement in-app modals (e.g., `DeleteConfirmModal`, `UserProfileModal`) or in-app toast banners.

2. **Design System & Theme Continuity:**
   - Use semantic design tokens from `src/app/globals.css` (`--brand-coral`, `--brand-pink`, `--social-blue`, `--bg-main`, `--card-bg`, `--border`).
   - Never use hardcoded neon/generic colors.
   - Maintain seamless continuity for both Light Mode and Dark Mode via `useTheme()`.

3. **Typography Standard:**
   - Headings & Titles: `Outfit` font (`var(--font-outfit)`).
   - Body Text, Inputs & Labels: `Inter` font (`var(--font-sans)`).

4. **Symmetrical Layouts & Touch Ergonomics:**
   - Nav items and sidebars must maintain optical symmetry and straight column alignment.
   - Interactive touch targets must meet the 44×44px minimum standard on mobile.

5. **Smooth State Transitions:**
   - All modals must include smooth spring entry and exit animations (`animateOut` before DOM removal).
   - All loading screens must use skeleton shimmers (`PostSkeleton`), never raw unstyled "Loading..." text.

6. **Accessibility (WCAG AA):**
   - Visible `:focus-visible` outline rings on all focusable elements.
   - Descriptive `aria-label` on all icon-only buttons.
   - Keyboard navigation support (`Escape` to close modals, `Tab` focus flow).
