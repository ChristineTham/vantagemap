# VantageMap Data Model Reference

> Research basis: [SAP LeanIX EA Meta Model v4](https://help.sap.com/docs/leanix/ea/meta-model) — the industry best-practice EA model that VantageMap is inspired by.
> Last reviewed: April 2026

---

## 1. Overview

The SAP LeanIX Enterprise Architecture (EA) meta model provides a best-practice blueprint that has been validated across more than 1,000 enterprise customers. It defines the fundamental building blocks (called **documents**), their attributes, subtypes, and the typed relationships between them.

The meta model is **prescriptive**: using it as-is maximises consistency and long-term analytical value. Customisation is possible but may restrict future reporting and use-case scenarios.

### Meta Model Versions

| Version | Status                      | Notes                                                                       |
| ------- | --------------------------- | --------------------------------------------------------------------------- |
| v4      | Current (new workspaces)    | Adds Platform document, renames several types, adds richer subtypes       |
| v3      | Legacy (existing customers) | Project → Initiative, User Group → Organization, Process → Business Context |

VantageMap is modelled on **v4**.

---

## 2. Architecture Layers

The meta model organises all document types into four conceptual layers. These layers are for human comprehension only — they impose no technical separation in the product.

```
┌──────────────────────────────────────────────────────────┐
│           STRATEGY & TRANSFORMATION (cross-cutting)       │
│           Objective · Platform · Initiative               │
├─────────────────────────┬────────────────────────────────┤
│  BUSINESS ARCHITECTURE  │  APPLICATION & DATA ARCH.      │
│  Organization           │  Data Object                   │
│  Business Capability    │  Application                   │
│  Business Context       │  Interface                     │
├─────────────────────────┴────────────────────────────────┤
│              TECHNICAL ARCHITECTURE                       │
│           Provider · IT Component · Tech Category        │
│           System (optional)                              │
└──────────────────────────────────────────────────────────┘
```

| Layer                           | Document Types                                    | Purpose                                                        |
| ------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| Strategy & Transformation       | Objective, Platform, Initiative                     | Goals, groupings, and planned changes — spans all other layers |
| Business Architecture           | Organization, Business Capability, Business Context | What the business does and who does it                         |
| Application & Data Architecture | Data Object, Application, Interface                 | Software systems, the data they handle, and how they connect   |
| Technical Architecture          | Provider, IT Component, Tech Category, System\*     | The technology that applications depend on                     |

\*System is an optional document type — activate if needed.

---

## 3. Document Types

There are **12 default document types** plus 1 optional. Each is described in detail below.

---

### 3.1 Objective

**Layer:** Strategy & Transformation  
**Purpose:** Capture what the organisation aims to achieve. Objectives drive initiatives that improve business capabilities and transform the IT landscape.

#### Key Attributes

- Name, description
- Objective type (financial, customer, internal process, learning & growth — aligns to Balanced Scorecard perspectives)
- Progress / KPIs
- Owner

#### Key Relations

| Relation                        | Direction    | Notes                                                   |
| ------------------------------- | ------------ | ------------------------------------------------------- |
| Objective → Business Capability | supports     | Objectives link to the capabilities they aim to improve |
| Objective → Initiative          | driven by    | Initiatives are created to achieve objectives           |
| Objective → Platform            | supported by | Platforms can support objectives                        |
| Objective → Organization        | owned by     | An org unit owns the objective                          |

#### Hierarchy

Objectives can have parent-child relationships to model objective hierarchies (e.g., strategic goals → sub-goals).

---

### 3.2 Platform

**Layer:** Strategy & Transformation  
**Purpose:** A business or IT grouping of capabilities, applications, and technologies that provide common/consistent functionalities. Bridges C-level language with EA taxonomy.  
_(New in v4 — was not present in v3.)_

**Two meanings of Platform in practice:**

1. **Business platform** — groups business capabilities, applications, and technologies providing common business functionality (e.g., "B2B e-commerce platform")
2. **IT platform** — groups IT components and applications providing common infrastructure (e.g., "SAP BTP", "Windows Client platform")

#### Key Attributes

- Name, description
- Owner
- Lifecycle

#### Key Relations

| Relation                       | Direction             | Notes                                                 |
| ------------------------------ | --------------------- | ----------------------------------------------------- |
| Platform → Application         | contains / is used by | Applications and microservices consuming the platform |
| Platform → Business Capability | supports              | Capabilities that the platform underpins              |
| Platform → IT Component        | contains              | Technical building blocks of the platform             |
| Platform → Initiative          | in scope of           | Initiatives impacting the platform                    |
| Platform → Objective           | supports              | Objectives the platform contributes to                |

#### Best Practices

- Model platforms only when "platform" is a concept used by your C-Suite
- Keep the number of platforms small (no deep hierarchy)
- Platforms answer _strategic grouping_ questions — not the same as tech categories

---

### 3.3 Initiative

**Layer:** Strategy & Transformation  
**Purpose:** Document planned projects or programs that impact enterprise architecture and aim to achieve specific goals.  
_(Renamed from "Project" in v4.)_

#### Subtypes

| Subtype     | Description                                                    | Example                                      |
| ----------- | -------------------------------------------------------------- | -------------------------------------------- |
| **Idea**    | Changes under consideration, not yet formally planned          | "Scenario A – ERP Greenfield Implementation" |
| **Program** | Group of related projects/epics aimed at a strategic objective | "Cloud Transformation Program"               |
| **Project** | Formally planned work item; ideally synced with a PPM tool     | "Wave 1 – Rehost Project"                    |
| **Epic**    | Agile execution unit; ideally synced with Jira or similar      | "Messaging integration for Customer Support" |

#### Key Attributes

- Name, description, status
- Start date, end date
- Budget
- Owner

#### Key Relations

| Relation                         | Direction             | Notes                                           |
| -------------------------------- | --------------------- | ----------------------------------------------- |
| Initiative → Application         | impacts / is in scope | Applications being created, changed, or retired |
| Initiative → Business Capability | improves              | Capabilities targeted by the initiative         |
| Initiative → Business Context    | impacts               | Processes/products affected                     |
| Initiative → IT Component        | impacts               | Technology changes                              |
| Initiative → Objective           | supports              | The objective the initiative advances           |
| Initiative → Organization        | assigned to           | Which org units are responsible or affected     |
| Initiative → Platform            | impacts               | Platforms being introduced or transformed       |
| Initiative → Initiative          | parent/child          | Program → Project → Epic hierarchy              |

#### Best Practices

- SAP LeanIX is **not** a project management tool — keep initiatives at level 2–3 max
- Use integrations (Jira, monday.com) for detailed task tracking
- Use roadmap reports to visualise initiative timelines and impacts

---

### 3.4 Organization

**Layer:** Business Architecture  
**Purpose:** Model the hierarchical business architecture — departments, teams, geographies, and legal entities.  
_(Renamed from "User Group" in v4.)_

Represents _who uses_ the applications. Essential for all use cases from the start.

#### Subtypes

| Subtype           | Description                                                | Example                     |
| ----------------- | ---------------------------------------------------------- | --------------------------- |
| **Business Unit** | Distinct division within a larger organisation             | "Retail", "Finance"         |
| **Customer**      | Customer groups or segments with similar needs             | "Buyer Persona"             |
| **Region**        | Geographical division                                      | "Europe", "Europe / France" |
| **Legal Entity**  | Organisation recognised by law as a distinct entity        | "SAP LeanIX SARL"           |
| **Team**          | Group of users; typically part of business units/countries | "Team Igniteus"             |

#### Key Attributes

- Name, description
- Level in hierarchy (1–3 recommended)
- Owner

#### Key Relations

| Relation                           | Direction                     | Notes                                                |
| ---------------------------------- | ----------------------------- | ---------------------------------------------------- |
| Organization → Application         | uses                          | Which apps this org unit uses                        |
| Organization → Business Capability | owns / is responsible for     | Which capabilities this org owns                     |
| Organization → Initiative          | responsible for / affected by | Transformation planning                              |
| Organization → Objective           | owns                          | An org unit owns and is accountable for an objective |

#### Hierarchy

Self-referential parent/child. Typical example:

- Level 1: Europe
- Level 2: Western Europe
- Level 3: Netherlands

#### Best Practices

- Choose max **two** subtypes (dimensions) to keep data manageable
- 5–10 items on level 1 is a good target
- Do **not** model data centres as organisations (use IT Components)
- 2–3 hierarchy levels is a good practical limit

---

### 3.5 Business Capability

**Layer:** Business Architecture  
**Purpose:** Model what the business _does_ — the fundamental abilities needed to deliver value, support objectives, and execute the business model. Technology-agnostic and stable over time.

Business capabilities are defined in **business terms** (not IT terms) and serve as the common language between business and IT.

#### Key Attributes

- Name, description
- Level (1 = top-level, 2 = sub-capability, 3 = detailed)
- Owner
- Maturity
- Strategic Importance
- Lifecycle (optional)

#### Key Relations

| Relation                                  | Direction          | Notes                                    |
| ----------------------------------------- | ------------------ | ---------------------------------------- |
| Business Capability → Application         | supported by       | Which apps support this capability       |
| Business Capability → Objective           | drives / linked to | Objectives that target this capability   |
| Business Capability → Business Context    | related to         | Activities that exercise this capability |
| Business Capability → Initiative          | improved by        | Initiatives targeting this capability    |
| Business Capability → Platform            | supported by       | Platforms underpinning this capability   |
| Business Capability → Organization        | owned by           | Which org unit is responsible            |
| Business Capability → Business Capability | parent/child       | Hierarchical breakdown                   |

#### Hierarchy Example

```
Level 1: Customer Management
  Level 2: Customer Acquisition
  Level 2: Customer Retention
    Level 3: Loyalty Programme Management
Level 1: Financial Management
  Level 2: Financial Planning & Analysis
  Level 2: Accounts Payable
```

#### Best Practices

- 7–10 Level 1 capabilities (up to 20 for complex organisations)
- Maximum **3 levels** deep for most EA purposes
- Capabilities are **mutually exclusive** — each Level-2 capability belongs to exactly one Level-1 capability
- Capabilities answer _"What does the business do?"_ — not _"How?"_ (that's Business Context) or _"Who?"_ (Organisation)
- Lifecycle use is optional — use when reflecting strategic capability changes (M&A, divestiture, planned retirement)

#### Common Antipatterns

- Confusing Business Capability with Process (capability = _what_, process = _how_)
- Confusing Business Capability with Organisation (an org unit performs a capability, but they are separate)
- Confusing Business Capability with Tech Category (tech categories group IT components)

---

### 3.6 Business Context

**Layer:** Business Architecture  
**Purpose:** Describe the specific activities an organisation performs to achieve its business goals. More granular than business capabilities; can represent processes, value streams, products, or customer journeys.  
_(Renamed from "Process" in v4, with multiple subtypes added.)_

#### Subtypes

| Subtype                         | Description                                                              | Example                                                   |
| ------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| **Business Product**            | Products or services offered to customers                                | "Life insurance", "Mobile banking app"                    |
| **Customer Journey**            | End-to-end customer experience lifecycle                                 | "Online Purchase Journey", "Career Development Framework" |
| **Process**                     | Step-by-step operational activities and workflows                        | "Create Purchase Order", "Hire to Retire"                 |
| **Value Stream**                | Sequence of activities to produce value for a customer (inside-out view) | "Hire to Retire", "Source to Pay"                         |
| **ESG Capability** _(optional)_ | Environmental, social, and governance capability                         | "Energy Efficiency Management"                            |

#### Key Attributes

- Name, description
- Subtype (see above)
- Level / hierarchy
- Owner

#### Key Relations

| Relation                               | Direction    | Notes                                   |
| -------------------------------------- | ------------ | --------------------------------------- |
| Business Context → Application         | supported by | Which apps enable this activity         |
| Business Context → Business Capability | related to   | Capability that this activity exercises |
| Business Context → Initiative          | impacted by  | Initiatives affecting these activities  |
| Business Context → Business Context    | parent/child | Process hierarchy                       |
| Business Context → Organization        | performed by | Who performs this activity              |

#### Best Practices

- Choose **at most two** subtypes (dimensions) per workspace to limit maintenance burden
- Let the primary EA use case and your C-level language guide subtype choice (e.g., B2C companies → Customer Journey; manufacturing → Value Stream + Process)
- If you use SAP Signavio for BPM, leverage the out-of-the-box integration to sync process data
- Don't try to do detailed BPMN process modelling in LeanIX — use a dedicated BPM tool for that

#### Common Antipatterns

- Mixing Business Context with Business Capability
- Using SAP LeanIX diagrams as a substitute for a proper BPMN/BPM tool

---

### 3.7 Data Object

**Layer:** Application & Data Architecture  
**Purpose:** Represent high-level business data entities processed and exchanged by applications. Captures the business view of data (not database schemas).

Examples: Customer, Order, Contract, Employee, Invoice.

#### Key Attributes

- Name, description
- Data classification / sensitivity
- Owner

#### Key Relations

| Relation                  | Direction              | Notes                                                |
| ------------------------- | ---------------------- | ---------------------------------------------------- |
| Data Object → Application | managed / processed by | Which apps create, read, update, or delete this data |
| Data Object → Interface   | exchanged via          | Interfaces that transfer this data object            |

#### Hierarchy

Data objects support parent/child hierarchy for grouping related types.

---

### 3.8 Application

**Layer:** Application & Data Architecture  
**Purpose:** Software systems or programs that process or analyze business data to support business tasks or aspects of the organisation's business model. **Central entity** in the meta model — applications link business and IT.

Examples: SAP S/4HANA, Salesforce, Workday, Confluence, Zoom, custom-built ERP.

#### Key Attributes

- Name, description
- Release / version
- Lifecycle status (Plan → Phase In → Active → Phase Out → End of Life)
- Technical fit (Insufficient → Adequate → Full)
- Functional fit (Insufficient → Adequate → Full)
- Business criticality
- IT ownership
- Portfolio strategy: Gartner TIME classification (Tolerate / Invest / Migrate / Eliminate), 6R Framework (Retire / Retain / Re-purchase / Re-host / Re-platform / Re-architect)

#### Subtypes (all optional, not default)

| Subtype                  | Description                                                          | Notes                                                                                          |
| ------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Business Application** | Logical application (COTS, open-source, or custom-built)             | Use when microservices or AI agents are also modelled, to distinguish the two layers           |
| **Microservice**         | Individually deployable functional component of a larger application | Optional feature; requires Business Application subtype to be present; not counted for pricing |
| **AI Agent**             | Autonomous AI system using LLMs to reason and act                    | Added via the AI Agent extension to the meta model                                             |

#### Key Relations

| Relation                          | Direction                                                       | Notes                                                                              |
| --------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Application → Business Capability | supports                                                        | The capabilities this app enables                                                  |
| Application → Organization        | used by                                                         | Org units that use the app (Usage Type: e.g., Responsible, Accountable, Consulted) |
| Application → Business Context    | is used in                                                      | Processes/value streams/products the app participates in                           |
| Application → Interface           | provides (as interface provider) / uses (as interface consumer) | How it connects to other apps                                                      |
| Application → Data Object         | processes / manages                                             | Data entities the app handles                                                      |
| Application → IT Component        | runs on / depends on                                            | Technical dependencies; cost captured on this relation                             |
| Application → Platform            | belongs to                                                      | Platform grouping                                                                  |
| Application → Initiative          | impacted by / in scope                                          | Changes to this app                                                                |
| Application → Application         | parent/child                                                    | Suite → individual app hierarchy                                                   |

#### Lifecycle Values

| Phase       | Meaning                                    |
| ----------- | ------------------------------------------ |
| Plan        | Planned but not yet in use                 |
| Phase In    | Being rolled out                           |
| Active      | Fully operational                          |
| Phase Out   | Being retired; replacement being rolled in |
| End of Life | No longer in use                           |

#### Best Practices

- Start with **logical applications** (not microservices) for initial application portfolio work
- SaaS services are modelled as applications; use the **reference catalog** to auto-populate IT components and providers
- Use **parent/child** for suites (e.g., Adobe Creative Cloud → Adobe Photoshop)
- Track cost on the Application → IT Component relation, not directly on the application
- To link to a provider, you must model an IT component first (no direct app → provider relation)
- Model **external applications** critical to your architecture as individual documents; use a single composite "External Application" for minor external integrations

#### Common Antipatterns

- Confusing Application with IT Component (application has data + logic + presentation layers; IT component does not)
- Tracking patch-level software versions (rarely adds value)
- Linking apps directly to providers (bypassing IT Components breaks provider cost reporting)

---

### 3.9 Interface

**Layer:** Application & Data Architecture  
**Purpose:** Model connections between applications — how data exchange occurs between them. Takes a **business-oriented (logical) view**, not a low-level technical one.

#### Subtypes

| Subtype               | Description                                                                            | Example                     |
| --------------------- | -------------------------------------------------------------------------------------- | --------------------------- |
| **Logical Interface** | Conceptual view of data/service flow; no implementation details                        | "SAP LeanIX → SAP Signavio" |
| **API**               | Technical endpoint enabling system-to-system integration or microservice communication | "Metrics API", "Import API" |
| **MCP Server**        | Managed communication endpoint for AI applications using Model Context Protocol        | "Microsoft Graph FastMCP"   |

#### Key Attributes

- Name, description
- Data flow direction (Incoming / Outgoing / Bi-Directional)
- Frequency / transfer type
- Connection method (custom field)
- Provider application (owns and manages the interface)
- Consumer application(s) (uses the interface; may be multiple)
- MCP-specific: endpoint URL, authentication protocol, server classification, authorized tools, server type

#### Key Relations

| Relation                 | Direction                         | Notes                                     |
| ------------------------ | --------------------------------- | ----------------------------------------- |
| Interface → Application  | provided by (1) / consumed by (n) | One provider, multiple possible consumers |
| Interface → Data Object  | transfers                         | What data this interface exchanges        |
| Interface → IT Component | implemented via                   | Middleware, ESB, or integration platform  |

#### Provider vs. Consumer

- **Provider**: owns the interface and is responsible for change management. Each interface has **exactly one** provider.
- **Consumer**: uses the interface but doesn't manage it. An interface can have **multiple** consumers.

(Note: these roles relate to ownership, **not** to the direction of data flow.)

#### Modeling Middleware (e.g., MuleSoft, Dell Boomi)

Model the integration platform as an IT Component document, then link it to the interface. The interface remains between the applications (not between apps and middleware).

---

### 3.10 Provider

**Layer:** Technical Architecture  
**Purpose:** Represent companies or entities that supply IT solutions, services, or technologies. Capture third-party responsibility for hosting, maintaining, or changing applications and IT components.

Examples: Amazon Web Services (AWS), Microsoft Azure, SAP, Oracle, Accenture.

#### Key Attributes

- Name, description
- Legal registration / location
- Contact details
- Contract / SLA information

#### Key Relations

| Relation                | Direction   | Notes                                           |
| ----------------------- | ----------- | ----------------------------------------------- |
| Provider → IT Component | provides    | IT components supplied by this provider         |
| Provider → Initiative   | involved in | Providers executing or coordinating initiatives |

**Important note**: There is no direct Application → Provider relationship in the standard meta model. To link an application to its provider, you must model an IT Component as the intermediary.

---

### 3.11 IT Component

**Layer:** Technical Architecture  
**Purpose:** Represent the technology (software and hardware) or services that applications depend on — both for development and operations. Used for obsolescence risk management, operating cost modelling, and technology standards governance.

IT components are **building blocks** that run, maintain, and change applications. They do **not** directly support business capabilities.

#### Subtypes

| Subtype      | Description                                                        | Examples                                                                                   |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| **Hardware** | Physical components of a computer system                           | IBM z15, HP ProLiant, NetApp AFF A900, server racks                                        |
| **IaaS**     | Infrastructure as a Service (virtualised computing over internet)  | AWS EC2, Azure Virtual Machines, Google Compute Engine                                     |
| **PaaS**     | Platform as a Service (cloud platform for building/deploying apps) | Google App Engine, Heroku, Salesforce (PaaS)                                               |
| **SaaS**     | Software as a Service (cloud application on subscription basis)    | Confluence (as an IT component for its hosting aspect), SAP LeanIX                         |
| **Service**  | Managed IT services, maintenance, support                          | Accenture Application Support, Nordcloud AWS Hosting, Public Cloud Transformation services |
| **Software** | Commercial or open-source software products applications rely on   | Microsoft .NET Framework 4.8, Chrome, Windows Server 2022                                  |
| **AI Model** | AI/ML software components (LLMs, image generation, etc.)           | OpenAI GPT-4o, Google Gemini, Microsoft Phi                                                |

_Note: SaaS as an IT Component subtype represents the **hosting aspect** of a SaaS service (not the application itself, which is modelled as an Application document)._

#### Key Attributes

- Name, description
- Lifecycle (Plan → Active → End of Life / End of Support)
- Version / release
- Technical standard (Approved / Approved with constraints / Deprecated)
- Location / data centre
- Cost (annual operating costs — captured on the Application → IT Component relation)

#### Key Relations

| Relation                     | Direction            | Notes                                               |
| ---------------------------- | -------------------- | --------------------------------------------------- |
| IT Component → Application   | runs                 | Application that depends on this component          |
| IT Component → Provider      | offered by           | Which provider supplies this component              |
| IT Component → Tech Category | classified in        | Logical grouping of this component                  |
| IT Component → Interface     | implements           | Interfaces that rely on this component (middleware) |
| IT Component → Platform      | belongs to           | Platform grouping                                   |
| IT Component → IT Component  | requires/required by | Technical dependencies (e.g., server requires OS)   |
| IT Component → Initiative    | impacted by          | Technology changes                                  |

#### Best Practices

- You don't need IT components for initial application portfolio work; add them when you need cost/risk/hosting analysis
- Use the **reference catalog** for SaaS apps to auto-create IT component and provider documents
- Model IT components at a **strategic level** — not patch-level detail
- Normalise IT component names before importing (standardise versions/naming)
- Group IT components into tech categories for contextual reporting
- Start lean: import only IT components actually needed for your current use case

#### Common Antipatterns

- Importing too many IT components (maintenance overhead)
- Tracking patch-level software versions
- Confusing SaaS (IT Component subtype for hosting) with SaaS applications (Application document)
- Importing all CMDB instances without filtering

---

### 3.12 Tech Category

**Layer:** Technical Architecture  
**Purpose:** Group IT components into standardised technology categories (e.g., Database, Data Warehouse, Networked Storage, Hosting / Operations). Enables identification of redundant or end-of-life IT components and governance of technology stacks.

Tech categories are **relatively stable across organisations** — they reflect types of technology, not specific vendors or products.

Examples: Database → Relational Database; Hosting / Operations; Programming Language; Container Orchestration.

#### Key Attributes

- Name, description
- Level in hierarchy
- Owner / governance responsible

#### Key Relations

| Relation                      | Direction    | Notes                          |
| ----------------------------- | ------------ | ------------------------------ |
| Tech Category → IT Component  | classifies   | IT components in this category |
| Tech Category → Tech Category | parent/child | Hierarchical grouping          |

#### Hierarchy Example

```
Level 1: Database
  Level 2: Relational Database
  Level 2: NoSQL Database
  Level 2: In-Memory Database
Level 1: Hosting / Operations
  Level 2: Public Cloud
  Level 2: Private Cloud
  Level 2: On-Premises
```

#### Best Practices

- Use the SAP LeanIX TBM Taxonomy as a starting reference (industry standard)
- 2–3 levels deep is sufficient for most EA practices

---

### 3.13 System _(Optional)_

**Layer:** Technical Architecture  
**Purpose:** Represent the technical environment underlying applications — for example, a server or virtual machine with its operating system, database, and runtime configurations.

Systems are supported by IT components. This document type is relevant when you need to model the specific runtime instances of your applications (e.g., when integrating with ServiceNow CMDB data about application services).

Activate this document type only when needed for your use case.

---

## 4. Relationships

### 4.1 Types of Relationships

| Type                       | Description                                                        | Use Case                                                                                |
| -------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **Explicit (typed)**       | Named, directed relationships between two document types         | Most relationships in the meta model (e.g., "Application supports Business Capability") |
| **Parent / Child**         | Hierarchical structures within a single document type            | Business Capability hierarchy, Organisation hierarchy, Initiative hierarchy             |
| **Requires / Required By** | Logical or technical dependencies                                  | IT Component → Server requires OS; Data Object → Application dependencies               |
| **Transitive**             | Inferred indirect connections via chains of existing relationships | Level-2 capability inherits relations of Level-1 parent for filtering and reporting     |

### 4.2 Explicit Relation Attributes

Some explicit relations carry their own attributes. Key examples:

| Relation                   | Attribute          | Notes                                               |
| -------------------------- | ------------------ | --------------------------------------------------- |
| Application → IT Component | Total annual costs | Capture operating costs at the relation level       |
| Application → Data Object  | Usage (CRUD)       | Create / Read / Update / Delete                     |
| Application → Organization | Usage Type         | Responsible, Accountable, Consulted, Informed, etc. |
| Interface → Data Object    | Data direction     | Specifies what data is being exchanged              |

### 4.3 Master Relation Map

The diagram below shows all key relationships in the meta model v4:

```
           OBJECTIVE
           ↑    ↑
    linked  |    |  supports
           |    |
        PLATFORM  ←── contains ─── APPLICATION ──→ BUSINESS CAPABILITY
           |              ↑ ↑             ↑               ↑
       IT COMPONENT used by  supports   supports      owned by
           ↑   ↓        |        ↑   BUSINESS CONTEXT  ORGANIZATION
      provided by  linked     used by       ↑                ↑
        PROVIDER   INITIATIVE ─→ improved → |          uses APPLICATION
                       ↑                DATA OBJECT
                   supports          ↑         ↑
                   OBJECTIVE     managed    transferred
                                   by           via
                             APPLICATION     INTERFACE
                                              ↑  ↑
                                        provided  implemented
                                             by       via
                                        APPLICATION  IT COMPONENT
```

### 4.4 Relation Summary by Document

| Document          | Relates TO          | Via relation                         |
| ------------------- | ------------------- | ------------------------------------ |
| Application         | Business Capability | supports                             |
| Application         | Organization        | used by                              |
| Application         | Business Context    | used in                              |
| Application         | Interface           | provides / consumes                  |
| Application         | Data Object         | processes / manages                  |
| Application         | IT Component        | runs on / depends on                 |
| Application         | Platform            | belongs to                           |
| Application         | Initiative          | in scope of                          |
| Application         | Application         | parent/child (suite → module)        |
| Business Capability | Application         | supported by                         |
| Business Capability | Objective           | drives / linked to                   |
| Business Capability | Initiative          | improved by                          |
| Business Capability | Business Context    | related to                           |
| Business Capability | Organization        | owned by                             |
| Business Capability | Business Capability | parent/child                         |
| Business Context    | Application         | supported by                         |
| Business Context    | Business Capability | related to                           |
| Business Context    | Organization        | performed by                         |
| Business Context    | Initiative          | impacted by                          |
| Business Context    | Business Context    | parent/child                         |
| Initiative          | Application         | impacts                              |
| Initiative          | Business Capability | improves                             |
| Initiative          | Business Context    | impacts                              |
| Initiative          | IT Component        | impacts                              |
| Initiative          | Objective           | supports                             |
| Initiative          | Organization        | assigned to                          |
| Initiative          | Platform            | impacts                              |
| Initiative          | Initiative          | parent/child (program → project)     |
| IT Component        | Application         | supports (runs)                      |
| IT Component        | Provider            | offered by                           |
| IT Component        | Tech Category       | classified in                        |
| IT Component        | Interface           | implements                           |
| IT Component        | Platform            | belongs to                           |
| IT Component        | IT Component        | parent/child or requires/required by |
| Interface           | Application         | provided by (1) / consumed by (n≥0)  |
| Interface           | Data Object         | transfers                            |
| Interface           | IT Component        | implemented via                      |
| Objective           | Business Capability | linked to                            |
| Objective           | Initiative          | drives                               |
| Objective           | Platform            | supported by                         |
| Objective           | Organization        | owned by                             |
| Platform            | Application         | contains                             |
| Platform            | Business Capability | supports                             |
| Platform            | IT Component        | contains                             |
| Platform            | Initiative          | in scope of                          |
| Platform            | Objective           | supports                             |
| Provider            | IT Component        | provides                             |
| Provider            | Initiative          | involved in                          |
| Tech Category       | IT Component        | classifies                           |
| Tech Category       | Tech Category       | parent/child                         |
| Data Object         | Application         | processed / managed by               |
| Data Object         | Interface           | transferred via                      |
| Organization        | Application         | uses                                 |
| Organization        | Business Capability | owns                                 |
| Organization        | Initiative          | responsible for                      |
| Organization        | Objective           | owns                                 |

---

## 5. Document Subtypes — Complete Reference

| Document Type  | Subtype              | Default/Optional                        |
| ---------------- | -------------------- | --------------------------------------- |
| Application      | Business Application | Optional                                |
| Application      | Microservice         | Optional                                |
| Application      | AI Agent             | Optional                                |
| Business Context | Customer Journey     | Default                                 |
| Business Context | Process              | Default                                 |
| Business Context | Business Product     | Default                                 |
| Business Context | Value Stream         | Default                                 |
| Business Context | ESG Capability       | Optional                                |
| Initiative       | Idea                 | Default                                 |
| Initiative       | Program              | Default                                 |
| Initiative       | Project              | Default                                 |
| Initiative       | Epic                 | Default                                 |
| Interface        | API                  | Default                                 |
| Interface        | Logical Interface    | Default                                 |
| Interface        | MCP Server           | Default                                 |
| IT Component     | SaaS                 | Default                                 |
| IT Component     | IaaS                 | Default                                 |
| IT Component     | PaaS                 | Default                                 |
| IT Component     | Software             | Default                                 |
| IT Component     | Hardware             | Default                                 |
| IT Component     | Service              | Default                                 |
| IT Component     | AI Model             | Default (new workspaces after Oct 2025) |
| Organization     | Business Unit        | Default                                 |
| Organization     | Customer             | Default                                 |
| Organization     | Region               | Default                                 |
| Organization     | Legal Entity         | Default                                 |
| Organization     | Team                 | Default                                 |
| System           | —                    | Optional document type                |

---

## 6. Common EA Modeling Patterns

### 6.1 Application Lifecycle & Rationalization

Link Applications to Business Capabilities and Organizations, then use lifecycle and fit scores (Technical Fit, Functional Fit) to identify:

- Redundant applications supporting the same capability
- End-of-life applications still in use
- Applications with poor fit scores as candidates for rationalization

Key documents: Application, Business Capability, Organization, IT Component

### 6.2 Technology Risk (Obsolescence)

Model IT Components with lifecycle data and link them to providers via the tech category grouping. Flag EOL/EOS dates to surface infrastructure risk.

Key documents: IT Component, Provider, Tech Category, Application

### 6.3 Strategic Portfolio Planning

Link Initiatives to Objectives, Business Capabilities, and Applications. Use the roadmap report to show transformation timelines.

Key documents: Initiative, Objective, Application, Business Capability, Platform

### 6.4 Integration Architecture

Model Interfaces between Applications, capturing the data objects exchanged and the IT components (middleware) that implement each interface.

Key documents: Interface, Application, Data Object, IT Component

### 6.5 Organisation Application Mapping

Link Organizations to Applications (used by relation). Use the matrix report to show which applications are used across regions or business units — identifies rationalization potential.

Key documents: Organization, Application, Business Capability

---

## 7. Meta Model v4 vs v3: Key Changes

| v3 Document       | v4 Document       | Change                                                                                                             |
| ------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| (not present)       | Platform            | **New**                                                                                                            |
| Project             | Initiative          | Renamed; subtypes added (Idea, Program, Project, Epic)                                                             |
| User Group          | Organization        | Renamed; subtypes added (Business Unit, Customer, Region, Legal Entity, Team)                                      |
| Process             | Business Context    | Renamed; subtypes added (Business Product, Customer Journey, Process, Value Stream, ESG Capability)                |
| Business Capability | Business Capability | Added Maturity and Strategic Importance fields as default                                                          |
| Application         | Application         | Added Portfolio Strategy section (Gartner TIME, 6R Framework); subtypes added (Business Application, Microservice) |
| Interface           | Interface           | Subtypes added (Logical Interface, API)                                                                            |
| IT Component        | IT Component        | Subtypes added (IaaS, PaaS, SaaS)                                                                                  |

---

## 8. Relationship to VantageMap

VantageMap is modelled on a simplified subset of the LeanIX EA meta model, focused on the views most relevant to Chief Strategy Officers, Business Architects, and Product Leaders.

| VantageMap View                   | LeanIX Equivalent Documents                     |
| --------------------------------- | ------------------------------------------------- |
| Dashboard                         | Summary across all document types               |
| Business Capability Map           | Business Capability                               |
| Application Portfolio             | Application, Organization, IT Component (partial) |
| Strategy Map (Balanced Scorecard) | Objective, Initiative, Business Capability        |
| Technology Radar                  | IT Component, Tech Category, Provider             |
| Strategic Roadmap                 | Initiative, Application, Business Capability      |

The VantageMap data model (`src/lib/data.ts`) maps to LeanIX documents as follows:

| VantageMap Type              | LeanIX Document            | Implemented     |
| ---------------------------- | ---------------------------- | --------------- |
| `BusinessCapability`         | Business Capability          | ✅              |
| `Application`                | Application                  | ✅ (simplified) |
| `StrategicObjective` + `KPI` | Objective                    | ✅ (simplified) |
| `Initiative`                 | Initiative                   | ✅              |
| `TechEntry`                  | IT Component + Tech Category | ✅ (merged)     |
| `Interface`                  | Interface                    | ✅              |
| `DataObject`                 | Data Object                  | ✅              |
| `Organization`               | Organization                 | ✅              |
| `Provider`                   | Provider                     | ✅              |
| `Platform`                   | Platform                     | ✅              |
| `BusinessContext`            | Business Context             | ⚠️ schema only  |

`Interface`, `DataObject`, `Organization`, `Provider`, and `Platform` are now fully
implemented: each has a Drizzle table in `src/db/schema/`, a REST route group under
`src/app/api/` (`/api/interfaces`, `/api/data-objects`, `/api/organizations`,
`/api/providers`, `/api/platforms`), and a GraphQL type in `src/lib/graphql-schema.ts`
(the Interface type is named `InterfaceFS` to avoid clashing with the GraphQL reserved
word).

`BusinessContext` is defined in `documentTypeEnum` and has a database table
(`business_contexts`), and it appears in seed data, but it does **not** yet have a
dedicated REST route or GraphQL type. It remains schema-only for V1 — see
[docs/PLANV4.md](PLANV4.md) for the post-MVP roadmap.

---

## 9. References

- [SAP LeanIX Meta Model (v4)](https://help.sap.com/docs/leanix/ea/meta-model)
- [Documents Overview](https://help.sap.com/docs/leanix/ea/documents)
- [Delta to Meta Model v3](https://help.sap.com/docs/leanix/ea/delta-to-meta-model-v3)
- [Using Relations](https://help.sap.com/docs/leanix/ea/relations)
- [General Modeling Guidelines](https://help.sap.com/docs/leanix/ea/general-modeling-guidelines)
- [Application Modeling Guidelines](https://help.sap.com/docs/leanix/ea/application-modeling-guidelines)
- [Business Capability Modeling Guidelines](https://help.sap.com/docs/leanix/ea/business-capability-modeling-guidelines)
- [Business Context Modeling Guidelines](https://help.sap.com/docs/leanix/ea/business-context-modeling-guidelines)
- [Initiative Modeling Guidelines](https://help.sap.com/docs/leanix/ea/initiative-modeling-guidelines)
- [Interface Modeling Guidelines](https://help.sap.com/docs/leanix/ea/interface-modeling-guidelines)
- [IT Component Modeling Guidelines](https://help.sap.com/docs/leanix/ea/it-component-modeling-guidelines)
- [Organization Modeling Guidelines](https://help.sap.com/docs/leanix/ea/organization-modeling-guidelines)
- [Platform Modeling Guidelines](https://help.sap.com/docs/leanix/ea/platform-modeling-guidelines)
- [Tags and Custom Fields](https://help.sap.com/docs/leanix/ea/tags-and-custom-fields)
