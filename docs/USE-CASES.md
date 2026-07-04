# Use Cases

> Documents **VantageMap V1 (MVP)**. Every use case below is achievable with features
> that actually ship in V1 — capability mapping, application portfolio analysis
> (TIME/6R), strategy scorecard, technology radar, roadmap planning, reporting, and
> governance workflows.

VantageMap serves Chief Strategy Officers, Business Architects, and Product Leaders.
The use cases are ordered from establishing a baseline to running governed change.

## 1. Build a business capability baseline

**Goal:** Establish a shared, three-level model of what the business does.

- Model capabilities as Domain (L1) → Area (L2) → Capability (L3) on the
  **Capabilities** map (`/capabilities`).
- Attach a health status and lifecycle phase to each capability.
- Relate applications and organisations to capabilities so you can see coverage.
- Use the **Capability Coverage** report (`/reports`) to find capabilities with no
  supporting applications ("white space").

## 2. Assess the application portfolio (TIME)

**Goal:** Decide what to Tolerate, Invest in, Migrate, or Eliminate.

- Maintain applications in the **Application Portfolio** (`/applications`) with
  lifecycle, business criticality, and technical/functional **fit scores**.
- Read the **TIME recommendations** in Reports — the engine (`src/lib/reports.ts`)
  suggests a TIME classification from the fit scores and explains the reason.
- Confirm or override the classification on each application's fact sheet.

## 3. Plan modernisation with 6R

**Goal:** Choose a disposition for each application under change.

- Classify applications with the **6R** scheme: Retire, Retain, Repurchase, Rehost,
  Replatform, Rearchitect.
- Review the **6R distribution** report to see the shape of the modernisation
  programme and how many applications remain unclassified.

## 4. Manage technical obsolescence risk

**Goal:** Get ahead of end-of-life technology.

- Track end-of-life / end-of-support dates on IT components.
- The **Obsolescence Risk** report ranks items by how soon they expire (Critical /
  High / Medium / Low), and the Dashboard's "Attention Needed" alert surfaces the most
  at-risk items.

## 5. Align strategy with a Balanced Scorecard

**Goal:** Connect objectives to the four strategic perspectives and to delivery.

- Capture strategic objectives on the **Strategy Map** (`/strategy`) across Financial,
  Customer, Internal Process, and Learning & Growth perspectives.
- Attach KPIs to objectives and relate initiatives that deliver them.
- See objective counts per perspective and the number of linked initiatives at a
  glance.

## 6. Plan and track the roadmap

**Goal:** Sequence initiatives over time and monitor delivery.

- Use the **Strategic Roadmap** (`/roadmap`) Gantt view to lay out initiatives with
  start/end dates and status (Not Started, In Progress, Completed, On Hold, Cancelled).
- Relate initiatives to the objectives, applications, and capabilities they affect, so
  the impact of a programme is explicit.

## 7. Curate the technology landscape (Tech Radar)

**Goal:** Communicate technology adoption guidance.

- Place technologies on the **Technology Radar** (`/radar`) by ring (Adopt, Trial,
  Assess, Hold) and quadrant (Techniques, Tools, Platforms, Languages & Frameworks).
- Use it as the reference for which technologies teams should adopt or retire.

## 8. Govern data quality (Quality Seal)

**Goal:** Ensure fact sheets are trustworthy before they inform decisions.

- Run the **Quality Seal** workflow (`/governance/quality-seal`): a Member submits a
  Draft for review; an Admin approves or rejects; a rejected sheet is revised back to
  Draft; an Approved sheet can be sent for re-review.
- Track how many fact sheets are Draft, Check Needed, Approved, or Rejected.

## 9. Run data-quality surveys

**Goal:** Crowdsource verification from data owners.

- Create surveys (`/governance/surveys`) with questions, and collect responses from
  stakeholders to validate or correct portfolio data.

## 10. Standardise tagging

**Goal:** Add consistent, faceted metadata across the inventory.

- Manage tag groups and tags (`/governance/tags`), choosing an on-the-fly, hybrid, or
  predefined-only mode per group.
- Apply tags to fact sheets and use them as facets in search and filtering.

## 11. Find anything, fast (Search)

**Goal:** Answer ad-hoc questions across the whole model.

- Use cross-entity **Search** (`/search`) with faceted filtering by entity type to
  locate capabilities, applications, objectives, initiatives, technologies, and more.

## 12. Report to leadership

**Goal:** Present portfolio health without exporting to slides by hand.

- The **Reports** screen and **Dashboard** provide portfolio-health scoring, TIME/6R
  distributions, obsolescence risk, and capability coverage — ready to share in
  reviews.

## 13. Integrate with other systems

**Goal:** Feed VantageMap data into pipelines and downstream tools.

- Issue an **API token** (`/admin/technical-users`) and call the REST API with a bearer
  token.
- Query relationships and entities via the **GraphQL** endpoint.
- Subscribe to **webhooks** for entity changes, or use **CSV import/export** for bulk
  data movement. (See [DEVELOPER.md](DEVELOPER.md).)

---

Features intentionally **not** in V1 — such as SSO/SCIM provisioning, custom roles, and
virtual/child workspaces — are on the post-MVP roadmap in [PLANV4.md](PLANV4.md).
