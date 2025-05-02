# python 3.11

import logging
import random
import psycopg2
import json
import datetime
import time
import pytz
import os
timezone = "Asia/Singapore"

from dotenv import load_dotenv
from psycopg2 import sql
from paho.mqtt import client as mqtt_client

load_dotenv()
# MQTT Connection Setup
BROKER_IP = os.getenv('MQTT_IP').replace("mqtt://", "")
BROKER_PORT = int(os.getenv('MQTT_PORT'))
TOPIC = ["apollo_air_1", 
"apollo_msr_2", 
"athom_smart_plug_v2", 
"airgradient_one"]
CLIENT_ID = f'Subscriber1'
# Optional depending on Broker Security level
USERNAME = os.getenv('MQTT_USERNAME')
PASSWORD = os.getenv('MQTT_PASSWORD')
sTime = time.time()

# MQTT Reconnect Setup
FIRST_RECONNECT_DELAY = 1
RECONNECT_RATE = 2
MAX_RECONNECT_COUNT = 100
MAX_RECONNECT_DELAY = 60
FLAG_EXIT = False

# DB Connection setup
conn = psycopg2.connect(host=os.getenv('DATABASE_IP'), dbname=os.getenv('DATABASE_USERNAME'), user=os.getenv('DATABASE_USERNAME'), password=os.getenv('DATABASE_PASSWORD'), port=os.getenv('DATABASE_PORT'))
conn.autocommit = True
cur = conn.cursor()

def on_connect(client, userdata, flags, rc):
    if rc == 0 and client.is_connected():
        print("Connected to MQTT Broker!")
        # Subscribed to all listed topics
        for i in TOPIC:
            
            cur.execute(f"SELECT id FROM {i};")
            ids = cur.fetchall()

            for id in ids:
                
                if id:  # if the database table for the device/s listed in TOPIC contains values, create the respective table/s for the device if it doesn't exist yet

                    fid = str(id).replace("(", "").replace("'", "").replace(")", "").replace(",", "")
                    if i == "apollo_air_1":

                        cur.execute(f"""CREATE TABLE IF NOT EXISTS {i}_{fid}(
                            timestamp timestamp with time zone NOT NULL,
                            co2 integer,
                            pressure double precision,
                            temperature double precision,
                            humidity double precision,
                            nox integer,
                            voc integer,
                            voc_quality text,
                            pm_1_0 double precision,
                            pm_2_5 double precision,
                            pm_4_0 double precision,
                            state boolean,
                            r integer,
                            g integer,
                            b integer,
                            brightness double precision,
                            pm_10_0 double precision
                            );""")

                    elif i == "apollo_msr_2":

                        cur.execute(f"""CREATE TABLE IF NOT EXISTS {i}_{fid}(
                            timestamp timestamp with time zone NOT NULL,
                            co2 integer,
                            pressure double precision,
                            temperature double precision,
                            light double precision,
                            uv_index double precision,
                            detection_distance double precision,
                            moving_distance double precision,
                            still_distance double precision,
                            zone_1_occupancy text,
                            zone_2_occupancy text,
                            zone_3_occupancy text,
                            detection_target text,
                            moving_target text,
                            still_target text,
                            state boolean,
                            r double precision,
                            g double precision,
                            b double precision,
                            brightness double precision,
                            buzzer_state boolean
                            );""")

                    elif i == "athom_smart_plug_v2":
                        
                        cur.execute(f"""CREATE TABLE IF NOT EXISTS {i}_{fid}(
                            timestamp timestamp with time zone NOT NULL,
                            current double precision,
                            energy double precision,
                            power double precision,
                            total_daily_energy double precision,
                            total_energy double precision,
                            voltage double precision,
                            relay_state boolean
                            );""")

                    elif i == "airgradient_one":
                        
                        cur.execute(f"""CREATE TABLE IF NOT EXISTS {i}_{fid}(
                            timestamp timestamp with time zone NOT NULL,
                            co2 integer,
                            temperature double precision,
                            humidity double precision,
                            nox integer,
                            voc integer,
                            pm_0_3 double precision,
                            pm_1_0 double precision,
                            pm_2_5 double precision,
                            pm_10_0 double precision,
                            state boolean,
                            r integer,
                            g integer,
                            b integer,
                            brightness double precision
                            );""")

                    else:

                        print(f"Device Type {i} does not exist")
                        
                    # After creating tables for each device, if not existing already, subscribe to the device topics
                    client.subscribe(f"{i}_{fid}/data")
                
                else:
                
                    print(f"No existing {i} devices listed in the database")


    else:
        print(f'Failed to connect, return code {rc}')

