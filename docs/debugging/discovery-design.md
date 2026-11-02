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
The first three independent rounds carry a Featured badge: the rate-limiter
outage (JavaScript/Python), cache cleanup, and comment-thread merging. They cover
exception boundaries, debugging across modules, and fix-efficiency trade-offs.
This editorial selection reflects the breadth of the authored exercises.
The shared `FEATURED_DEBUGGING_SCENARIO_IDS` list in
`scenario-discovery.ts` owns both order and labeling. Language variants inherit
curation through `variantGroup`, so switching the rate limiter to Python does not
lose its badge or create a fourth featured card.

Featured status remains visible alongside Solved, since curation and completion
are independent. The warm-up retains Start here and leads the remaining rounds;
all other relative ordering stays the same. Both catalog densities use the same
rule. The previous date-based New promotion is removed. Filters continue to
control which featured questions appear; nothing is injected into an unmatched
result set. Guided labs retain their own collection.

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
