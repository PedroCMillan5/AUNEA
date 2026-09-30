from aunea_backend.uat import run_canonical_uat


def test_canonical_one_click_uat_has_5_fixtures_26_assertions_all_pass():
    out = run_canonical_uat()
    assert out["isolated"] is True
    assert out["fixture_count"] == 5
    assert out["assertion_count"] == 26
    assert out["fail_count"] == 0
    assert out["pass_count"] == 26
    assert out["pass"] is True
    assert all(f["pass"] for f in out["fixtures"])
