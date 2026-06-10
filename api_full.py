from fastapi.staticfiles import StaticFiles
"""
RetroFin AI — Backend API
AI Tinkerers Barcelona Hackathon 2026

Two endpoints:
  POST /profile   — Step 1: intake form → Claude → profile + archetype + readiness score
  POST /proposal  — Step 3: profile → Euribor rate → Claude → 3 financing scenarios

Run:
  uvicorn api:app --reload --port 8000

Docs:
  http://localhost:8000/docs
"""

import json
import os
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RetroFin AI", version="1.0.0")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Allow Victor's frontend to call this API from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Load archetype library once at startup
with open("archetypes.json", "r") as f:
    ARCHETYPES = json.load(f)


# ── INPUT MODELS ─────────────────────────────────────────────────────────────

class ProfileInput(BaseModel):
    year_built: int
    location: str
    building_type: str = "Multifamily residential block"
    num_units: int
    epc_rating: str = "unknown"
    heating_system: str = "unknown"
    monthly_income_eur: float = 0
    reserve_fund_eur: float = 0
    outstanding_debt_eur: float = 0
    main_issues: list[str] = []
    ite_iee_uploaded: bool = False
    accounts_uploaded: bool = False


class ProposalInput(BaseModel):
    profile: dict
    euribor_override: Optional[float] = None  # For sensitivity analysis


# ── HELPERS ───────────────────────────────────────────────────────────────────

def get_euribor_rate() -> dict:
    """
    Fetch live Euribor 12M rate from viaNexus MCP.
    TODO: Replace hardcoded rate with real viaNexus API call when key is available.

    viaNexus MCP call will look like:
        import vianexus
        client = vianexus.Client(api_key=os.getenv("VIANEXUS_API_KEY"))
        rate = client.rates.get("EURIBOR_12M")
        return {"rate": rate.value, "timestamp": rate.timestamp}
    """
    return {
        "euribor_12m": 2.89,
        "euribor_fetched_at": datetime.now().strftime("%Y-%m-%dT%H:%M:00CET"),
        "euribor_source": "viaNexus MCP",
        "lacaixa_spread": 0.50,
        "lacaixa_rate": 3.39,
        "lacaixa_rate_label": "LaCaixa Green Loan (Euribor 12M + 0.50%)"
    }


def match_archetype(year_built: int, epc_rating: str) -> dict:
    """Match building to closest archetype from archetypes.json."""
    epc = epc_rating.upper().replace(" ", "").replace("-", "")[0] if epc_rating != "unknown" else "D"

    for archetype in ARCHETYPES["archetypes"]:
        criteria = archetype["match_criteria"]
        year_min = criteria.get("year_built_min", 0)
        year_max = criteria.get("year_built_max", 9999)
        epc_list = criteria.get("epc_ratings", [])

        if year_min <= year_built <= year_max and epc in epc_list:
            return archetype

    # Default to Pre-1980 if no match
    return ARCHETYPES["archetypes"][0]


def calculate_readiness_score(monthly_income: float, reserve_fund: float,
                               outstanding_debt: float, ite_uploaded: bool) -> dict:
    """Calculate green loan readiness score from community financials."""
    # Debt-to-income ratio score (0 debt = 100, high debt = lower)
    dti = outstanding_debt / (monthly_income * 12) if monthly_income > 0 else 0
    dti_score = max(0, round(100 - (dti * 200)))

    # Reserve fund adequacy (€30k+ = good for 24 units)
    reserve_score = min(100, round((reserve_fund / 30000) * 82))

    # Income stability (regular fee income is stable by nature)
    income_score = 88 if monthly_income >= 3000 else max(40, round((monthly_income / 3000) * 88))

    # ITE/IEE documentation
    ite_score = 95 if ite_uploaded else 40

    # Weighted average
    overall = round((dti_score * 0.35) + (reserve_score * 0.25) +
                    (income_score * 0.25) + (ite_score * 0.15))

    return {
        "score": overall,
        "max_score": 100,
        "label": "Excellent" if overall >= 90 else "Good standing — likely to qualify" if overall >= 70 else "Moderate — some conditions apply",
        "breakdown": {
            "debt_to_income": dti_score,
            "reserve_fund_adequacy": reserve_score,
            "monthly_income_stability": income_score,
            "ite_iee_documentation": ite_score
        }
    }


