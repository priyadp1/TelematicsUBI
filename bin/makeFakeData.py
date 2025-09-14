import argparse
from pathlib import Path
from datetime import datetime, timedelta

import numpy as np
import pandas as pd


RNG = np.random.default_rng(42)


def simulateReferenceTables(n_drivers: int):
    driver_ids = [f"D{1000+i}" for i in range(n_drivers)]

    drivers = pd.DataFrame({
        "driver_id": driver_ids,
        "years_licensed": RNG.integers(1, 25, size=n_drivers),
        "prior_claims_count": RNG.poisson(0.3, size=n_drivers),
        "prior_violations": RNG.poisson(0.6, size=n_drivers),
    })

    vehicles = pd.DataFrame({
        "driver_id": driver_ids,
        "vehicle_year": RNG.integers(2008, 2025, size=n_drivers),
        "vehicle_make": RNG.choice(["Toyota", "Honda", "Ford", "Chevy", "Hyundai", "Subaru", "VW", "Nissan"], size=n_drivers),
        "vehicle_model": RNG.choice(["Sedan", "SUV", "Hatch", "Pickup"], size=n_drivers),
        "safety_rating": RNG.integers(3, 6, size=n_drivers),
    })

    zones = ["urban", "suburban", "rural"]
    crash_rate = {"urban": 1.2, "suburban": 1.0, "rural": 0.9}
    crime_idx = {"urban": 1.3, "suburban": 1.0, "rural": 0.8}

    context = pd.DataFrame({
        "driver_id": driver_ids,
        "home_zone": RNG.choice(zones, size=n_drivers, p=[0.35, 0.45, 0.20]),
    })
    context["local_crash_rate"] = context["home_zone"].map(crash_rate)
    context["crime_index"] = context["home_zone"].map(crime_idx)

    return drivers, vehicles, context


