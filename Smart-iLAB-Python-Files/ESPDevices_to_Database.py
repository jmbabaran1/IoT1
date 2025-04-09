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
TOPIC = ["apollo_air_1_87b074/data", 
"apollo_air_1_88e4c8/data", 
"apollo_air_1_88e590/data", 
"apollo_air_1_89e8d8/data", 
"apollo_msr_2_2b7624/data", 
"apollo_msr_2_87a5f4/data", 
"apollo_msr_2_c07ce8/data", 
"apollo_msr_2_cc0b5c/data", 
"athom_smart_plug_v2_9d86aa/data", 
"athom_smart_plug_v2_9d86e0/data", 
"athom_smart_plug_v2_9d93d2/data", 
"athom_smart_plug_v2_9d923d/data", 
"athom_smart_plug_v2_9d929b/data", 
"athom_smart_plug_v2_9d8665/data", 
"athom_smart_plug_v2_9d9293/data", 
"athom_smart_plug_v2_9d9572/data",
"apollo_air_1_889720/data", 
"apollo_air_1_87f510/data", 
"apollo_air_1_2da640/data", 
"apollo_air_1_89ea14/data", 
"apollo_msr_2_89f464/data", 
"apollo_msr_2_87a5dc/data", 
"apollo_msr_2_1ee998/data", 
"apollo_msr_2_87a5ec/data", 
"athom_smart_plug_v2_9d88e7/data", 
"athom_smart_plug_v2_9d924e/data", 
"athom_smart_plug_v2_9d929e/data", 
"athom_smart_plug_v2_9d9265/data", 
"athom_smart_plug_v2_9d9421/data", 
"athom_smart_plug_v2_9d8877/data", 
"athom_smart_plug_v2_9d89d4/data", 
"athom_smart_plug_v2_9d8a03/data",
"apollo_air_1_889b88/data", 
"apollo_air_1_889938/data", 
"apollo_air_1_88e85c/data", 
"apollo_air_1_89e548/data", 
"apollo_msr_2_1ef110/data", 
"apollo_msr_2_87a298/data", 
"apollo_msr_2_89304c/data", 
"apollo_msr_2_88edc8/data", 
"athom_smart_plug_v2_9d92a3/data", 
"athom_smart_plug_v2_9d88e6/data", 
"athom_smart_plug_v2_9d8718/data", 
"athom_smart_plug_v2_9cda9a/data", 
"athom_smart_plug_v2_9d3535/data", 
"athom_smart_plug_v2_9d90b9/data", 
"athom_smart_plug_v2_9d90c3/data", 
"athom_smart_plug_v2_9d94a6/data",
"apollo_air_1_88970c/data", 
"apollo_air_1_2deb24/data", 
"apollo_air_1_89e5f0/data", 
"apollo_air_1_cc8f24/data", 
"apollo_msr_2_cd7014/data", 
"apollo_msr_2_c660fc/data", 
"apollo_msr_2_c8f5b4/data", 
"apollo_msr_2_c7b650/data", 
"athom_smart_plug_v2_9d97ec/data", 
"athom_smart_plug_v2_9d8671/data", 
"athom_smart_plug_v2_9d927c/data", 
"athom_smart_plug_v2_9d356f/data", 
"athom_smart_plug_v2_9d88c5/data", 
"athom_smart_plug_v2_9d887f/data", 
"athom_smart_plug_v2_9cdee5/data", 
"athom_smart_plug_v2_9d893e/data",
"airgradient_one_6f31cc/data"]
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
            client.subscribe(i)
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

        # Could be used for {device}_{id}:timestamp/{option1}/{option2}/{option3}
        # Where each dictionary key is the same name as the DB column, store the corresponding dictionary value to the key column
        cur.execute(f"INSERT INTO {table_name} ({str(columns).replace("'", "").replace("[", "").replace("]", "")}) VALUES ({str(values).replace("[", "").replace("]", "")})")
        # Where each dictionary key is the same name as the DB column, store the corresponding dictionary value to the key column

        # log message packet
        print("[{timestamp}]  Topic: {topic:<35}  |  Data: {data}".format(timestamp=msgJSON["timestamp"], topic=msg.topic, data=str(msg.payload.decode("utf-8"))))
        return

    except Exception as err:

        cur.execute(f"INSERT INTO error_logs ({table_name}) VALUES ('{str(msg.payload.decode("utf-8"))}')")

        # log error packet
        print("[{timestamp}]  Topic: {topic:<35}  |  Data: {data}".format(timestamp=datetime.datetime.now(pytz.timezone(timezone)).strftime("%Y-%m-%d %X%z"), topic="error_logs", data=str(msg.payload.decode("utf-8"))))
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