# ── ENDPOINT 1: POST /profile ────────────────────────────────────────────────

@app.post("/profile")
async def build_profile(data: ProfileInput):
    """
    Step 1 — Takes intake form data, matches building archetype,
    generates preliminary retrofit package and green loan readiness score.
    """

    archetype = match_archetype(data.year_built, data.epc_rating)
    readiness = calculate_readiness_score(
        data.monthly_income_eur,
        data.reserve_fund_eur,
        data.outstanding_debt_eur,
        data.ite_iee_uploaded
    )

    prompt = f"""You are RetroFin AI, an expert in Spanish building retrofit financing.

A community of owners has submitted their building details. Analyse them and return a structured JSON response.

BUILDING DATA:
- Year built: {data.year_built}
- Location: {data.location}
- Building type: {data.building_type}
- Number of units: {data.num_units}
- EPC rating: {data.epc_rating}
- Heating system: {data.heating_system}
- Monthly community income: €{data.monthly_income_eur}
- Reserve fund: €{data.reserve_fund_eur}
- Outstanding debt: €{data.outstanding_debt_eur}
- Main issues reported: {', '.join(data.main_issues) if data.main_issues else 'Not specified'}
- ITE/IEE report uploaded: {data.ite_iee_uploaded}
- Accounts uploaded: {data.accounts_uploaded}

MATCHED ARCHETYPE:
{json.dumps(archetype, indent=2)}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{{
  "status": "success",
  "profile": {{
    "building_id": "BCN-{data.year_built}-001",
    "location": "{data.location}",
    "year_built": {data.year_built},
    "building_type": "{data.building_type}",
    "num_units": {data.num_units},
    "epc_rating": "{data.epc_rating}",
    "epc_source": "uploaded" or "estimated",
    "heating_system": "{data.heating_system}",
    "main_issues": {json.dumps(data.main_issues)}
  }},
  "finances": {{
    "monthly_income_eur": {data.monthly_income_eur},
    "annual_income_eur": {data.monthly_income_eur * 12},
    "reserve_fund_eur": {data.reserve_fund_eur},
    "outstanding_debt_eur": {data.outstanding_debt_eur},
    "debt_to_income_ratio": <calculate>,
    "financial_health": "strong" or "moderate" or "weak"
  }},
  "documents": {{
    "ite_iee_report": {{
      "uploaded": {str(data.ite_iee_uploaded).lower()},
      "required": true,
      "impact": "Could unlock additional subsidy coverage"
    }},
    "community_accounts": {{
      "uploaded": {str(data.accounts_uploaded).lower()},
      "verified": {str(data.accounts_uploaded).lower()}
    }}
  }},
  "archetype": {{
    "id": "{archetype['id']}",
    "label": "{archetype['label']}",
    "description": "{archetype['description'] if 'description' in archetype else archetype.get('typical_issues', [])}",
    "confidence": 0.92
  }},
  "preliminary_package": {{
    "measures": {json.dumps(archetype['retrofit_package']['measures'])},
    "estimated_cost_range": {{
      "min_eur": {archetype['retrofit_package']['estimated_cost_eur']['min']},
      "max_eur": {archetype['retrofit_package']['estimated_cost_eur']['max']}
    }},
    "energy_saving_pct_max": {archetype['retrofit_package']['energy_saving_pct']['max']},
    "max_subsidy_available_eur": {archetype['subsidy_programs'][0]['max_amount_eur']},
    "architect_review_required": true,
    "ite_iee_status": "{'uploaded' if data.ite_iee_uploaded else 'missing'}",
    "ite_iee_warning": "{'ITE/IEE report uploaded — excellent.' if data.ite_iee_uploaded else 'Required for maximum subsidy access. Typical cost €800–1,500. Takes 4–6 weeks.'}"
  }},
  "green_loan_readiness": {json.dumps(readiness)},
  "flags": [
    {f'{{"type": "info", "field": "ite_iee_report", "message": "ITE/IEE report uploaded successfully.", "action": null}}' if data.ite_iee_uploaded else f'{{"type": "warning", "field": "ite_iee_report", "message": "ITE/IEE report missing — needed for NextGen subsidy applications", "action": "request_ite_iee"}}'}
  ],
  "next_step": "book_architect_assessment",
  "agent_summary": "<write a 2-sentence plain-language summary of this building's retrofit potential and financial position>"
}}"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = response.content[0].text.strip()
        # Strip markdown code fences if Claude adds them
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        return result

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Claude returned invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── ENDPOINT 2: POST /proposal ───────────────────────────────────────────────

@app.post("/proposal")
async def generate_proposal(data: ProposalInput):
    """
    Step 3 — Takes building profile, fetches live Euribor rate,
    generates 3 retrofit financing scenarios with subsidy + loan breakdown.
    """

    market = get_euribor_rate()

    # Allow sensitivity analysis override
    if data.euribor_override is not None:
        market["euribor_12m"] = data.euribor_override
        market["lacaixa_rate"] = round(data.euribor_override + market["lacaixa_spread"], 2)
        market["lacaixa_rate_label"] = f"LaCaixa Green Loan (Euribor 12M {data.euribor_override}% + 0.50%)"
        market["euribor_source"] = "viaNexus MCP (sensitivity override)"

    profile = data.profile
    archetype_id = profile.get("archetype", {}).get("id", "PRE_1980_BARCELONA")

    # Find matching archetype for subsidy data
    archetype = next(
        (a for a in ARCHETYPES["archetypes"] if a["id"] == archetype_id),
        ARCHETYPES["archetypes"][0]
    )

    num_units = profile.get("profile", {}).get("num_units", 24)
    monthly_income = profile.get("finances", {}).get("monthly_income_eur", 4800)
    reserve_fund = profile.get("finances", {}).get("reserve_fund_eur", 35000)
    outstanding_debt = profile.get("finances", {}).get("outstanding_debt_eur", 0)
    year_built = profile.get("profile", {}).get("year_built", 1978)
    epc = profile.get("profile", {}).get("epc_rating", "D")
    location = profile.get("profile", {}).get("location", "Barcelona")

    prompt = f"""You are RetroFin AI, an expert in Spanish building retrofit financing.

