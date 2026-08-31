"""Fetch real public data and generate ``app/data/real_data.py``.

Sources:
  * Weather: Open-Meteo Archive API (CC BY 4.0, free for non-commercial use,
    no API key).  https://open-meteo.com/
  * Wards: Census of India 2011, BBMP ward-wise population / literacy /
    sex-ratio (public domain, sourced from censusindia2011.com / opencity.in).

Run once to (re)generate ``real_data.py``.  The generated module is committed
so the application and its tests never hit the network.
"""

import json
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date

FETCH_WORKERS = 2

LAT = 12.985
LON = 77.595
START_YEAR = 1994
END_YEAR = 2023  # 30 monsoon seasons
MONSOON_START_MONTH = 6
MONSOON_END_MONTH = 9

ZONES = ["ZONE-N01", "ZONE-N02", "ZONE-N03", "ZONE-C01", "ZONE-S01"]

# ward_no, population, literacy_pct, sex_ratio (Census of India 2011, BBMP)
WARD_ROWS = [
    (1, 34783, 79.77, 911), (2, 36602, 74.2, 920), (3, 58129, 80.4, 887),
    (4, 41986, 80.02, 926), (5, 52025, 72.81, 908), (6, 71855, 74.22, 907),
    (7, 72154, 79.28, 903), (8, 47546, 77.61, 905), (9, 57195, 82.48, 947),
    (10, 36396, 84.69, 813), (11, 37128, 71.78, 958), (12, 61071, 78.82, 898),
    (13, 41482, 79.45, 888), (14, 65113, 80.92, 915), (15, 33042, 83.94, 858),
    (16, 37959, 84.06, 871), (17, 49610, 79.91, 953), (18, 35122, 82.7, 943),
    (19, 32491, 82.27, 946), (20, 27361, 80.19, 958), (21, 32516, 80.18, 937),
    (22, 51592, 78.4, 916), (23, 60483, 74.83, 955), (24, 58967, 78.39, 951),
    (25, 95368, 79.28, 926), (26, 47358, 77.68, 947), (27, 51268, 82.99, 977),
    (28, 47074, 79.76, 985), (29, 33588, 84.41, 997), (30, 45748, 74.47, 977),
    (31, 41936, 74.47, 967), (32, 39334, 82.35, 979), (33, 47926, 78.25, 936),
    (34, 24308, 82.13, 958), (35, 36738, 87.21, 897), (36, 37036, 82.2, 936),
    (37, 41107, 80.66, 931), (38, 36879, 75.01, 908), (39, 59289, 80.75, 802),
    (40, 72794, 75.65, 892), (41, 57814, 78.9, 827), (42, 41352, 72.78, 905),
    (43, 51200, 79.26, 924), (44, 40212, 78.6, 938), (45, 34196, 84.25, 951),
    (46, 31449, 83.94, 960), (47, 42135, 67.78, 921), (48, 35814, 70.8, 964),
    (49, 37955, 78.13, 992), (50, 49094, 77.22, 859), (51, 46159, 79.26, 950),
    (52, 35168, 81.11, 945), (53, 48585, 75.55, 933), (54, 50191, 75.79, 780),
    (55, 33946, 77.69, 855), (56, 43443, 79.24, 919), (57, 58815, 79.36, 925),
    (58, 43983, 79.6, 927), (59, 40362, 82.65, 1025), (60, 35334, 73.76, 1015),
    (61, 38050, 71.66, 960), (62, 34394, 78.12, 988), (63, 21728, 82.65, 1027),
    (64, 31118, 84.11, 1007), (65, 35609, 87.63, 1028), (66, 35709, 86.24, 996),
    (67, 34574, 86.96, 987), (68, 44615, 81.23, 932), (69, 57077, 76.3, 914),
    (70, 61479, 76.84, 855), (71, 66314, 76.94, 853), (72, 62272, 78.3, 883),
    (73, 68922, 78.41, 907), (74, 43844, 76.6, 950), (75, 48734, 79.65, 930),
    (76, 33236, 85.65, 963), (77, 33388, 82.49, 953), (78, 28835, 85.66, 998),
    (79, 37291, 78.02, 972), (80, 35228, 84.53, 1016), (81, 57062, 79.92, 914),
    (82, 49631, 76.2, 778), (83, 43942, 78.03, 862), (84, 50556, 76.41, 916),
    (85, 63083, 77.72, 918), (86, 39768, 79.78, 763), (87, 39926, 78.92, 908),
    (88, 38251, 80.52, 969), (89, 33793, 84.46, 989), (90, 35090, 84.97, 788),
    (91, 32689, 82.73, 982), (92, 37506, 78.45, 941), (93, 22815, 87.1, 1067),
    (94, 31208, 81.46, 803), (95, 37693, 74.0, 952), (96, 38110, 75.83, 956),
    (97, 35721, 79.66, 967), (98, 32913, 82.55, 955), (99, 33084, 83.11, 950),
    (100, 30333, 83.77, 961), (101, 30051, 82.64, 914), (102, 50893, 77.88, 876),
    (103, 53532, 79.28, 866), (104, 26873, 83.39, 939), (105, 28355, 82.09, 940),
    (106, 24181, 83.92, 932), (107, 36461, 85.11, 912), (108, 33866, 86.16, 961),
    (109, 33292, 82.68, 888), (110, 27504, 84.13, 965), (111, 22995, 87.55, 996),
    (112, 30638, 84.23, 977), (113, 38108, 83.03, 906), (114, 36916, 86.99, 736),
    (115, 37060, 80.62, 983), (116, 48534, 74.26, 917), (117, 42095, 81.56, 893),
    (118, 28784, 66.9, 992), (119, 27076, 79.3, 913), (120, 37344, 76.38, 944),
    (121, 37354, 78.28, 950), (122, 40032, 71.83, 965), (123, 40331, 82.72, 929),
    (124, 37347, 78.03, 971), (125, 21171, 86.87, 953), (126, 29319, 84.0, 926),
    (127, 43729, 77.99, 933), (128, 35780, 74.45, 962), (129, 68132, 79.83, 926),
    (130, 58199, 74.53, 936), (131, 42785, 70.02, 940), (132, 41487, 83.36, 934),
    (133, 35113, 80.37, 962), (134, 49484, 73.93, 921), (135, 37599, 64.62, 942),
    (136, 38639, 68.61, 954), (137, 36039, 73.81, 967), (138, 24801, 75.22, 979),
    (139, 29344, 69.19, 940), (140, 32213, 82.4, 960), (141, 38825, 76.05, 962),
    (142, 34666, 85.93, 960), (143, 32462, 83.94, 990), (144, 34879, 70.24, 979),
    (145, 38309, 81.72, 934), (146, 30667, 76.91, 943), (147, 34299, 76.58, 936),
    (148, 47004, 83.25, 902), (149, 54625, 75.73, 886), (150, 80180, 76.46, 821),
    (151, 38316, 82.98, 975), (152, 39997, 82.69, 836), (153, 38151, 77.93, 979),
    (154, 32640, 86.8, 1012), (155, 36982, 81.99, 960), (156, 41379, 81.42, 950),
    (157, 34653, 77.31, 929), (158, 45928, 73.73, 913), (159, 40771, 80.97, 937),
    (160, 56897, 80.42, 933), (161, 46805, 80.39, 859), (162, 43195, 85.8, 978),
    (163, 45572, 84.62, 953), (164, 43483, 82.26, 929), (165, 25998, 86.75, 1002),
    (166, 27040, 74.93, 985), (167, 32756, 85.74, 981), (168, 28353, 86.87, 1001),
    (169, 32066, 78.9, 968), (170, 33927, 79.44, 963), (171, 48991, 77.46, 934),
    (172, 42624, 83.69, 831), (173, 33521, 83.37, 861), (174, 63033, 79.33, 930),
    (175, 43585, 77.41, 895), (176, 52250, 82.87, 870), (177, 28846, 84.5, 965),
    (178, 31034, 84.98, 956), (179, 25871, 86.92, 963), (180, 42171, 67.72, 959),
    (181, 47182, 81.59, 933), (182, 41037, 83.01, 968), (183, 43364, 79.9, 953),
    (184, 57209, 76.42, 911), (185, 46943, 75.82, 906), (186, 38294, 80.0, 910),
    (187, 49207, 79.49, 917), (188, 49884, 78.78, 908), (189, 68554, 78.14, 862),
    (190, 65890, 73.78, 872), (191, 71004, 76.25, 760), (192, 80037, 76.34, 899),
    (193, 58355, 77.86, 912), (194, 51911, 74.33, 934), (195, 57335, 80.38, 943),
    (196, 45608, 70.02, 943), (197, 62057, 78.72, 927), (198, 50440, 75.14, 927),
]

