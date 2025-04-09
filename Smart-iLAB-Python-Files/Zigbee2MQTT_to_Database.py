import logging
import psycopg2
import json
import time
import datetime
import pytz
import os
timezone = "Asia/Singapore"

from dotenv import load_dotenv
from psycopg2 import sql
from paho.mqtt import client as mqtt_client
load_dotenv()

# mqtt broker details
BROKER_IP = os.getenv('MQTT_IP').replace("mqtt://", "")
BROKER_PORT = int(os.getenv('MQTT_PORT'))
BROKER_USERNAME = os.getenv('MQTT_USERNAME')
BROKER_PASSWORD = os.getenv('MQTT_PASSWORD')
BROKER_CLIENT_ID = f'Zigbee2MQTT to Database Code'
FIRST_RECONNECT_DELAY = 1
RECONNECT_RATE = 2
MAX_RECONNECT_COUNT = 100
MAX_RECONNECT_DELAY = 60
FLAG_EXIT = False

# database variables
database_row, database_table_name = {}, ""
data, columns, values = {}, {}, {}
id_index, type_index, base_topic_index = None, None, None
light_state_index, light_brightness_index, light_color_temp_index = None, None, None
switch_state_index = None
blinds_state_index, blinds_position_index, blinds_motor_state_index, blinds_running_index = None, None, None, None


# initialize connection to database and create cursor
conn = psycopg2.connect(host=os.getenv('DATABASE_IP'), dbname=os.getenv('DATABASE_USERNAME'), user=os.getenv('DATABASE_USERNAME'), password=os.getenv('DATABASE_PASSWORD'), port=os.getenv('DATABASE_PORT'))
conn.autocommit = True
cur1 = conn.cursor()
cur2 = conn.cursor()



def on_disconnect(client, userdata, rc):
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
    return

def on_connect(client, userdata, flags, rc):
    if rc == 0 and client.is_connected():
        print("\nConnected to MQTT Broker!\n")

        global database_row, database_table_name
        global data, columns, values
        global id_index, type_index, base_topic_index
        global light_state_index, light_brightness_index, light_color_temp_index
        global switch_state_index
        global blinds_state_index, blinds_position_index, blinds_motor_state_index, blinds_running_index

        # get all the zigbee2mqtt device IDs from the database
        cur1.execute("SELECT * FROM zigbee2mqtt;")
        id, type, base_topic = "", "", ""

        # get the column order of the zigbee2mqtt table
        cur2.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'zigbee2mqtt';")
        data = tuple(cur2)
        id_index, type_index, base_topic_index = data.index(('id', 'text')), data.index(('type', 'text')), data.index(('base_topic', 'text'))

        # subscribe to the MQTT topics using the zigbee2mqtt device IDs
        for row in cur1:
            id = row[id_index]
            type = row[type_index]
            base_topic = row[base_topic_index]
            
            # do not subscribe to group topics, get the column order of the tables for each type of device
            if type == 'group':
                continue
            elif type == 'lights' and light_state_index == None:
                cur2.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'zigbee2mqtt_{id}';")
                data = tuple(cur2)
                light_state_index = data.index(('state', 'text')) 
                light_brightness_index = data.index(('brightness', 'integer')) 
                light_color_temp_index= data.index(('color_temp', 'integer'))
            elif type == 'switch' and switch_state_index == None:
                cur2.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'zigbee2mqtt_{id}';")
                data = tuple(cur2)
                switch_state_index = data.index(('state', 'text'))
            elif type == 'blinds' and blinds_state_index == None:
                cur2.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'zigbee2mqtt_{id}';")
                data = tuple(cur2)
                blinds_state_index = data.index(('state', 'text'))
                blinds_position_index = data.index(('position', 'integer'))
                blinds_motor_state_index = data.index(('motor_state', 'text'))
                blinds_running_index = data.index(('running', 'boolean'))

            # subscribe to the MQTT topics
            client.subscribe(f"{base_topic}/{id}/set")
            print(f"Subscribed to {base_topic}/{id}/set")
            client.subscribe(f"{base_topic}/{id}")
            print(f"Subscribed to {base_topic}/{id}")

            # publish to the /get topic to get the latest state of the device 
            client.publish(f"{base_topic}/{id}/get", '{"state": ""}')
        print()
    else:
        print(f'Failed to connect, return code {rc}')
    return

