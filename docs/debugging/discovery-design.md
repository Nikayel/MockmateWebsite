# Debugging catalog: format discovery

The existing navbar, catalog header surface, type scale, theme tokens, result
cards, search, filters and saved list/card preference remain the visual base.
The standalone table prototype was rejected and is not the implementation.

The header now has ordinary route links for Practice rounds and Guided labs.
Small Lucide Bug and ListTree icons accompany the labels. One underline marks
the current collection, with `aria-current="page"`; these are links, not ARIA
tabs. Counts derive from the same registry as the results. On the narrowest
screens the secondary navigation counts are hidden; the collection progress
and result count remain available. Normal URL, reload and Back/Forward behavior
continues to work.

The two promotional banners are removed. Beta appears once next to Guided labs.
The cache incident remains second after the warm-up and carries an inline New
label until 16 November 2026, then keeps its existing Fix + extend cue. Filters
continue to control which pinned questions appear; nothing is injected into an
unmatched result set.

Guided lab cards use the same card and start action as the catalog, at full
width to accommodate an optional phase preview. A native details disclosure
shows the authored phases as a numbered list with small outlined circles. The
preview explains the investigation checklist and passing-test gates; it neither
unlocks anything nor starts a session. The saved rounds density is unaffected
by visiting labs, where the single full-width lab card has no density toggle.

## Research and library choice

- [NN/g: Icon Usability](https://www.nngroup.com/articles/icon-usability/) recommends text labels alongside potentially ambiguous symbols. Icons support the explicit format labels, and decorative SVGs are hidden from assistive technology.
- [NN/g: Icon Usability, When and How to Evaluate Digital Icons (2024)](https://www.nngroup.com/articles/how-to-test-digital-icons/) reports recognition and interpretation problems even for familiar shapes. This supports retaining words and testing icons in context, rather than assuming that an icon explains a lab.
- [NN/g: Proximity Principle](https://www.nngroup.com/articles/gestalt-proximity/) describes how nearby elements are perceived as a group. Format links sit together within the existing catalog header; phase numbers sit next to their titles.
- [NN/g: Banner Blindness](https://www.nngroup.com/articles/banner-blindness-old-and-new-findings/) reports that legitimate content can be overlooked when it resembles promotional material. The application here is a design inference, not a measured result about this product.
- [GOV.UK: Notification banner](https://design-system.service.gov.uk/components/notification-banner/) recommends placing directly task-relevant information in the main content. Guided labs are a persistent practice format rather than a temporary service notification.
- [Lucide React](https://lucide.dev/guide/react/) provides the SVG components already used throughout the application. Existing Lucide sizing and stroke conventions are retained, so there is no second icon family, font, animation package or dependency change.

Native links and details provide the needed behavior. Existing UI primitives
continue to own buttons, progress and other shared controls. More libraries do
not improve this particular interaction.

## Verification

Browser coverage checks current-format indication, real navigation into the
lab, URL Back/Forward, saved rounds density, keyboard phase disclosure, narrow
layouts, light/dark themes, reduced-motion presentation and the existing
search/company/language filters. The BookClub suite also runs the real Python
worker through all repair phases and final verification. Authentication and AI
scoring are outside these local fixtures.