DAILY_VARS = (
    "rain_sum,temperature_2m_max,temperature_2m_min,"
    "wind_speed_10m_max,relative_humidity_2m_mean"
)
HOURLY_VARS = (
    "precipitation,temperature_2m,relative_humidity_2m,"
    "wind_speed_10m,surface_pressure"
)


def warning_level(rain_mm: float) -> str:
    if rain_mm >= 120:
        return "EXTREME"
    if rain_mm >= 60:
        return "SEVERE"
    if rain_mm >= 30:
        return "WATCH"
    return "NORMAL"


def fetch_season(year: int) -> dict:
    start = f"{year}-{MONSOON_START_MONTH:02d}-01"
    end = f"{year}-{MONSOON_END_MONTH:02d}-30"

    params = {
        "latitude": str(LAT),
        "longitude": str(LON),
        "start_date": start,
        "end_date": end,
        "daily": DAILY_VARS,
        "hourly": HOURLY_VARS,
        "timezone": "UTC",
    }

    url = (
        "https://archive-api.open-meteo.com/v1/archive?"
        + urllib.parse.urlencode(params)
    )

    request = urllib.request.Request(url, headers={"User-Agent": "nexus-demo/1.0"})

    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            print(f"  retry {attempt + 1} for {year}: {exc}", file=sys.stderr)
            time.sleep(4 * (attempt + 1))

    raise RuntimeError(f"Failed to fetch weather for {year}")