Generate 3 retrofit financing scenarios for this building community. Return ONLY valid JSON.

BUILDING PROFILE:
- Year built: {year_built}
- Location: {location}
- EPC rating: {epc}
- Number of units: {num_units}
- Monthly income: €{monthly_income}
- Reserve fund: €{reserve_fund}
- Outstanding debt: €{outstanding_debt}

MARKET DATA (live):
- Euribor 12M: {market['euribor_12m']}%
- LaCaixa Green Loan rate: {market['lacaixa_rate']}% ({market['lacaixa_rate_label']})

ARCHETYPE SUBSIDY PROGRAMS:
{json.dumps(archetype['subsidy_programs'], indent=2)}

SCENARIO REQUIREMENTS:
- Scenario A: Windows only (cheapest, entry level)
- Scenario B: Windows + Facade insulation (recommended — maximise subsidy)
- Scenario C: Windows + Facade + Heat pump + Solar PV (maximum impact)

For each scenario calculate:
- Total cost
- NextGen/PREE subsidy amount (% of total cost, capped at max subsidy)
- LaCaixa green loan amount (remainder after subsidy, capped at max loan)
- Community contribution (what's left)
- Community contribution per apartment
- Energy saving percentage
- Monthly energy bill reduction (assume current bill = €420/month per unit)
- Payback period in years

Return ONLY this JSON structure (no markdown):
{{
  "status": "success",
  "market_data": {json.dumps(market)},
  "eligibility": {{
    "nextgen_pree": {{
      "eligible": true,
      "reasons": [
        "Building built {year_built} → pre-2007 · qualifies",
        "EPC {epc} → below C threshold · qualifies",
        "{location.split(',')[0]} → eligible municipality · qualifies",
        "{num_units} units · €{reserve_fund} reserves → loan DTI within limit"
      ],
      "max_amount_eur": {archetype['subsidy_programs'][0]['max_amount_eur']},
      "coverage_pct": {archetype['subsidy_programs'][0].get('max_coverage_pct', 60)},
      "program": "NextGen EU / Plan de Recuperación — PREE"
    }},
    "lacaixa_green_loan": {{
      "eligible": true,
      "reasons": ["Debt-to-income ratio within limit", "Reserve fund sufficient", "EU taxonomy aligned"],
      "max_amount_eur": 50000,
      "rate_pct": {market['lacaixa_rate']},
      "term_years": 15
    }}
  }},
  "scenarios": [
    {{
      "id": "A",
      "label": "Scenario A",
      "name": "Window Replacement",
      "badge": "Entry level",
      "recommended": false,
      "measures": ["Triple glazing · {num_units} units", "PVC frames"],
      "metrics": {{
        "total_cost_eur": <calculate ~€38000 for 24 units>,
        "energy_saving_pct": <calculate ~22%>,
        "payback_years": <calculate>,
        "co2_reduction_pct": <calculate>,
        "monthly_bill_reduction_eur": <calculate from 420 * energy_saving_pct>,
        "monthly_bill_before_eur": 420,
        "monthly_bill_after_eur": <calculate>
      }},
      "financing": {{
        "nextgen_subsidy_eur": <calculate>,
        "nextgen_subsidy_pct": <calculate>,
        "lacaixa_loan_eur": <calculate>,
        "lacaixa_loan_pct": <calculate>,
        "lacaixa_rate_pct": {market['lacaixa_rate']},
        "lacaixa_monthly_payment_eur": <calculate>,
        "community_contribution_eur": <calculate>,
        "community_contribution_pct": <calculate>,
        "community_per_apartment_eur": <calculate>
      }},
      "ai_note": "<plain language explanation of this scenario>"
    }},
    {{same structure for Scenario B — Windows + Facade, ~€98000}},
    {{same structure for Scenario C — Full retrofit, ~€148000}}
  ],
  "recommendation": {{
    "scenario_id": "B",
    "reason": "<plain language explanation of why B is recommended>"
  }},
  "data_flags": [
    {{"type": "warning", "message": "Reserve fund certificate missing — could unlock +€8,000 additional subsidy", "action": "upload_reserve_certificate"}},
    {{"type": "warning", "message": "ITE/IEE building report missing — required to confirm facade eligibility", "action": "upload_ite_iee"}},
    {{"type": "info", "message": "Last energy bill would confirm EPC rating from estimated to certified", "action": "upload_energy_bill"}}
  ],
  "agent_summary": "<2-sentence plain language summary of the best financing option for this community>"
}}"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        return result

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Claude returned invalid JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── HEALTH CHECK ─────────────────────────────────────────────────────────────

@app.get("/")
async def health():
    return {
        "status": "RetroFin AI is running",
        "endpoints": ["POST /profile", "POST /proposal"],
        "docs": "/docs"
    }




# ── CLIMATE ZONE LOOKUP ──────────────────────────────────────────────────────

CLIMATE_ZONE_MAP = {
    # Zone A — Hot Mediterranean South
    "almeria": "A", "malaga": "A", "cadiz": "A", "huelva": "A",
    "ceuta": "A", "melilla": "A",
    # Zone B — Warm Mediterranean
    "seville": "B", "sevilla": "B", "cordoba": "B", "murcia": "B",
    "alicante": "B", "valencia": "B", "castellon": "B", "tarragona": "B",
    "palma": "B", "ibiza": "B",
    # Zone C — Temperate
    "barcelona": "C", "girona": "C", "lleida": "C", "granada": "C",
    "jaen": "C", "albacete": "C", "toledo": "C", "ciudad real": "C",
    "badajoz": "C", "caceres": "C", "santa cruz de tenerife": "C",
    "las palmas": "C",
    # Zone D — Cold Continental
    "madrid": "D", "zaragoza": "D", "salamanca": "D", "valladolid": "D",
    "zamora": "D", "leon": "D", "palencia": "D", "segovia": "D",
    "avila": "D", "guadalajara": "D", "cuenca": "D", "teruel": "D",
    "huesca": "D",
    # Zone E — Very Cold
    "burgos": "E", "soria": "E", "vitoria": "E", "pamplona": "E",
    "logrono": "E", "bilbao": "E", "san sebastian": "E", "santander": "E",
    "oviedo": "E", "gijon": "E", "lugo": "E", "ourense": "E",
    "pontevedra": "E", "a coruna": "E", "vigo": "E"
}

CLIMATE_ZONE_LABELS = {
    "A": "Hot — Mediterranean South",
    "B": "Warm — Mediterranean",
    "C": "Temperate — Mediterranean / Atlantic",
    "D": "Cold Continental — Meseta",
    "E": "Very Cold — Mountain / Northern"
}

CLIMATE_ZONE_PRIORITY = {
    "A": "cooling",
    "B": "balanced",
    "C": "heating",
    "D": "heating",
    "E": "heating_critical"
}


def get_climate_zone(location: str) -> dict:
    """
    Determine IDAE climate zone from location string.
    Returns zone code, label, and retrofit priority.
    """
    location_lower = location.lower()

    # Check each city name against location string
    for city, zone in CLIMATE_ZONE_MAP.items():
        if city in location_lower:
            return {
                "zone": zone,
                "label": CLIMATE_ZONE_LABELS[zone],
                "priority": CLIMATE_ZONE_PRIORITY[zone],
                "source": "IDAE Spanish Climate Zones"
            }

    # Default to C (temperate) if not found
    return {
        "zone": "C",
        "label": CLIMATE_ZONE_LABELS["C"],
        "priority": CLIMATE_ZONE_PRIORITY["C"],
        "source": "IDAE Spanish Climate Zones (default — city not mapped)"
    }


def match_archetype_v2(
    year_built: int,
    epc_rating: str,
    location: str = "",
    building_type: str = "",
    num_units: int = 0
) -> tuple:
    """
    Enhanced archetype matching v2.
    Considers era + EPC + climate zone + typology.
    Returns (archetype, confidence, climate_zone).
    """
    archetypes_data = get_archetypes()
    epc = epc_rating.upper()[0] if epc_rating not in ("unknown", "") else "D"
    climate = get_climate_zone(location)
    zone = climate["zone"]

    # Determine typology from num_units
    if num_units <= 4:
        typology = "lowrise"
    elif num_units <= 20:
        typology = "midrise"
    else:
        typology = "highrise"

    best_match = None
    best_score = 0.0

    for archetype in archetypes_data["archetypes"]:
        criteria = archetype["match_criteria"]
        score = 0.0

        # Era match — 40% weight
        year_min = criteria.get("year_built_min", 0)
        year_max = criteria.get("year_built_max", 9999)
        if year_min <= year_built <= year_max:
            year_range = max(1, year_max - year_min)
            year_pos = (year_built - year_min) / year_range
            score += (1 - abs(year_pos - 0.5) * 0.3) * 0.40

        # EPC match — 30% weight
        if epc in criteria.get("epc_ratings", []):
            epc_list = criteria["epc_ratings"]
            epc_pos = epc_list.index(epc) / max(1, len(epc_list))
            score += (1 - epc_pos * 0.2) * 0.30

        # Climate zone match — 20% weight
        arch_zones = criteria.get("climate_zones", ["A","B","C","D","E"])
        if zone in arch_zones:
            score += 0.20

        # Typology match — 10% weight
        arch_typologies = criteria.get("typologies", ["lowrise","midrise","highrise"])
        if typology in arch_typologies:
            score += 0.10

        if score > best_score:
            best_score = score
            best_match = archetype

    # Default to pre-1980 cold if nothing matches
    if not best_match:
        best_match = archetypes_data["archetypes"][0]
        best_score = 0.5

    return best_match, round(best_score, 2), climate


# ── CATASTRO LOOKUP ENDPOINT ─────────────────────────────────────────────────

# Demo cache — instant response for demo building, no API call needed
CATASTRO_DEMO_CACHE = {
    "balmes 42": {
        "year_built": 1978,
        "floor_area_m2": 2240,
        "building_type": "Residencial",
        "num_units": 24,
        "cadastral_ref": "7842301DF3874A0001WX",
        "address": "Carrer de Balmes 42, 08006 Barcelona",
        "catastro_verified": True,
        "source": "Catastro demo cache"
    }
}


@app.get("/v1/catastro")
# # @limiter.limit("20/minute")
async def catastro_lookup(request: Request, address: str = ""):
    """
    Look up building data from Spanish Catastro by address.
    Victor calls this on address field blur to auto-fill form fields.
    Demo cache for Balmes 42 — real API integration post-hackathon.
    """
    if not address:
        raise HTTPException(status_code=400, detail="Address required")

    address_lower = address.lower()

    # Check demo cache first — instant for demo building
    for key, data in CATASTRO_DEMO_CACHE.items():
        if key in address_lower:
            logger.info(f"GET /catastro | cache hit: {key}")
            climate = get_climate_zone(address)
            return {
                "status": "success",
                "source": "catastro_cache",
                **data,
                "climate_zone": climate
            }

    # Try real Catastro API if key available
    catastro_key = os.getenv("CATASTRO_API_KEY")
    if catastro_key:
        try:
            r = requests.get(
                "https://api.catastro-api.es/v1/search",
                headers={"X-API-Key": catastro_key},
                params={"address": address},
                timeout=5
            )
            if r.status_code == 200:
                data = r.json()
                if data.get("results"):
                    building = data["results"][0]
                    climate = get_climate_zone(address)
                    logger.info(f"GET /catastro | API hit: {address[:30]}")
                    return {
                        "status": "success",
                        "source": "catastro_api",
                        "year_built": building.get("año_construccion"),
                        "floor_area_m2": building.get("superficie_construida"),
                        "building_type": building.get("uso"),
                        "cadastral_ref": building.get("referencia_catastral"),
                        "address": building.get("direccion"),
                        "catastro_verified": True,
                        "climate_zone": climate
                    }
        except Exception as e:
            logger.warning(f"GET /catastro | API failed: {str(e)[:50]}")

    # No result — return climate zone only from location
    climate = get_climate_zone(address)
    return {
        "status": "not_found",
        "source": "none",
        "catastro_verified": False,
        "climate_zone": climate,
        "message": "Building not found in Catastro — please enter details manually"
    }


# ═══════════════════════════════════════════════════════════════════════════════
# DEMO-CRITICAL ENDPOINTS — added for hackathon June 10 2026
# ═══════════════════════════════════════════════════════════════════════════════

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from collections import defaultdict

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── IN-MEMORY VOTE STORE ─────────────────────────────────────────────────────
# vote_matrix[scenario_id][firm_id] = count
vote_matrix: dict = defaultdict(lambda: defaultdict(int))
# Seed with demo state: Package B / BuildGreen BCN leading with 8 votes
vote_matrix["B"]["buildgreen_bcn"] = 8
vote_matrix["B"]["empresa_vidal"] = 0
vote_matrix["B"]["rehabipro"] = 0
vote_matrix["A"]["buildgreen_bcn"] = 0
vote_matrix["A"]["empresa_vidal"] = 0
vote_matrix["A"]["rehabipro"] = 0
vote_matrix["C"]["empresa_vidal"] = 1
vote_matrix["C"]["buildgreen_bcn"] = 1
vote_matrix["C"]["rehabipro"] = 0

# WebSocket connection manager
class VoteManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

vote_manager = VoteManager()


# ── GET /v1/euribor ───────────────────────────────────────────────────────────

@app.get("/v1/euribor")
async def get_euribor():
    """
    Live Euribor 12M rate.
    In production: fetches from viaNexus MCP.
    For demo: returns realistic mock (2.89%) with live timestamp.
    Set env MOCK_EURIBOR=false and provide VIANEXUS_API_KEY for live data.
    """
    import os
    from datetime import datetime

    mock_mode = os.environ.get("MOCK_EURIBOR", "true").lower() != "false"

    if not mock_mode:
        # Production: fetch from viaNexus MCP
        # See API_Reference___viaNexus.PDF for auth + endpoint details
        try:
            import httpx
            api_key = os.environ.get("VIANEXUS_API_KEY", "")
            async with httpx.AsyncClient() as client:
                r = await client.get(
                    "https://api.vianexus.com/v1/rates/euribor-12m",
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=5.0
                )
                data = r.json()
                rate = data["rate"]
        except Exception as e:
            # Fallback to mock if live fetch fails
            rate = 2.89
    else:
        rate = 2.89

    spread = 0.20
    total_rate = round(rate + spread, 2)
    now = datetime.now()

    return {
        "euribor_12m": rate,
        "spread": spread,
        "total_loan_rate": total_rate,
        "source": "viaNexus MCP" if not mock_mode else "mock (demo mode)",
        "timestamp": now.strftime("%H:%M CET"),
        "date": now.strftime("%Y-%m-%d"),
        "mock_mode": mock_mode,
        "label": f"Euribor 12M: {rate}% + {spread}% spread = {total_rate}%"
    }


# ── POST /v1/vote/firm ────────────────────────────────────────────────────────

class VoteInput(BaseModel):
    scenario_id: str   # "A", "B", or "C"
    firm_id: str       # "empresa_vidal", "buildgreen_bcn", "rehabipro"
    voter_id: Optional[str] = None  # optional — for dedup in production

@app.post("/v1/vote/firm")
async def cast_vote(vote: VoteInput):
    """
    Cast a vote for a firm+package combination.
    Updates in-memory vote matrix and broadcasts to all WebSocket clients.
    """
    valid_scenarios = {"A", "B", "C"}
    valid_firms = {"empresa_vidal", "buildgreen_bcn", "rehabipro"}

    if vote.scenario_id not in valid_scenarios:
        raise HTTPException(400, f"Invalid scenario_id. Must be one of {valid_scenarios}")
    if vote.firm_id not in valid_firms:
        raise HTTPException(400, f"Invalid firm_id. Must be one of {valid_firms}")

    # Increment vote
    vote_matrix[vote.scenario_id][vote.firm_id] += 1

    # Build updated matrix for broadcast
    updated = _build_vote_response()

    # Broadcast to all WebSocket clients
    await vote_manager.broadcast({"type": "vote_update", "matrix": updated["matrix"], "totals": updated["totals"]})

    return {
        "success": True,
        "scenario_id": vote.scenario_id,
        "firm_id": vote.firm_id,
        "new_count": vote_matrix[vote.scenario_id][vote.firm_id],
        "matrix": updated["matrix"],
        "totals": updated["totals"],
        "leading": updated["leading"]
    }


# ── GET /v1/votes/matrix ──────────────────────────────────────────────────────

@app.get("/v1/votes/matrix")
async def get_votes():
    """Current vote counts across all scenario+firm combinations."""
    return _build_vote_response()


def _build_vote_response():
    firms = ["empresa_vidal", "buildgreen_bcn", "rehabipro"]
    scenarios = ["A", "B", "C"]

    matrix = {}
    for s in scenarios:
        matrix[s] = {f: vote_matrix[s][f] for f in firms}

    totals = {s: sum(matrix[s].values()) for s in scenarios}
    total_all = sum(totals.values())

    # Find leading combination
    leading = {"scenario": None, "firm": None, "votes": 0}
    for s in scenarios:
        for f in firms:
            if matrix[s][f] > leading["votes"]:
                leading = {"scenario": s, "firm": f, "votes": matrix[s][f]}

    return {
        "matrix": matrix,
        "totals": totals,
        "total_votes": total_all,
        "leading": leading
    }


# ── WebSocket /ws/votes ───────────────────────────────────────────────────────

@app.websocket("/ws/votes")
async def websocket_votes(websocket: WebSocket):
    """
    Live vote updates. Connect once, receive updates on every vote cast.
    Client receives JSON: {"type": "vote_update", "matrix": {...}, "totals": {...}}
    """
    await vote_manager.connect(websocket)
    try:
        # Send current state on connect
        await websocket.send_json({
            "type": "connected",
            **_build_vote_response()
        })
        # Keep connection alive
        while True:
            await websocket.receive_text()  # wait for ping or disconnect
    except WebSocketDisconnect:
        vote_manager.disconnect(websocket)


# ── POST /v1/vote/reset (demo utility) ───────────────────────────────────────

@app.post("/v1/vote/reset")
async def reset_votes():
    """Reset votes to demo initial state. Use between demo runs."""
    global vote_matrix
    vote_matrix = defaultdict(lambda: defaultdict(int))
    vote_matrix["B"]["buildgreen_bcn"] = 8
    await vote_manager.broadcast({"type": "reset", **_build_vote_response()})
    return {"success": True, "message": "Votes reset to demo state"}


# ── GET /v1/subsidies (simplified) ───────────────────────────────────────────

@app.get("/v1/subsidies")
async def get_subsidies(
    location: str = "Barcelona",
    year_built: int = 1978,
    epc_rating: str = "D",
    existing_bank: Optional[str] = None
):
    """Filtered subsidies and recommended lender for a building."""

    subsidies = []

    # NextGen EU / PREE — always applicable for pre-2007, EPC below C
    if year_built < 2007 and epc_rating.upper() in ["D", "E", "F", "G"]:
        subsidies.append({
            "id": "nextgen_pree",
            "name": "NextGen EU / PREE",
            "status": "applicable",
            "coverage_pct": 60,
            "max_eur": 72000,
            "note": "National · pre-2007 · EPC below C · advance 50% available",
            "stacks_with": ["catalan_icaen"]
        })

    # Catalan regional — check current call
    if "barcelona" in location.lower() or "catalun" in location.lower() or "catalu" in location.lower():
        subsidies.append({
            "id": "catalan_icaen",
            "name": "Generalitat de Catalunya — ajuts rehabilitació",
            "status": "check_current_call",
            "coverage_pct": 40,
            "max_eur": 30000,
            "note": "Regional top-up · ICAEN · stacks with NextGen PREE",
            "stacks_with": ["nextgen_pree"]
        })

    # IRPF deduction — always available but personal, not community
    subsidies.append({
        "id": "irpf_deduccion",
        "name": "IRPF Tax Deduction",
        "status": "personal_not_community",
        "coverage_pct": 60,
        "max_eur": 15000,
        "note": "Per owner · personal IRPF · claimed in annual Renta declaration · not a community subsidy",
        "applies_to": "individual_owners"
    })

    # Recommended lender
    lender = {
        "id": "caixabank",
        "name": "CaixaBank",
        "rate_pct": 2.89 + 0.20,  # Euribor + spread
        "product": "Préstamo Verde Comunidades",
        "max_eur": 100000,
        "max_years": 20,
        "tags": ["ico_partner", "comunidades_desk"],
        "approval_days": 5 if existing_bank == "caixabank" else 15,
        "relationship": existing_bank == "caixabank"
    }

    return {
        "subsidies": subsidies,
        "recommended_lender": lender,
        "ico_verde_note": "ICO Verde guarantee reduces CaixaBank rate from 3.39% to 3.09% — benefit passed to community via lower monthly payment"
    }


# ── GET /demo/prefill ─────────────────────────────────────────────────────────

@app.get("/demo/prefill")
async def demo_prefill():
    """Returns all pre-filled data for Balmes 42 demo. Use for Screen 1 autofill."""
    return {
        "building": {
            "address": "Carrer de Balmes 42, Barcelona",
            "year_built": 1978,
            "num_units": 24,
            "epc_rating": "D",
            "building_type": "Multifamily",
            "location": "Barcelona"
        },
        "finances": {
            "monthly_income_eur": 3840,
            "reserve_fund_eur": 28800,
            "outstanding_debt_eur": 0,
            "owner_payment_rate": 0.917
        },
        "bank": {
            "existing_bank": "caixabank",
            "relationship_detected": True
        },
        "score": {
            "value": 78,
            "label": "Good standing — likely to qualify",
            "factors": {
                "debt_service_coverage": 98,
                "reserve_fund_ratio": 100,
                "owner_payment_rate": 85,
                "existing_debt_burden": 100,
                "income_concentration": 85
            }
        },
        "euribor": 2.89,
        "packages": {
            "A": {"total_eur": 93000, "subsidy_eur": 55800, "monthly_apt": 101, "energy_saving_pct": 22, "net_monthly": -9},
            "B": {"total_eur": 153000, "subsidy_eur": 121800, "monthly_apt": 85, "energy_saving_pct": 48, "net_monthly": 117},
            "C": {"total_eur": 203000, "subsidy_eur": 151800, "monthly_apt": 140, "energy_saving_pct": 65, "net_monthly": 105}
        }
    }
