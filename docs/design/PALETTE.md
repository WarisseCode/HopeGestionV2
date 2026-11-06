# Palette's Journal

## 2025-06-12 - Form Accessibility Improvement
**Learning:** Found critical accessibility gap in core Input component: labels were not programmatically associated with inputs, making forms confusing for screen reader users and harder to tap on mobile.
**Action:** Use React.useId() to auto-generate unique IDs when none are provided, ensuring 100% label-input association without manual dev effort.
