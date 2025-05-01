# IoT1

## Project Description

A testbed developed for the Smart i-LAB Project's IoT Platform located at the University of the Philippines - Diliman Campus' Electrical and Electronics Engineering Institute (EEEI) Room 308. This is implemented through RESTful API standard web-based access points for sensor data acquisition and device controls supported by a TimescaleDB (PostgreSQL-based) database, Python databridge APIs, an EMQX Broker (MQTT-based communication protocol), and Home Assistant configuration and device access tools. Included with the project is a web-based Digital visualization or _Digital Twin_ of the Smart i-LAB, reflecting the status of, as well as providing some level of basic control to, some of the functionalities within the lab. This functions both as an aid to remote experimentation/testing and serves as a prime example of the capabilities/functionalities of the testbed since the Digital Twin will be entirely dependent on the RESTful API's endpoints for its core functionalities.

## How to Use the Repository (Subject to Changes)

### Pre-Requisites
- Docker
  - Docker CLI or Docker Desktop
  - Engine and Compose
- Database
  - With TimeScaleDB Integration
  - Specific table setup (A script for completing the database table setup is planned to be released in the future)
    - {device_name} table in database containing all existing devices' IDs
    - {device-name-separated-by-underscores}_{id} hypertable for each existing device
      - 1 Column for each sensor data (naming based on config)
    - Security-related tables
    - table for transaction history
  - Note: Errors *WILL* occur if naming conventions and configuration specifications are not followed, a link will be provided in the future for references and files to help with setup
- EMQX
  - EMQX Open Source
  - Necessary setup made (with username, password, etc)
  - Note: Paid version with a PostgreSQL database integration exists rendering some Python API databridges obsolete at the potential cost of TimeScaleDB functionalities (used in some REST API endpoints) and data distribution control
- Configured Devices
  - Integrated Devices:
    - apollo air 1
    - apollo msr 2
    - athom smart plug v2
    - airgradient one
    - sensibo air pro
    - zigbee devices
  - Configuration References:
    - [ESP Devices](https://github.com/Julius-Ipac/Smart-iLAB)
    - Zigbee2MQTT(placeholder)
  - Specifications
    - Naming: {device-name-separated-by-dashes}-{id}
      - '-' replaced by '_' in database
      - append '/data' to MQTT topic name in Python API Bridge and for the device's MQTT publish configuration
      - append '/{actuator}' (e.g. light, buzzer, etc) to device subscriptions for actuator commands coming from REST API

Note: Database and EMQX can be integrated to docker compose in a future repository update

### Docker Compose

The project is implemented in a Linux Ubuntu 24.04.2 LTS server Operating System but is functional within other Operating Systems with the use of Docker (details regarding this accessible [here](https://www.docker.com/why-docker/)). Dockerfile setup for the REST API, Digital Twin, and Python API Bridges are finalized and already integrated to the [compose.yaml](compose.yaml) file. To launch a new release of these services on your machine, fill in the required details in the [compose.yaml](compose.yaml) file under ports and environment sections for each service. Each environment variable are self-explanatory and are under the assumption that some tools/services are already running as a pre-requisite to the launching of this release. After filling these in, use the appropriate docker command to compose using the [compose.yaml](compose.yaml) file at the repository's directory (IoT1).

## Limitations
*To add: Customizability issues particularly in naming or structures and possible errors to look out for due to lack of complete error catching, limitations set by the developers of the tools used, etc* 
### Database
- Specific naming standard, also has to be in sync with the databridge
### REST API
- TimescaleDB buckets not fully utilized
### EMQX
- Update Frequency: Limited to the update frequency set during device configuration
  - The project was implemented with a 0.1Hz data update frequency + datapoints produced by changes in device actuator changes
- For more information on other limitations such as connection and topic limits, refer to [this](https://docs.emqx.com/en/emqx/latest/getting-started/restrictions.html).
### Python API Bridges
- Currently, Sensibo Air Pro Databridge encounters an error when a connection error occurs
- The data distribution algorithm for MQTT devices will only work given specific naming standards:
  - naming standards apply to both the MQTT topics used and database table names used
  - ESP algorithm converts from MQTT topic "device_name_id/data" to database table "device-name-id", all topics are listed in an array manually
  - Zigbee algorithm converts from MQTT topic "device_name_id/set" to database table "zigbee2mqtt-deviceID", all topics are based on database table "zigbee2mqtt"
