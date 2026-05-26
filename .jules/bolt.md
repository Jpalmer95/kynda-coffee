## 2024-05-26 - Memoizing Product Grid Items
**Learning:** In large list renderings like the product shop page, React re-renders every item when the parent component's state changes (like selecting a different category or quick viewing an item), causing a significant performance penalty.
**Action:** Always wrap list items like `ProductCard` and its sub-components like `ProductImage` with `React.memo` if they rely on primitive props or objects whose references don't change frequently, reducing unnecessary re-renders.
