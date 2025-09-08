from django.core.management.base import BaseCommand
from mapHandler.models import Carpark
import os
import requests
import csv
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
import time
from pyproj import Proj, transform

DATASET_ID = "d_23f946fa557947f93a8043bbef41dd09"
URL = f"https://data.gov.sg/api/action/datastore_search?resource_id={DATASET_ID}"
CSV_FILE_PATH = "/tmp/carparks.csv"  # Save CSV in a temporary directory inside Docker

# Define the coordinate systems using EPSG codes
SVY21 = Proj(init='epsg:3414')  # SVY21 CRS
WGS84 = Proj(init='epsg:4326')  # WGS84 (lat, lon) CRS

def convert_svy21_to_wgs84(xCoord, yCoord):
    """Convert SVY21 to WGS84 coordinates using pyproj."""
    lon, lat = transform(SVY21, WGS84, xCoord, yCoord)
    return lon, lat

def download_csv():
    """Download CSV file from API and save it locally, handling pagination."""
    all_records = []
    offset = 0
    limit = 100  # Default limit per request
    print(f"[{datetime.now()}] Retrieving CSV for Carpark Info...")
    while True:
        # Modify URL to include offset and limit for pagination
        paginated_url = f"{URL}&limit={limit}&offset={offset}"
        response = requests.get(paginated_url)

        if response.status_code == 200:
            data = response.json()
            records = data["result"]["records"]
            all_records.extend(records)

            # Check if we've reached the end of the records
            if len(records) < limit:
                break  # No more records, exit loop
            else:
                offset += limit  # Move to the next page
        else:
            print(f"[{datetime.now()}] Failed to download CSV. Status Code: {response.status_code}")
            break

    # Save the full list of records to a CSV file
    with open(CSV_FILE_PATH, "w", newline="", encoding="utf-8") as csvfile:
        fieldnames = all_records[0].keys()  # Assuming all records have the same fields
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_records)

    print(f"[{datetime.now()}] CSV Downloaded Successfully with {len(all_records)} records.")
    import_carparks()

def import_carparks():
    """Import CSV data into the Django database."""
    central_area_carparks = [
    "ACB",
    "BBB",
    "BRB1",
    "CY",
    "DUXM",
    "HLM",
    "KAB",
    "KAM",
    "KAS",
    "PRM",
    "SLS",
    "SR1",
    "SR2",
    "TPM",
    "UCS",
    "WCB",
    ];


    peak_hour_carparks = {
        "ACB": {"peakHourStart": "10:00", "peakHourEnd": "18:00", "days": ["Weekdays", "Weekends"]},
        "CY": {"peakHourStart": "10:00", "peakHourEnd": "18:00", "days": ["Weekdays", "Weekends"]},
        "SE21": {"peakHourStart": "10:00", "peakHourEnd": "22:00", "days": ["Monday to Saturday"]},
        "SE22": {"peakHourStart": "10:00", "peakHourEnd": "22:00", "days": ["Monday to Saturday"]},
        "SE24": {"peakHourStart": "10:00", "peakHourEnd": "22:00", "days": ["Daily"]},
        "MP14": {"peakHourStart": "08:00", "peakHourEnd": "20:00", "days": ["Daily"]},
        "MP15": {"peakHourStart": "08:00", "peakHourEnd": "20:00", "days": ["Daily"]},
        "MP16": {"peakHourStart": "08:00", "peakHourEnd": "20:00", "days": ["Daily"]},
        "HG9": {"peakHourStart": "11:00", "peakHourEnd": "20:00", "days": ["Weekdays"]},
        "HG9T": {"peakHourStart": "11:00", "peakHourEnd": "20:00", "days": ["Weekdays"]},
        "HG15": {"peakHourStart": "11:00", "peakHourEnd": "20:00", "days": ["Weekdays"]},
        "HG16": {"peakHourStart": "11:00", "peakHourEnd": "20:00", "days": ["Weekdays"]},
    }

    for carpark_id, peak_data in peak_hour_carparks.items():
        try:
            carpark = Carpark.objects.get(carParkNo=carpark_id)
            carpark.peakHour = True
            carpark.peakHourStart = peak_data["peakHourStart"]
            carpark.peakHourEnd = peak_data["peakHourEnd"]
            carpark.save()
            print(f"Updated peak hour info for carpark {carpark_id}")
        except Carpark.DoesNotExist:
            print(f"Carpark {carpark_id} not found in the database")

    with open(CSV_FILE_PATH, newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            carParkNo = row["car_park_no"]
            xCoord = float(row["x_coord"])
            yCoord = float(row["y_coord"])

            # Convert SVY21 to WGS84 coordinates
            lon, lat = convert_svy21_to_wgs84(xCoord, yCoord)

            # Determine if the carpark is in the central area and has peak hour charges
            central_area = carParkNo in central_area_carparks
            peak_hour = carParkNo in peak_hour_carparks

            # Save the carpark data into the database
            Carpark.objects.update_or_create(
                carParkNo=carParkNo,
                defaults={
                    "address": row["address"],
                    "xCoord": lon,  # Store the converted longitude
                    "yCoord": lat,  # Store the converted latitude
                    "carParkType": row["car_park_type"],
                    "typeOfParkingSystem": row["type_of_parking_system"],
                    "shortTermParking": row["short_term_parking"],
                    "freeParking": row["free_parking"],
                    "nightParking": row["night_parking"].lower() == "yes",
                    "carParkDecks": int(row["car_park_decks"]) if row["car_park_decks"].isdigit() else None,
                    "gantryHeight": float(row["gantry_height"]) if row["gantry_height"] else None,
                    "carParkBasement": row["car_park_basement"].lower() == "yes",
                    "centralArea": central_area,  # Set central area field
                    "peakHour": peak_hour,  # Set peak hour field
                }
            )

        print(f"[{datetime.now()}] Database Updated Successfully.")


def start_scheduler():
    """Schedule the task to run every 12 hours inside Docker."""
    scheduler = BackgroundScheduler()
    scheduler.add_job(download_csv, "interval", hours=12)
    scheduler.start()
    print(f"[{datetime.now()}] Scheduler Started. Fetching CSV every 12 hours...")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        scheduler.shutdown()
        print("Scheduler Stopped.")

class Command(BaseCommand):
    help = "Runs a scheduled task to update carpark data every 12 hours"

    def handle(self, *args, **kwargs):
        download_csv()