def on_disconnect(client, userdata, rc):

    cur.execute(f"INSERT INTO error_logs (server) VALUES ('disconnected ESP Devices')")

    logging.info("Disconnected with result code: %s", rc)
    reconnect_count, reconnect_delay = 0, FIRST_RECONNECT_DELAY
    while reconnect_count < MAX_RECONNECT_COUNT:
        logging.info("Reconnecting in %d seconds...", reconnect_delay)
        time.sleep(reconnect_delay)

        try:
            client.reconnect()
            logging.info("Reconnected successfully!")
            return
        except Exception as err:
            logging.error("%s. Reconnect failed. Retrying...", err)

        reconnect_delay *= RECONNECT_RATE
        reconnect_delay = min(reconnect_delay, MAX_RECONNECT_DELAY)
        reconnect_count += 1
    logging.info("Reconnect failed after %s attempts. Exiting...", reconnect_count)
    global FLAG_EXIT
    FLAG_EXIT = True

def on_message(client, userdata, msg):

    try:

        # Turns the message into a dictionary and save its keys to the variable
        table_name = msg.topic.replace("/data", "")
        msgJSON = json.loads(msg.payload)
        columns = list(msgJSON.keys())
        values = []

        for i in columns:
            values.append(msgJSON[i])
        
        # Input message values to the DB

        # Convert the dictionary into a JSON file and store to the DB (issue is heavier data sent via tcp and more processing on the client side when there are multiple clients)
        ### cur.execute(f"INSERT INTO devices ({zeus.replace("-", "_")}) VALUES ('{json.dumps(oner, indent = 4)}')")
        # Convert the dictionary into a JSON file and store to the DB

        # Could be used for {device}_{fid}:timestamp/{option1}/{option2}/{option3}
        # Where each dictionary key is the same name as the DB column, store the corresponding dictionary value to the key column
        cur.execute(f"INSERT INTO {table_name} ({str(columns).replace("'", "").replace("[", "").replace("]", "")}) VALUES ({str(values).replace("[", "").replace("]", "")})")
        # Where each dictionary key is the same name as the DB column, store the corresponding dictionary value to the key column

        # log message packet
        print("[{timestamp}]  Topic: {topic:<35}  |  Data: {data}".format(timestamp=msgJSON["timestamp"], topic=msg.topic, data=str(msg.payload.decode("utf-8"))))
        return

    except Exception as err:

        try:
            
            try:
    
                cur.execute(f"INSERT INTO error_logs ({table_name}) VALUES ('{str(msg.payload.decode("utf-8"))}')")
    
            except:
    
                cur.execute(f"ALTER error_logs ADD COLUMN {table_name} text")
                cur.execute(f"INSERT INTO error_logs ({table_name}) VALUES ('{str(msg.payload.decode("utf-8"))}')")
    
            # log error packet
            print("[{timestamp}]  Topic: {topic:<35}  |  Data: {data}".format(timestamp=datetime.datetime.now(pytz.timezone(timezone)).strftime("%Y-%m-%d %X%z"), topic="error_logs", data=str(msg.payload.decode("utf-8"))))
            return
            
        except:

            print(f"[{datetime.datetime.now(pytz.timezone(timezone)).strftime("%Y-%m-%d %X%z")}] Unreadable message payload from {table_name}")
            return


# Establish Broker Connection
def connect_mqtt():
    client = mqtt_client.Client(CLIENT_ID)
    client.username_pw_set(USERNAME, PASSWORD)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER_IP, BROKER_PORT, keepalive=120)
    client.on_disconnect = on_disconnect
    return client

def run():
    logging.basicConfig(format='%(asctime)s - %(levelname)s: %(message)s',
                        level=logging.DEBUG)
    client = connect_mqtt()
    client.loop_forever()

if __name__ == '__main__':
    run()
