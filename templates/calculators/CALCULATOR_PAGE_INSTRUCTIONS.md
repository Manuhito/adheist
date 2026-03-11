# Calculator Page Instructions

## Reference calculator

Use `templates/calculators/facebook_ad_budget_calculator.html` as the canonical example when creating a new calculator page.

Do not invent a new page structure if the new calculator can follow that pattern.

## Goal

When creating a new calculator page, always implement:

- A Django template in `templates/calculators/`
- A Django view in `apps/web/views.py`
- A URL in `apps/web/urls.py`
- A sitemap entry in `apps/web/sitemaps.py`
- A calculator page layout consistent with the existing calculator pages
- A calculator script that survives the `base.html` page lifecycle

## Files to create or update

### 1) Template

Create a new file in:

- `templates/calculators/<calculator_name>.html`

Use `templates/calculators/facebook_ad_budget_calculator.html` as the main structural reference.

### 2) View

Add a Django view in:

- `apps/web/views.py`

Pattern:

- Create a function view for the calculator
- Prepare `logo_list` in the same style as the other calculators
- `return render(request, "calculators/<calculator_name>.html", {"logo_list": logo_list})`

### 3) URL

Register the page in:

- `apps/web/urls.py`

Pattern:

- `path("<calculator-slug>/", views.<calculator_view_name>, name="<calculator_view_name>")`

### 4) Sitemap

Register the calculator page in:

- `apps/web/sitemaps.py`

Pattern:

- Add `"web:<calculator_view_name>"` to `StaticViewSitemap.items()`

## Required page structure

The new calculator template should follow the same high-level layout as `facebook_ad_budget_calculator.html`.

Keep the same type of sections, adapted to the calculator topic.

### Required sections

#### 1) Hero / intro section

Include:

- Main title
- Short explanation of what the calculator does
- Short supporting paragraph

#### 2) Calculator section

Include:

- Input area
- Results area
- Error message area if the calculator can enter invalid states
- Labels and descriptions specific to the calculator topic

#### 3) Logo / trust section

Include the same kind of brand/logo block used in the existing calculators.

#### 4) Benefits / feature section

Include benefit cards or bullets adapted to the specific calculator theme.

#### 5) CTA section

Include a final call to action adapted to the topic, following the same visual pattern as the existing calculator pages.

## Input and calculation rules

This is the most important part.

The calculator logic must be implemented so it does not break when the page is rendered inside `templates/web/base.html`.

### Why this matters

`templates/web/base.html` renders Django content inside `#page-content`, and then the base React layout moves that content into `#page-content-mount` using `innerHTML`.

That means:

- The initial DOM can be recreated
- Event listeners attached too early can be lost
- A calculator may show an initial result but stop reacting to input changes

### Correct initialization pattern

For calculators rendered through `web/base.html`:

- Do not rely only on a plain early DOM lookup
- Wait until `window.baseLayoutReady` is true before binding calculator behavior
- After that, query the inputs/results from the final visible DOM
- Then attach listeners and run the first calculation

Use this pattern conceptually:

1. Wrap the script in an IIFE
2. Create an `initializeCalculator()` function
3. Inside it, fetch all calculator DOM nodes
4. Return early if required nodes do not exist
5. Prevent duplicate binding with a dataset flag if needed
6. Define parsing, formatting, validation, and calculation helpers
7. Attach listeners
8. Run the initial calculation
9. Create a `mountWhenReady()` function that waits for `window.baseLayoutReady`
10. Call `mountWhenReady()` from the IIFE

### Event handling pattern

Use the working style from the reference calculators, but bind only after the layout is ready.

Recommended rules:

- Track all relevant input IDs in one place
- Recalculate on both `input` and `change`
- Keep one calculation entry point such as `recalculate()`
- If one input determines which variable is authoritative, track `lastEdited`
- Use an `isSyncing` guard when setting input values programmatically

### Calculation rules

When implementing formulas:

- Keep one source of truth in `recalculate()`
- Read current values from the DOM each time
- Parse safely
- Clamp or normalize invalid numeric states where appropriate
- Validate impossible states explicitly
- Show clear error messages in the UI
- Update result fields every time after calculation
- Update input fields only when the calculator is supposed to derive values

### Validation rules

Always handle:

- Empty values
- Non-numeric values
- Negative values if not allowed
- Division by zero
- Inconsistent combinations of inputs
- Derived negative outputs that should be rejected

### Formatting rules

- Centralize number formatting in helper functions
- Keep formatting predictable and minimal
- Use integer formatting for count fields
- Use decimal formatting only where needed, such as percentages or currency

## Implementation checklist

For every new calculator, verify all of the following:

- Template created in `templates/calculators/`
- View added in `apps/web/views.py`
- URL added in `apps/web/urls.py`
- Sitemap entry added in `apps/web/sitemaps.py`
- Page sections follow the calculator reference layout
- Text and benefits are adapted to the new calculator theme
- Inputs have stable IDs
- Results have stable IDs
- The script waits for `window.baseLayoutReady`
- The script binds listeners only once
- The calculator recalculates on `input` and `change`
- The calculator handles invalid states cleanly
- Initial calculation runs after binding

## Preferred workflow for future requests

When asked to create a new calculator page in the future:

1. Read this file first
2. Use `templates/calculators/facebook_ad_budget_calculator.html` as the visual and structural reference
3. Create the new template with the same section pattern adapted to the new topic
4. Add the view in `apps/web/views.py`
5. Add the URL in `apps/web/urls.py`
6. Add the sitemap entry in `apps/web/sitemaps.py`
7. Implement calculation logic with a safe initialization pattern for `base.html`
8. Keep the logic minimal and avoid unnecessary abstractions

## Important constraint

Do not create a different architectural pattern for calculators unless the existing calculator pattern cannot support the requested behavior.

Default to the same Django template + inline page script approach used by the existing calculators.
