#!/bin/bash

exec python3 ESPDevices_to_Database.py &
exec python3 SensiboAirPro_to_Database.py &
exec python3 Zigbee2MQTT_to_Database.py &
