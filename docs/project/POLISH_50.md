# 50 improvements pass — 2026-07-08

Concrete polish items. Status: [x] done, [ ] queued.

**Progress (first pass, commit after ce20d00):** DONE — #1 custom 404, #2 error
page exit fixed, #3 home top bar (Marketplace/Sign in/Create account), #5 tab
titles (marketplace/buyer/storefront), #6 lazy images (marketplace cards,
detail thumbs), #7 aria-labels (partial), #11 active-filter chips, #12 URL sync
(?q&tab), #13 compare-bar names, #14 tab-aware result counts, #16 desktop
search autofocus, #20 Escape closes drawer, #21 breadcrumbs, #22 copy-link
share, #23 mobile sticky request bar, #24 lazy thumbs, #27 buyer chat
auto-scroll, #28 quote card links to listing, #29 section counts, #33 portal
"My storefront" link, #34 vendor chat auto-scroll, #35 leads "new" count,
#41 show/hide password (login+signup), #42 autofocus email, #46 expired certs
in red, #50 storefront trust footer. (26 of 50; rest queued.)

**Pass 2 (2026-07-09):** DONE — #30 buyer dashboard Refresh, #36 leads type
chip always shown (Quote fallback), #39 Seller Central nav (Profile/Leads/
Marketplace/Account), #44 friendly wrong-password copy, #47 review dates,
#48 badge tooltips, plus verified already-done #10/#15/#17/#18/#19/#31/#40/
#43/#45. (~41 of 50 complete; remaining are larger: #16-analytics-ish items,
#25 related-vendor names, #37 unsaved hint, #38 anchors, #49 terms page.)

## Global
1. [ ] Custom 404 page (branded, helpful links)
2. [ ] Global error page (friendly crash screen)
3. [ ] Home: top bar with Marketplace / Sign in / Create account
4. [ ] Home: footer links (marketplace, vendors, describe a need)
5. [ ] Per-page browser tab titles (marketplace, dashboards, storefront)
6. [ ] Lazy-load images across marketplace/storefront/detail
7. [ ] aria-labels on icon-only buttons
8. [ ] Consistent focus states on buttons/inputs
9. [ ] Reduced repaint: hover transforms only on pointer devices
10. [ ] Skip-to-content link kept working after layout change

## Marketplace
11. [ ] Active-filter chips row with one-click remove
12. [ ] Search + tab synced to the URL (shareable/back-button safe)
13. [ ] Compare bar shows the names of selected listings
14. [ ] Results count names the tab ("12 products")
15. [ ] Saved-only empty state message
16. [ ] Autofocus search on desktop
17. [ ] Card: whole image + name clickable (already) with visible hover
18. [ ] Sort keeps position when changing tabs
19. [ ] Vendor name link styled distinctly
20. [ ] Escape closes the mobile filter drawer

## Listing detail
21. [ ] Breadcrumb (Marketplace › Category › Name)
22. [ ] Copy-link share button
23. [ ] Sticky bottom "Request quote" bar on mobile
24. [ ] Lazy gallery thumbs
25. [ ] Related listings: show vendor name
26. [ ] Report link aria/label polish

## Buyer dashboard
27. [ ] Chat auto-scrolls to the newest message
28. [ ] Quote card title links to the listing
29. [ ] Section headers show counts
30. [ ] Refresh button
31. [ ] Stars input keyboard accessible
32. [ ] Empty dashboard: quick links styled as buttons

## Vendor side
33. [ ] Portal: "View my public storefront" link
34. [ ] Leads: chat auto-scroll
35. [ ] Leads: "new" count in the page heading
36. [ ] Leads: lead cards show request type chip always (fallback "Quote")
37. [ ] Portal: unsaved-changes hint near Save
38. [ ] Portal: section anchors (jump links)
39. [ ] Listings page: nav links to Portal / Leads / Account
40. [ ] Storefront empty sections hidden entirely (no blank headings)

## Login / signup
41. [ ] Show/hide password toggle (login, signup, reset)
42. [ ] Autofocus email on login/signup
43. [ ] Demo divider copy clarified
44. [ ] Better error copy for wrong password ("Check your password…")
45. [ ] Signup: business-type chips wrap nicely on mobile

## Trust & content
46. [ ] Storefront: certifications show expired state in red
47. [ ] Reviews: date shown
48. [ ] Badges: title tooltips explaining meaning
49. [ ] Disclosure link to vendor terms summary
50. [ ] Footer "Deals run through NXT//LINK" trust line on storefront
