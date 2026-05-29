## 2024-05-29 - Memoize category derivations in MenuClient
**Learning:** Component state changes (like opening a modal) and global store subscriptions (like a Zustand cart store) can trigger full re-renders of components handling large arrays of mapped and filtered data. When not memoized, this causes unnecessary recalculation of potentially large category arrays on every render.
**Action:** Use `useMemo` for array filtering/mapping operations that depend on props or minimal state variables, especially when those derivations are mapped directly to render lists.
