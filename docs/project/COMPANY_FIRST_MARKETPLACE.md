# Company-first marketplace

The marketplace now follows one standard information hierarchy:

1. Company
2. Products and solutions
3. Proof and case studies
4. Industries served
5. Use cases
6. Specifications and comparison
7. Protected contact and quote flow

## Account profiles

Both buyers and vendors use a company profile.

Buyer profiles capture company name, industry, company type, location, solution interests, and desired outcomes. These fields become default marketplace filters.

Vendor profiles use the same standardized vocabulary so products and companies can be matched without relying on inconsistent raw categories.

## Marketplace routes

- `/marketplace`: unified company and product discovery
- `/company-profile`: buyer/vendor profile setup and personalization
- `/vendor/[id]`: company profile and product catalog
- `/products/[id]`: product specifications and comparison data
- `/vendors`: redirects to the unified marketplace

## Next implementation slices

- Persist company profiles to authenticated accounts instead of local storage.
- Add vendor-managed banner, logo, overview, products, case studies, industries served, and use cases.
- Link products to vendors with stable vendor IDs rather than company-name matching.
- Add request-for-quote and protected introduction workflows.
- Add product specification schemas by category.
- Add verified case studies and verified-purchase reviews.
