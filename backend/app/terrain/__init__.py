"""Moduł terenu: profil horyzontu wokół miejsca lądowania. Kontrakt w docs/ARCHITECTURE.md."""

AZIMUTH_STEP_DEG = 1.0
SAMPLES = 360


def flat_profile() -> dict:
    return {
        "azimuth_step_deg": AZIMUTH_STEP_DEG,
        "elevation_deg": [0.0] * SAMPLES,
        "source": "flat",
    }


def horizon_profile(lat_deg: float, lon_deg: float) -> dict:
    """Wysokość horyzontu dla azymutów 0, 1, ..., 359 stopni.

    Na razie zawsze płaski horyzont (source = "flat"). Zadanie 002 liczy profil
    z modelu wysokości LOLA (source = "lola") i zostawia płaski jako awaryjny.
    """
    return flat_profile()