def on_message(client, userdata, msg):
    try:
        # check if there is any data in the message payload
        if not msg.payload:
            print(f'Message from {msg.topic} has empty payload.')
            return

        # temporarily unsubscribe from the topic where the message was received
        client.unsubscribe(msg.topic) 

        global database_row, database_table_name
        global data, columns, values
        global id_index, type_index, base_topic_index
        
        # get the database table using the topic
        database_table_name = ("zigbee2mqtt" + msg.topic[msg.topic.find(f"/"):]).replace("/set","").replace("/","_")
        
        # get the latest data from the zigbee2mqtt device from the database
        cur1.execute(f"select * from {database_table_name} ORDER BY timestamp DESC LIMIT 1")
        last_inserted_row = cur1.fetchone()

        # input the timestamp for the received packet
        database_row.update({"timestamp":datetime.datetime.now(pytz.timezone(timezone)).strftime("%Y-%m-%d %X%z")})

        data = json.loads(msg.payload)
        # store the data to be inserted into the database, parameters are based on the device type
        cur1.execute(f"SELECT * FROM zigbee2mqtt WHERE id = '{database_table_name.replace("zigbee2mqtt_", "")}';")
        device_type = (cur1.fetchone())[type_index]
        
        if device_type == "lights":
            if "state" in data:
                database_row.update({"state":data["state"]})
            else:
                database_row.update({"state":last_inserted_row[light_state_index]})
            if "brightness" in data:
                database_row.update({"brightness":data["brightness"]})
            else:
                database_row.update({"brightness":last_inserted_row[light_brightness_index]})
            if "color_temp" in data:
                database_row.update({"color_temp":data["color_temp"]})
            else:
                database_row.update({"color_temp":last_inserted_row[light_color_temp_index]})
        elif device_type == "switch":
            if "state" in data:
                database_row.update({"state":data["state"]})
            else:
                database_row.update({"state":last_inserted_row[switch_state_index]})
        elif device_type == "blinds":
            if "state" in data:
                database_row.update({"state":data["state"]})
            else:
                database_row.update({"state":last_inserted_row[blinds_state_index]})
            if "position" in data:
                database_row.update({"position":data["position"]})
            else:
                database_row.update({"position":last_inserted_row[blinds_position_index]})
            if "motor_state" in data:
                database_row.update({"motor_state":data["motor_state"]})
            else:
                database_row.update({"motor_state":last_inserted_row[blinds_motor_state_index]})
            if "running" in data:
                database_row.update({"running":data["running"]})
            else:
                database_row.update({"running":last_inserted_row[blinds_running_index]})
        
        # build and execute the query to insert the data into the database
        columns = str(list(database_row.keys())).replace("[","").replace("]", "").replace(",", "").replace("'","").replace(" ",",")
        values = str(list(database_row.values())).replace("[","").replace("]", "").replace(",", "").replace(" ",",")
        cur1.execute(f"INSERT INTO {database_table_name} ({columns}) VALUES ({values})")

        # resubscribe to the topic
        client.subscribe(msg.topic)

        # print the topic and the data inserted into the database
        print("[{timestamp}]  Topic: {topic:<35}  |  Data: {data}".format(timestamp=database_row['timestamp'], topic=msg.topic, data=data))
        database_row.clear()
        return

    except:

        # database error logging and terminal error logging
        cur1.execute(f"INSERT INTO error_logs ({database_table_name}) VALUES ('{str(database_row).replace("'", "")}')")
        print("[{timestamp}]  Topic: {topic:<35}  |  Data: {data}".format(timestamp=database_row['timestamp'], topic="error_logs", data=str(database_row)))
        database_row.clear()
        return
        



if __name__ == "__main__":
    print("Zigbee2MQTT to Database code started!\n")
    
    logging.basicConfig(format='%(asctime)s - %(levelname)s: %(message)s', level=logging.DEBUG)
    client = mqtt_client.Client(client_id=BROKER_CLIENT_ID)
    client.username_pw_set(BROKER_USERNAME, BROKER_PASSWORD)
    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    client.connect(BROKER_IP, BROKER_PORT, keepalive=120)
    client.loop_forever()
