import psycopg2
import json
import time
import datetime
import pytz
timezone = "Asia/Singapore"

from requests import get
from requests import post
from psycopg2 import sql

# database details
DATABASE_IP = "10.158.66.30"
DATABASE_PORT = 5432
DATABASE_NAME = "postgres"
DATABASE_USERNAME = "postgres"
DATABASE_PASSWORD = "JXU73zooIoT1"

# database variables to be used
database_row, database_table_name = {}, ""
data, columns, values = {}, {}, {}

# initialize connection to database and create cursor
conn = psycopg2.connect(host=DATABASE_IP, dbname=DATABASE_NAME, user=DATABASE_USERNAME, password=DATABASE_PASSWORD, port=DATABASE_PORT)
conn.autocommit = True
cur = conn.cursor()

# home assistant details and variables to be used
HOME_ASSISTANT_IP = "10.158.71.11"
HOME_ASSISTANT_PORT = "8123"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI3N2ViMDIzZmJjOWE0Yjc2YmYwMjE4YTFmOWY1ZDQwNyIsImlhdCI6MTc0MDExMjc4NSwiZXhwIjoyMDU1NDcyNzg1fQ.iNJpri8xnC_SvNbWGg1ygTWq6ywvhkuCYRJI2GpB0UI"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "content-type": "application/json"}
url, response, data = "", "", ""



def getAndInsertSensiboAirProData(deviceID: str):
    
    url = f"http://{HOME_ASSISTANT_IP}:{HOME_ASSISTANT_PORT}/api/states/{deviceID}"

    try:
        
        database_table_name = "sensibo_" + deviceID.replace(".","_")
        response = get(url=url, headers=HEADERS)

        data = json.loads(str(response.text))
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

        cur.execute(f"INSERT INTO error_logs ({database_table_name}) VALUES ('{datetime.datetime.now(pytz.timezone(timezone)).strftime("%Y-%m-%d %X%z")}')")
        print("[{timestamp}]  Topic: {topic:<35}  |  Data: {data}".format(timestamp=datetime.datetime.now(pytz.timezone(timezone)).strftime("%Y-%m-%d %X%z"), topic="error_logs", data=str("error")))
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
