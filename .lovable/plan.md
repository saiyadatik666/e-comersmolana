# Shifa A Hayat — Storefront implementation plan

## Goal
Build the real, customer-facing Shifa A Hayat shop on the connected Shopify development store, with secure account support and a review-first workflow for the 21 supplied promotional images. Never present unverified information or invented products as sellable facts.

## Work
1. **Storefront foundation** — Replace the template home page with a polished, mobile-first English storefront using the Shifa A Hayat name, a clean botanical visual direction, responsive navigation, product search/discovery, footer, and route-specific SEO metadata. Keep the brand name unchanged and do not invent business policies or contact information.
2. **Real Shopify catalogue and shopping** — Fetch only real Shopify products from the Storefront API (2025-07); create product detail pages, quantity selection, and a persistent cart synchronized through Shopify cart mutations. Checkout must use Shopify's returned checkout URL, never a hand-built URL. With the current empty store, show a clear “No products found” state rather than sample products, and explain that products can be added through chat after the owner supplies verified names/prices.
3. **Image review inventory** — Preserve all 21 original JPGs as app assets and prepare a numbered manifest with filenames, dimensions, provisional visual identification, and verification/publication status. Keep promotional posters out of the customer-facing product catalogue until the owner confirms sellable products, prices, pack sizes, and approved claims.
4. **Accounts and customer data** — Use Lovable Cloud email/password and Google sign-in with a profile record, protected profile/address/wishlist data, and owner-only row access. Add a separate protected role system for admin authorization; do not trust browser storage or client-side role claims. Keep an explicit owner-admin provisioning step if no administrator account has been assigned yet.
5. **Admin and store readiness** — Provide a protected review/settings surface for pending brand, contact, shipping, return, tax, and product information, and use Shopify's own admin for catalogue, stock, checkout, and order operations. Do not imply unsupported order/payment functions are ready. Keep customer checkout/order status in Shopify's trusted flow.
6. **Supporting content and safety** — Add only policy/about/contact copy that can be marked pending approval; no fabricated business details, testimonials, medical claims, ratings, or shipping promises. Document the required owner decisions, payment/shipping setup, and launch blockers.
7. **Verification** — Test storefront states, real Shopify product/cart interaction when products are available, auth/profile boundaries where credentials permit, responsive rendering, and production build. Report unverified or blocked flows honestly.

## Technical approach
- Keep TanStack Start and its file-based routing; use semantic design tokens in `src/styles.css` and existing UI controls.
- Use Shopify as source of truth for sellable products, inventory, and Shopify checkout; Storefront API version `2025-07` and its live development-store credentials.
- Use Lovable Cloud for app-owned sign-in and profile data; database tables require explicit grants, RLS, and server-side role checks. Never expose privileged credentials.
- Use the generated botanical image for the brand-led first screen and the supplied promotional JPGs only in the review inventory until approved.
- Do not add a custom payment processor, shipping promise, tax rule, or real-product data without owner verification.

## Pending owner inputs
Final product names/descriptions, actual prices and variants, stock, approved product imagery/claims, logo, business contact details, shipping/returns/tax policies, and first administrator identity. The development store is unclaimed; claiming is a separate owner decision.
