# NEXUS — Crisis Decision Support System

## Submission description

**Live URLs**
- Frontend (command center): https://nexus-nu-pied.vercel.app
- Backend (API): https://nexus-backend-o959.onrender.com
- Source code: https://github.com/RalphRuban/Nexus

---

### Problem

Emergency operations centers are inundated with data during a crisis —
live weather, field reports, road closures, hospital and shelter capacity,
team and vehicle status — but the operator must turn that flood into a
single, defensible decision under time pressure. Choices are frequently
reactive and based on whatever screen happens to be open, not on a
reconciled picture of the whole affected area.

### What NEXUS does

NEXUS is an AI-assisted command center that fuses operational data and
runs a **multi-agent analysis pipeline** built on the **Google Agent
Framework (google.adk)**. Given an incident, it returns a risk assessment,
an affected-population estimate, road/resource constraints, and **three
concrete response plans (A: Evacuation First, B: Infrastructure First,
C: Balanced — recommended)**, each with a confidence score. A human
operator reviews and approves a plan before any real-world action.

Beyond analysis, NEXUS provides a **“what if?” scenario engine**: a
commander can raise flood levels, close roads, overload hospitals, or
surge the population, and NEXUS immediately recomputes the risk score on
an isolated snapshot for a clean before/after comparison. It also ingests
field **images** (via the Gemini API) and turns a photo into a structured
new incident on the map.

### Architecture

- **Frontend** — Next.js 16 command center: interactive Leaflet map, risk
  and resource panels, live agent trace, plan cards, scenario builder,
  and vision intake. Runs client-side and talks to the backend over REST.
- **Backend** — FastAPI serving incidents, zones, roads, resources,
  weather, wards, reports, activity, scenarios, plans, and the agent
  pipeline. The data layer uses **Cloud Firestore** for persistence with a
  deterministic in-memory store and a lightweight fallback for quota
  resilience.
- **Agents (Google ADK)** — a `Runner`-driven workflow chains seven
  specialist agents: *research, risk, geospatial, resource, coordinator*,
  *decision*, and *simulation*. Each resolves its specialty from real
  data, so the pipeline runs deterministically offline and, when
  `AGENT_LLM_MODE=llm`, augments it with Gemini reasoning.
- **Gemini (Gemini API, gemini-3.5-flash)** — powers vision extraction
  and the optional LLM agent mode.
- **GCP** — Cloud Firestore (`projects/nexus-f351a`) seeded with ~4,000
  real records of public monsoon weather and Bengaluru ward census data.

### Track requirements met

| Requirement | How NEXUS meets it |
|---|---|
| Gemini via the Gemini API | `gemini-3.5-flash` for image extraction and LLM agent mode |
| Google Agent Framework | Multi-agent workflow orchestrated by `google.adk.runners.Runner` |
| GCP Infrastructure | Cloud Firestore persistence, seeded ~4,000 docs on the free tier |

### Data

- **Weather**: 3,660 historic daily monsoon rainfall records for Bengaluru
  (1994–2023) via the Open-Meteo Archive API — CC BY 4.0.
- **Census**: 198 Bengaluru ward population, literacy, and sex-ratio
  records (Census of India 2011) — public domain.

### Testing & quality

- 51 backend tests (pytest), frontend lint + production build clean.
- Live end-to-end smoke test passed: create incident → agent analysis
  (risk 93 CRITICAL, confidence 87%) → worst-case scenario (risk 93 → 100)
  → plan approval → traces recorded.

### Running a demo

1. Open the frontend URL in a browser.
2. Select an incident (or create one) on the map / incident list.
3. Run **Analyze** to watch the pipeline and review plans A/B/C.
4. Approve a plan, then open **Scenarios** to raise flood levels and watch
   risk recompute.
5. Upload a field image under **Vision** to create an incident from a photo.

---

### AI-assistant disclosure

NEXUS was built from scratch during the submission period. AI coding
assistants were used to write and debug code. No pre-existing application
code, no frameworks beyond those listed under "Local development" in the
README, and no third-party assets were incorporated other than the
publicly licensed weather and census datasets documented above.
