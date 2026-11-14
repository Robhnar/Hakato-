from datetime import UTC, datetime

import pytest

from app.metrics import _interpolate_crossing, horizon_elevation_at, summarize_body


def profile(values):
    return {"azimuth_step_deg": 360.0 / len(values), "elevation_deg": values, "source": "synthetic"}


def test_horizon_interpolates_between_samples():
    p = profile([0.0, 2.0, 0.0, 0.0])  # próbki co 90 stopni
    assert horizon_elevation_at(p, 45.0) == pytest.approx(1.0)
    assert horizon_elevation_at(p, 90.0) == pytest.approx(2.0)


def test_horizon_wraps_around_north():
    p = profile([4.0, 0.0, 0.0, 2.0])
    assert horizon_elevation_at(p, 315.0) == pytest.approx(3.0)
    assert horizon_elevation_at(p, 360.0) == pytest.approx(4.0)
    assert horizon_elevation_at(p, -45.0) == pytest.approx(3.0)


def hours(n):
    return [f"2027-01-01T{h:02d}:00:00Z" for h in range(n)]


def test_interpolate_crossing_exact_middle():
    t0 = datetime(2027, 1, 1, 0, 0, 0, tzinfo=UTC)
    t1 = datetime(2027, 1, 1, 1, 0, 0, tzinfo=UTC)
    # diff0 = -1.0, diff1 = 1.0 -> przejście dokładnie w 00:30:00
    t_cross = _interpolate_crossing(t0, t1, -1.0, 1.0)
    assert t_cross == datetime(2027, 1, 1, 0, 30, 0, tzinfo=UTC)


def test_summary_finds_windows_and_next_change():
    # Przebieg: widoczne w h0-h1, zachód między h1 a h2, wschód między h3 a h4, widoczne w h4-h5
    el = [1.0, 0.5, -0.5, -1.0, 0.2, 3.0]
    horizon = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    visible = [e > h for e, h in zip(el, horizon)]
    s = summarize_body(hours(6), el, visible, horizon)

    # Zachód: między h1 (diff=0.5) a h2 (diff=-0.5) -> dokładnie w 01:30:00 (h=1.5)
    # Wschód: między h3 (diff=-1.0) a h4 (diff=0.2) -> ułamek 1.0/1.2 = 5/6h = 50min -> 03:50:00
    assert s["windows"] == [
        {"start_utc": "2027-01-01T00:00:00Z", "end_utc": "2027-01-01T01:30:00Z"},
        {"start_utc": "2027-01-01T03:50:00Z", "end_utc": "2027-01-01T05:00:00Z"},
    ]
    assert s["visible_at_start"] is True
    assert s["hours_until_change"] == pytest.approx(1.5)
    # Łączny czas: 1.5h + 1h 10min (1.1667h) = 2.6667h z 5h zakresu = 0.5333
    assert s["visible_fraction"] == pytest.approx(2.6667 / 5.0, abs=1e-3)
    assert s["max_el_deg"] == 3.0


def test_summary_without_any_change():
    s = summarize_body(hours(3), [-1.0, -2.0, -3.0], [False, False, False], [0.0, 0.0, 0.0])
    assert s["windows"] == []
    assert s["hours_until_change"] is None
    assert s["visible_fraction"] == 0.0


def test_summary_always_visible():
    s = summarize_body(
        hours(4), [1.0, 2.0, 3.0, 2.0], [True, True, True, True], [0.0, 0.0, 0.0, 0.0]
    )
    assert s["windows"] == [
        {"start_utc": "2027-01-01T00:00:00Z", "end_utc": "2027-01-01T03:00:00Z"}
    ]
    assert s["hours_until_change"] is None
    assert s["visible_fraction"] == 1.0
    assert s["visible_at_start"] is True


def test_summary_crossing_exactly_at_sample():
    # diff przechodzi dokładnie w 0 w próbce
    # h0: -1.0, h1: 0.0 (visible=False bo e > h), h2: 1.0 (visible=True)
    el = [-1.0, 0.0, 1.0]
    horizon = [0.0, 0.0, 0.0]
    visible = [False, False, True]
    s = summarize_body(hours(3), el, visible, horizon)
    # Wschód: między h1 (diff=0.0) a h2 (diff=1.0) -> t_cross = h1 = 01:00:00
    assert s["windows"] == [
        {"start_utc": "2027-01-01T01:00:00Z", "end_utc": "2027-01-01T02:00:00Z"}
    ]
    assert s["hours_until_change"] == pytest.approx(1.0)
    assert s["visible_fraction"] == pytest.approx(0.5)


def test_summary_open_at_end_of_range():
    # Zaczyna się pod horyzontem, wschodzi w połowie i zostaje widoczne do końca
    el = [-1.0, 1.0]
    horizon = [0.0, 0.0]
    visible = [False, True]
    s = summarize_body(hours(2), el, visible, horizon)
    assert s["windows"] == [
        {"start_utc": "2027-01-01T00:30:00Z", "end_utc": "2027-01-01T01:00:00Z"}
    ]
    assert s["hours_until_change"] == pytest.approx(0.5)
    assert s["visible_fraction"] == pytest.approx(0.5)


def test_summary_merges_instantaneous_dip_to_zero():
    # Ciało dotyka horyzontu dokładnie w próbce (1.0 -> 0.0 -> 1.0)
    el = [1.0, 0.0, 1.0]
    horizon = [0.0, 0.0, 0.0]
    visible = [True, False, True]
    s = summarize_body(hours(3), el, visible, horizon)
    # Scalone do jednego ciągłego okna, brak zachodu w zadanym zakresie
    assert s["windows"] == [
        {"start_utc": "2027-01-01T00:00:00Z", "end_utc": "2027-01-01T02:00:00Z"}
    ]
    assert s["visible_at_start"] is True
    assert s["hours_until_change"] is None
    assert s["visible_fraction"] == 1.0


def test_summary_discards_zero_duration_spike():
    # Chwilowe dotknięcie ponad horyzont dające okno o długości 0 sekund
    el = [-1.0, 1e-10, -1.0]
    horizon = [0.0, 0.0, 0.0]
    visible = [False, True, False]
    s = summarize_body(hours(3), el, visible, horizon)
    assert s["windows"] == []
    assert s["visible_fraction"] == 0.0
    assert s["visible_at_start"] is False
    assert s["hours_until_change"] is None
