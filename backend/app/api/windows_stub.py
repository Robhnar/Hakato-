"""Stały payload zaślepki GET /api/windows (zadanie 011) — wspólny dla API i fixtures."""


def windows_fixture() -> dict:
    """Przykładowa siatka dwóch dni księżycowych przy biegunie (scenariusz fixtures)."""
    slot_a = {
        "start_utc": "2027-01-01T00:00:00Z",
        "end_utc": "2027-01-30T12:42:00Z",
        "sunlight_hours": 168.5,
        "sun_visible_fraction": 0.238,
        "max_darkness_hours": 240.0,
        "max_sun_el_deg": 1.42,
        "sun_el_at_start_deg": -0.35,
        "earth_hours": 295.2,
        "earth_visible_fraction": 0.417,
        "earth_visible_at_start": False,
        "passes_requirements": True,
        "score": 0.82,
        "cycles": {
            "lunar_day_index": 0,
            "seasonal_phase_deg": 12.4,
            "draconic_year_phase_deg": 41.0,
        },
        "uncertainty": None,
    }
    slot_b = {
        "start_utc": "2027-01-30T12:42:00Z",
        "end_utc": "2027-03-01T01:24:00Z",
        "sunlight_hours": 402.0,
        "sun_visible_fraction": 0.568,
        "max_darkness_hours": 96.0,
        "max_sun_el_deg": 1.55,
        "sun_el_at_start_deg": 0.62,
        "earth_hours": 310.0,
        "earth_visible_fraction": 0.438,
        "earth_visible_at_start": True,
        "passes_requirements": True,
        "score": 0.91,
        "cycles": {
            "lunar_day_index": 1,
            "seasonal_phase_deg": 42.8,
            "draconic_year_phase_deg": 71.5,
        },
        "uncertainty": None,
    }
    slot_c = {
        "start_utc": "2027-03-01T01:24:00Z",
        "end_utc": "2027-03-30T14:06:00Z",
        "sunlight_hours": 48.0,
        "sun_visible_fraction": 0.068,
        "max_darkness_hours": 520.0,
        "max_sun_el_deg": 0.4,
        "sun_el_at_start_deg": -1.1,
        "earth_hours": 180.0,
        "earth_visible_fraction": 0.254,
        "earth_visible_at_start": False,
        "passes_requirements": False,
        "score": 0.12,
        "cycles": {
            "lunar_day_index": 2,
            "seasonal_phase_deg": 73.2,
            "draconic_year_phase_deg": 102.0,
        },
        "uncertainty": None,
    }
    matches = sorted(
        [slot_a, slot_b],
        key=lambda slot: slot["score"],
        reverse=True,
    )
    return {
        "grid": [slot_a, slot_b, slot_c],
        "matches": matches,
        "slip_analysis": {
            "original_slot": slot_a,
            "delayed_slot": slot_b,
            "delta_sunlight_hours": round(slot_b["sunlight_hours"] - slot_a["sunlight_hours"], 1),
            "delta_max_darkness_hours": round(
                slot_b["max_darkness_hours"] - slot_a["max_darkness_hours"], 1
            ),
            "delta_earth_fraction": round(
                slot_b["earth_visible_fraction"] - slot_a["earth_visible_fraction"], 3
            ),
            "nearest_equivalent_slot": slot_b,
            "explanation": (
                "Stub slip analysis (task 011): delayed start lands in the next lunar-day "
                "slot with more sunlight. Real search engine arrives in tasks 012/013."
            ),
        },
        "cycles_summary": {
            "synodic_month_days": 29.53,
            "draconic_year_days": 346.62,
            "nodal_precession_years": 18.6,
            "libration_month_days": 27.21,
        },
        "meta": {"ephemeris": "placeholder", "horizon": "synthetic"},
    }