def build_weather_records() -> list[dict]:
    records: list[dict] = []
    seasons: dict[int, dict] = {}

    years = list(range(START_YEAR, END_YEAR + 1))

    with ThreadPoolExecutor(max_workers=FETCH_WORKERS) as executor:
        futures = {
            executor.submit(fetch_season, year): year
            for year in years
        }

        for future in as_completed(futures):
            year = futures[future]
            seasons[year] = future.result()
            print(f"  ✓ monsoon {year} fetched", flush=True)

    for year in years:
        data = seasons[year]

        daily = data["daily"]
        hourly = data["hourly"]

        daily_time = daily["time"]
        hourly_precip = hourly.get("precipitation") or []
        hourly_temp = hourly.get("temperature_2m") or []
        hourly_humidity = hourly.get("relative_humidity_2m") or []
        hourly_wind = hourly.get("wind_speed_10m") or []
        hourly_pressure = hourly.get("surface_pressure") or []

        hourly_times = hourly.get("time") or []
        times_by_day: dict[str, list[int]] = {}

        for index, hour_time in enumerate(hourly_times):
            times_by_day.setdefault(hour_time[:10], []).append(index)

        for day_index, day in enumerate(daily_time):
            rainfall = round(daily["rain_sum"][day_index], 2)
            zone = ZONES[(year + day_index) % len(ZONES)]

            hour_indexes = times_by_day.get(day, [])

            def _daily_hourly(values):
                picked = [
                    values[i]
                    for i in hour_indexes
                    if i < len(values) and values[i] is not None
                ]
                picked = (picked + [0.0] * 24)[:24]
                return [round(value, 2) for value in picked]

            records.append(
                {
                    "id": f"WX-{day.replace('-', '')}",
                    "zone": zone,
                    "type": "RAINFALL",
                    "rainfall_mm": rainfall,
                    "unit": "mm",
                    "temp_min": round(daily["temperature_2m_min"][day_index], 1),
                    "temp_max": round(daily["temperature_2m_max"][day_index], 1),
                    "wind_max": round(daily["wind_speed_10m_max"][day_index], 1),
                    "humidity_mean": round(
                        daily["relative_humidity_2m_mean"][day_index], 1
                    ),
                    "warning": warning_level(rainfall),
                    "hourly_precipitation": _daily_hourly(hourly_precip),
                    "hourly_temperature": _daily_hourly(hourly_temp),
                    "hourly_humidity": _daily_hourly(hourly_humidity),
                    "hourly_wind": _daily_hourly(hourly_wind),
                    "hourly_pressure": _daily_hourly(hourly_pressure),
                    "source": "Open-Meteo Archive API",
                    "timestamp": f"{day}T00:00:00+00:00",
                }
            )

    return records


def build_ward_records() -> list[dict]:
    records = []

    for index, (ward_no, population, literacy, sex_ratio) in enumerate(WARD_ROWS):
        zone = ZONES[index % len(ZONES)]

        records.append(
            {
                "id": f"WARD-{ward_no:03d}",
                "ward_number": ward_no,
                "name": f"BBMP Ward {ward_no}",
                "zone": zone,
                "population": population,
                "literacy_pct": literacy,
                "sex_ratio": sex_ratio,
                "source": "Census of India 2011",
            }
        )

    return records


def render_module(weather: list[dict], wards: list[dict]) -> str:
    weather_json = json.dumps(weather, indent=4)
    wards_json = json.dumps(wards, indent=4)

    return (
        "# -*- coding: utf-8 -*-\n"
        "\"\"\"Real public datasets used by NEXUS.\n\n"
        "Generated by ``scripts/fetch_real_data.py`` - do not edit by hand.\n\n"
        "Sources:\n"
        "  * Weather: Open-Meteo Archive API - CC BY 4.0, free for\n"
        "    non-commercial use. Attribution: https://open-meteo.com/\n"
        "  * Wards: Census of India 2011, BBMP ward-wise population.\n"
        "    Public domain.\n"
        "\"\"\"\n\n"
        f"REAL_WEATHER_EVENTS = {weather_json}\n\n"
        f"WARDS = {wards_json}\n"
    )


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("Fetching weather records ...")

    weather = build_weather_records()

    print(f"  {len(weather)} weather records")

    print("Building ward records ...")

    wards = build_ward_records()

    print(f"  {len(wards)} ward records")

    output_path = "app/data/real_data.py"

    with open(output_path, "w", encoding="utf-8") as handle:
        handle.write(render_module(weather, wards))

    print(f"\nWrote {output_path}")


if __name__ == "__main__":
    main()