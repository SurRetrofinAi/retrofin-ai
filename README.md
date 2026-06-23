# RetroFin AI

**A structured finance agent that helps Spanish homeowner communities navigate building retrofit financing — end to end.**

🏆 3rd place · AI Tinkerers Barcelona Hackathon 2026 · Challenge 1 (Structured Finance)
🎁 NVIDIA H100 Incubation Prize · Open Source Finance Forum London tickets

[Live Demo](http://212.47.238.61:8000/static/demo.html) · [Hackathon Submission](#) · Built in 24 hours

---

## The problem

Spain has 10 million buildings that need urgent energy retrofit. Only ~1% are renovated per year, against an EU target of 3% by 2030. Public funding has increased — but communities can't navigate it:

- **Process is impossibly complex** — 14 documents, 3 subsidy programs, 4–8 week permits, 3 contractor quotes
- **Financing is opaque and fragmented** — Euribor moves, subsidies change, most communities don't know their eligibility
- **Decisions require community consensus** — 60%+ owner vote mandatory, with no tool to help them decide together using real data

> *"She doesn't know what an EPC rating is. She just knows her bills are €420 a month."*

## What RetroFin AI does

RetroFin AI is an AI agent that connects live market data, regulatory subsidy rules, and community voting workflows into a single interface a non-expert can actually use — from building profile to signed loan application, in one session.

| Step | What happens |
|---|---|
| **1. Community intake & profile builder** | Address → Cadastre auto-fills building data. Upload accounts + IEE report → bank detected, mandatory repairs flagged, Green Loan Score calculated (0–100). |
| **2. Architect inspection & firm quotes** | Books 3 contractor visits. AI parses uploaded PDF quotes, compares specs, flags non-compliant proposals. |
| **3. AI proposals & community vote** | Live Euribor pulled via MCP. Subsidies stacked (Plan Estatal + regional). 3 financing scenarios generated. Two-step community vote with live tally via WebSockets. |
| **4. Documents, applications & export** | Auto-drafts subsidy applications, generates meeting minutes (Acta de Junta) and the full submission PDF pack. |

All financial calculations — loan terms, subsidy stacking, savings projections — are **deterministic Python**, not LLM output. The AI handles document extraction, natural-language explanation, and chat; it never touches the numbers.

## Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  React Frontend  │─────▶│  FastAPI Backend  │─────▶│   viaNexus MCP   │
│  (static demo)   │◀─────│   (Scaleway)      │◀─────│  (live Euribor)  │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
            Claude Sonnet    FINOS archetypes   WebSockets
            (doc extraction,  (building          (live vote
             chat, summaries)  classification)    tally)
```

**Why deterministic finance + AI extraction?** Hallucinated numbers are unacceptable in a financial product. Claude handles language; Python handles money.

## Tech stack

| Layer | Technology |
|---|---|
| AI / LLM | Claude Sonnet (Anthropic API) |
| Live market data | viaNexus MCP (Euribor 12M) |
| Building classification | [FINOS archetypes.json](https://github.com/finos) |
| Backend | FastAPI, Python, WebSockets |
| Frontend | React (standalone, in-browser Babel for demo) |
| Deployment | Scaleway DEV1-S, Ubuntu 24.04 |
| Document generation | ReportLab (PDF export) |

## Demo

**Live:** http://212.47.238.61:8000/static/demo.html

Proof of concept building: Carrer de Balmes 42, Barcelona — 1978, 24 units, EPC D.

```bash
curl http://212.47.238.61:8000/
# {"status":"RetroFin AI is running","endpoints":["POST /profile","POST /proposal"],"docs":"/docs"}
```

## Running locally

```bash
git clone https://github.com/SurRetrofinAi/retrofin-ai.git
cd retrofin-ai
pip install -r requirements.txt --break-system-packages
python3 -m uvicorn api_full:app --host 0.0.0.0 --port 8000
```

Then open `static/demo.html` in a browser, or visit `http://localhost:8000/static/demo.html`.

API docs available at `/docs` (Swagger UI).

## Why this is reusable beyond retrofit

The core agent is built on four primitives that recur in any structured finance workflow:

**Profile → Validate → Propose → Apply**

Swap the asset class and the same pipeline applies: mortgages, SME green loans, solar/EV portfolio financing, infrastructure bonds. Building retrofit was our Challenge 1 demonstration — not the ceiling.

## Team

Built at AI Tinkerers Barcelona Hackathon 2026 by **Team Sur**:

- **Alejandra Baigun** — Finance & Product. 12+ years in blended finance, impact-linked instruments, and climate adaptation finance (iGravity, ILF ESA).
- **Victor Chang** — iOS & Frontend.
- **Ana Corrêa do Lago** — Research & Urban Climate. Marie Skłodowska-Curie Fellow.

## Roadmap

- [ ] Fine-tune a specialised model on Spanish IEE reports, subsidy regulation, and community accounts (NVIDIA H100 prize window)
- [ ] Expand subsidy database to all 17 Spanish autonomous communities
- [ ] Partner with an accredited *agente rehabilitador* for legal/technical validation
- [ ] Pilot with a real comunidad de propietarios
- [ ] HTTPS, auth, and production hardening

## License

This project was built for AI Tinkerers Barcelona Hackathon 2026, Challenge 1. License TBD.

## Acknowledgements

- [FINOS](https://www.finos.org/) — open source building archetype classification
- [AI Tinkerers Barcelona](https://barcelona.aitinkerers.org/) — hackathon organisers
- NVIDIA — H100 Incubation Prize
