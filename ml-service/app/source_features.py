"""
ThermalWatch Production Feature Adapter (ML v1 baseline).

Constructs the 8 source-level cluster features required by thermalwatch_model.joblib
from historical observations stored in the Supabase PostGIS hotspots table.

Feature contract (exact order matches v1 artifact's feature_columns):
  0: obs_count               — total observations in the spatial grid cell up to T
  1: log_mean_frp            — log1p(mean(frp)) for cell obs with non-NULL frp
  2: log_std_frp             — log1p(std(frp).fillna(0)); ddof=1, NaN→0 for single obs
  3: frp_cv                  — std_frp / mean_frp; NaN→0 for single obs
  4: months_active           — count of distinct calendar month NUMBERS (1–12), caps at 12
  5: nearest_osm_distance_km — Euclidean degree distance * 111 to nearest facility
  6: active_duration_days    — (max_timestamp - min_timestamp).days as integer
  7: first_seen_month        — calendar month (1–12) of the earliest observation
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

from sqlalchemy import cast, func, select, Numeric
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.osm_feature import OSMFeature
from app.db.models.hotspot import Hotspot

logger = logging.getLogger(__name__)

# Authoritative v1 feature column order
FEATURE_COLUMNS: List[str] = [
    "obs_count",
    "log_mean_frp",
    "log_std_frp",
    "frp_cv",
    "months_active",
    "nearest_osm_distance_km",
    "active_duration_days",
    "first_seen_month",
]

# Spatial grouping precision: 3 decimal places on lat/lon.
GROUPING_DECIMALS: int = 3


def round_coord(value: float) -> float:
    """Round a coordinate to GROUPING_DECIMALS places, matching pandas round(3)."""
    return round(value, GROUPING_DECIMALS)


@dataclass
class SourceFeatureVector:
    """
    The 8 source-level features in v1 artifact order.
    All values are floats, suitable for direct model input.
    """
    obs_count: float
    log_mean_frp: float
    log_std_frp: float
    frp_cv: float
    months_active: float
    nearest_osm_distance_km: float
    active_duration_days: float
    first_seen_month: float

    # Derived operational field (not a model feature)
    activity_status: str = "new"

    def to_list(self) -> List[float]:
        """Return 8 features in the exact v1 artifact order."""
        return [
            self.obs_count,
            self.log_mean_frp,
            self.log_std_frp,
            self.frp_cv,
            self.months_active,
            self.nearest_osm_distance_km,
            self.active_duration_days,
            self.first_seen_month,
        ]


class InsufficientHistoryError(Exception):
    """Raised when the spatial grid cell has zero historical observations."""
    pass


class MissingOSMDataError(Exception):
    """Raised when the osm_features table is empty."""
    pass


async def build_source_features(
    *,
    db: AsyncSession,
    latitude: float,
    longitude: float,
    cutoff_ts: datetime,
    current_frp: Optional[float] = None,
    allow_single_obs_fallback: bool = False,
) -> SourceFeatureVector:
    """
    Build the 8 source-level features for the grid cell containing
    (latitude, longitude), using only observations with timestamp <= cutoff_ts.
    """
    rounded_lat = round_coord(latitude)
    rounded_lon = round_coord(longitude)

    cluster_query = (
        select(
            Hotspot.id,
            Hotspot.latitude,
            Hotspot.longitude,
            Hotspot.timestamp,
            Hotspot.frp,
        )
        .where(Hotspot.latitude.between(rounded_lat - 0.002, rounded_lat + 0.002))
        .where(Hotspot.longitude.between(rounded_lon - 0.002, rounded_lon + 0.002))
        .where(
            func.round(cast(Hotspot.latitude, Numeric), GROUPING_DECIMALS) == rounded_lat
        )
        .where(
            func.round(cast(Hotspot.longitude, Numeric), GROUPING_DECIMALS) == rounded_lon
        )
        .where(Hotspot.timestamp <= cutoff_ts)
    )

    result = await db.execute(cluster_query)
    rows = result.all()

    obs_count = len(rows)
    if obs_count == 0:
        if allow_single_obs_fallback:
            timestamps = [cutoff_ts]
            frp_values = [current_frp] if current_frp is not None else []
            obs_count = 1
        else:
            raise InsufficientHistoryError(
                f"No historical observations found for grid cell "
                f"({rounded_lat}, {rounded_lon}) before {cutoff_ts}."
            )
    else:
        timestamps = [r.timestamp for r in rows]
        frp_values = [r.frp for r in rows if r.frp is not None]
        if current_frp is not None and not any(r.timestamp == cutoff_ts and r.frp == current_frp for r in rows):
            frp_values.append(current_frp)
            timestamps.append(cutoff_ts)
            obs_count = len(timestamps)

    min_ts = min(timestamps)
    max_ts = max(timestamps)

    active_duration_days = float((max_ts - min_ts).days)
    first_seen_month = float(min_ts.month)
    months_active = float(len({t.month for t in timestamps}))

    if len(frp_values) == 0:
        log_mean_frp = 0.0
        log_std_frp = 0.0
        frp_cv = 0.0
    elif len(frp_values) == 1:
        frp_mean = frp_values[0]
        log_mean_frp = math.log1p(frp_mean)
        log_std_frp = 0.0
        frp_cv = 0.0
    else:
        frp_mean = sum(frp_values) / len(frp_values)
        variance = sum((x - frp_mean) ** 2 for x in frp_values) / (len(frp_values) - 1)
        frp_std = math.sqrt(variance)

        log_mean_frp = math.log1p(frp_mean)
        log_std_frp = math.log1p(frp_std)

        if frp_mean > 0:
            frp_cv = frp_std / frp_mean
        else:
            frp_cv = 0.0

    nearest_osm_distance_km: float = await _nearest_osm_distance_km_degree(
        db=db, latitude=rounded_lat, longitude=rounded_lon
    )

    if months_active >= 9:
        activity_status = "persistent"
    elif active_duration_days > 7:
        activity_status = "recurring"
    else:
        activity_status = "new"

    return SourceFeatureVector(
        obs_count=float(obs_count),
        log_mean_frp=log_mean_frp,
        log_std_frp=log_std_frp,
        frp_cv=frp_cv,
        months_active=months_active,
        nearest_osm_distance_km=nearest_osm_distance_km,
        active_duration_days=active_duration_days,
        first_seen_month=first_seen_month,
        activity_status=activity_status,
    )


async def _nearest_osm_distance_km_degree(
    db: AsyncSession,
    latitude: float,
    longitude: float,
) -> float:
    """
    Returns nearest OSM feature distance in km (Euclidean distance in degree space * 111).
    """
    dist_deg_expr = func.sqrt(
        func.power(OSMFeature.latitude - latitude, 2)
        + func.power(OSMFeature.longitude - longitude, 2)
    )

    bbox_dist_query = (
        select(dist_deg_expr.label("dist_deg"))
        .where(OSMFeature.latitude.between(latitude - 2.0, latitude + 2.0))
        .where(OSMFeature.longitude.between(longitude - 2.0, longitude + 2.0))
        .order_by(dist_deg_expr)
        .limit(1)
    )
    result = await db.execute(bbox_dist_query)
    row = result.first()

    if row is None:
        dist_query = (
            select(dist_deg_expr.label("dist_deg"))
            .order_by(dist_deg_expr)
            .limit(1)
        )
        result = await db.execute(dist_query)
        row = result.first()

    if row is None:
        raise MissingOSMDataError("No OSM features found in the database.")

    return float(row.dist_deg) * 111.0
