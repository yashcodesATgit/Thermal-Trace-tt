import pytest
from app.model import model_manager

def test_model_manager_load():
    loaded = model_manager.load_model()
    assert loaded is True
    assert model_manager.is_loaded is True
    assert model_manager.model_version == "thermalwatch-v1"
    assert len(model_manager.class_names) == 4
    assert len(model_manager.feature_columns) == 8
    assert model_manager.class_names == [
        "industrial_thermal_source",
        "mining_thermal_source",
        "natural_fire",
        "unknown"
    ]
    assert model_manager.feature_columns == [
        "obs_count",
        "log_mean_frp",
        "log_std_frp",
        "frp_cv",
        "months_active",
        "nearest_osm_distance_km",
        "active_duration_days",
        "first_seen_month"
    ]
