import psycopg2
import json
import time
import datetime
import pytz
import os
timezone = "Asia/Singapore"

from dotenv import load_dotenv
from requests import get
from requests import post
from psycopg2 import sql
load_dotenv()

# database variables to be used
database_row, database_table_name = {}, ""
data, columns, values = {}, {}, {}

# initialize connection to database and create cursor
conn = psycopg2.connect(host=os.getenv('DATABASE_IP'), dbname=os.getenv('DATABASE_USERNAME'), user=os.getenv('DATABASE_USERNAME'), password=os.getenv('DATABASE_PASSWORD'), port=os.getenv('DATABASE_PORT'))
conn.autocommit = True
cur = conn.cursor()

# home assistant details and variables to be used
HOME_ASSISTANT_IP = os.getenv('HOME_ASSISTANT_URL').replace("http://", "")
TOKEN = os.getenv('HOME_ASSISTANT_TOKEN')
HEADERS = {"Authorization": f"Bearer {TOKEN}", "content-type": "application/json"}
url, response, data = "", "", ""
HOME_ASSISTANT_PORT = os.getenv('HOME_ASSISTANT_PORT')


def getAndInsertSensiboAirProData(deviceID: str):
    try:

        url = f"http://{HOME_ASSISTANT_IP}:{HOME_ASSISTANT_PORT}/api/states/{deviceID}"
        response = get(url=url, headers=HEADERS)
        data = json.loads(str(response.text))

        database_table_name = "sensibo_" + deviceID.replace(".","_")

        database_row.update({"timestamp":datetime.datetime.now(pytz.timezone(timezone)).strftime("%Y-%m-%d %X%z")})
        database_row.update({"temperature":data['attributes']['current_temperature']})
        database_row.update({"humidity":data['attributes']['current_humidity']})
        database_row.update({"hvac_mode":data['state']})
        database_row.update({"target_temperature":data['attributes']['temperature']})

        columns = str(list(database_row.keys())).replace("[","").replace("]", "").replace(",", "").replace("'","").replace(" ",",")
        values  = str(list(database_row.values())).replace("[","").replace("]", "").replace(",", "").replace(" ",",").replace("None","NULL")
        cur.execute(f"INSERT INTO {database_table_name} ({columns}) VALUES ({values})")

        print("[{timestamp}]  Device ID: {deviceID}  |  Data: {data}".format(timestamp=database_row['timestamp'], deviceID=deviceID, data=data))
        database_row.clear()
        return

    except:

        cur.execute(f"INSERT INTO error_logs ({database_table_name}) VALUES ('{str(database_row).replace("'", "")}')")
        print("[{timestamp}]  Topic: {topic:<35}  |  Data: {data}".format(timestamp=database_row['timestamp'], topic="error_logs", data=str(database_row)))
        database_row.clear()
        return



if __name__ == "__main__":
    print("Sensibo Air Pro to Database code started!")

    deviceIDs = []
    print("Sensibo Air Pro IDs:")
    cur.execute("SELECT * FROM sensibo")
    for row in cur:
        print('-', row[0])
        deviceIDs.append(row[0])
    print()

    while(True):
        for deviceID in deviceIDs:
            getAndInsertSensiboAirProData(deviceID)
        print()
        time.sleep(10.0)
