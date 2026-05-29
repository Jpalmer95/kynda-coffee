## 2024-05-29 - Cart Drawer Screen Reader Accessibility
**Learning:** Cart drawer item quantity manipulation buttons lack descriptive context when read by screen readers. A generic "Remove item" label is ambiguous if multiple items are in the cart.
**Action:** Always interpolate product/item names into dynamic ARIA labels (e.g., `aria-label={`Remove ${item.product.name} from cart`}`) when dealing with lists or repeating components.