def simulateEvents(n_drivers: int, days: int, hz: int):
    rows = []
    start_date = datetime(2025, 1, 1, 6, 0, 0)

    for d in range(n_drivers):
        did = f"D{1000+d}"
        for day in range(days):
            n_trips = RNG.integers(1, 4)
            for _ in range(n_trips):
                t0 = start_date + timedelta(days=day, hours=int(RNG.integers(6, 23)))
                dur_min = int(RNG.integers(10, 25))
                n_points = dur_min * 60 * hz

                base_speed = RNG.normal(13, 4)  # m/s ~ 30 mph
                is_night = 1 if (t0.hour >= 21 or t0.hour < 5) else 0
                school_zone = 1 if (8 <= t0.hour <= 16 and RNG.random() < 0.12) else 0
                rush = 1 if (7 <= t0.hour <= 9 or 16 <= t0.hour <= 18) else 0

                for i in range(n_points):
                    ts = t0 + timedelta(seconds=i // hz)
                    speed = max(0.0, base_speed + RNG.normal(0, 2))
                    harsh_brake = RNG.random() < 0.0018
                    harsh_accel = RNG.random() < 0.0018
                    sharp_turn = RNG.random() < 0.0012
                    ax = RNG.normal(0, 0.2) + (-3.5 if harsh_brake else 0) + (3.5 if harsh_accel else 0)
                    ay = RNG.normal(0, 0.2) + (0.8 if sharp_turn else 0)

                    rows.append({
                        "driver_id": did,
                        "timestamp": ts.isoformat(),
                        "speed_mps": speed,
                        "ax": ax,
                        "ay": ay,
                        "is_night": is_night,
                        "school_zone": school_zone,
                        "rush_hour": rush,
                    })

    return pd.DataFrame(rows)


def deriveFeatures(events: pd.DataFrame):
    events["timestamp"] = pd.to_datetime(events["timestamp"])
    events = events.sort_values(["driver_id", "timestamp"]).reset_index(drop=True)

    events["dt"] = (
        events.groupby("driver_id")["timestamp"]
        .diff()
        .dt.total_seconds()
        .fillna(0)
    )

    events["hour"] = events["timestamp"].dt.hour
    events["prev_hour"] = events.groupby("driver_id")["hour"].shift(1)
    events["hour_change"] = (events["hour"] != events["prev_hour"]).fillna(False)

    new_trip = ((events["dt"] > 180) | events["hour_change"]).astype(int)
    events["trip_id"] = new_trip.groupby(events["driver_id"]).cumsum()

    g = events.groupby(["driver_id", "trip_id"])
    trip = g.agg(
        duration_s=("timestamp", lambda s: (s.max() - s.min()).total_seconds() + 1),
        miles=("speed_mps", lambda v: v.sum() / 1609.34),
        speed_mean=("speed_mps", "mean"),
        speed_std=("speed_mps", "std"),
        harsh_brake_rate=("ax", lambda a: (np.asarray(a) < -2.5).mean()),
        harsh_accel_rate=("ax", lambda a: (np.asarray(a) > 2.5).mean()),
        sharp_turn_rate=("ay", lambda a: (np.asarray(a) > 0.6).mean()),
        night_pct=("is_night", "mean"),
        school_zone_pct=("school_zone", "mean"),
        rush_hour_pct=("rush_hour", "mean"),
    ).reset_index().fillna(0.0)

    drv = trip.groupby("driver_id").agg(
        trips=("trip_id", "count"),
        miles=("miles", "sum"),
        duration_h=("duration_s", lambda s: s.sum() / 3600.0),
        speed_mean=("speed_mean", "mean"),
        speed_std=("speed_std", "mean"),
        harsh_brake_rate=("harsh_brake_rate", "mean"),
        harsh_accel_rate=("harsh_accel_rate", "mean"),
        sharp_turn_rate=("sharp_turn_rate", "mean"),
        night_pct=("night_pct", "mean"),
        school_zone_pct=("school_zone_pct", "mean"),
        rush_hour_pct=("rush_hour_pct", "mean"),
    ).reset_index().fillna(0.0)

    return trip, drv


def simulate_labels(driver_df: pd.DataFrame, drivers: pd.DataFrame, vehicles: pd.DataFrame, context: pd.DataFrame):
    for d in (driver_df, drivers, vehicles, context):
        if "driverId" in d.columns:
            d.rename(columns={"driverId": "driver_id"}, inplace=True)

    df = (
        driver_df
        .merge(drivers, on="driver_id")
        .merge(vehicles, on="driver_id")
        .merge(context, on="driver_id")
    )

    z = (
        1.2 * df["harsh_brake_rate"]
        + 1.0 * df["harsh_accel_rate"]
        + 0.9 * df["sharp_turn_rate"]
        + 0.5 * df["night_pct"]
        + 0.3 * df["rush_hour_pct"]
        + 0.40 * (df["miles"] / 500.0)
        + 0.08 * df["prior_violations"]
        + 0.10 * df["prior_claims_count"]
        + 0.25 * (1.0 / df["safety_rating"])
        + 0.20 * df["local_crash_rate"]
        + RNG.normal(0, 0.30, size=len(df))
    )

    p = 1 / (1 + np.exp(-z))
    y = (RNG.random(len(df)) < p).astype(int)

    labels = df[["driver_id"]].copy()
    labels["claim_indicator"] = y
    labels["risk_latent"] = z
    return labels


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/sample")
    ap.add_argument("--drivers", type=int, default=80)
    ap.add_argument("--days", type=int, default=14)
    ap.add_argument("--hz", type=int, default=1)
    args = ap.parse_args()

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    drivers, vehicles, context = simulateReferenceTables(args.drivers)
    events = simulateEvents(args.drivers, args.days, args.hz)
    trip_feats, driver_agg = deriveFeatures(events)
    labels = simulate_labels(driver_agg, drivers, vehicles, context)

    events.to_csv(out / "events.csv", index=False)
    drivers.to_csv(out / "drivers.csv", index=False)
    vehicles.to_csv(out / "vehicles.csv", index=False)
    context.to_csv(out / "context.csv", index=False)
    trip_feats.to_csv(out / "trip_features.csv", index=False)
    driver_agg.to_csv(out / "driver_features.csv", index=False)
    labels.to_csv(out / "labels.csv", index=False)

    print(f"Wrote synthetic data to: {out.resolve()}")


if __name__ == "__main__":
    main()
