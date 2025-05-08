// Index JS
// Author: SSL - IoT 1
// University of the Philippines - Diliman Electrical and Electronics Engineering Institute

// ------- START NodeJS/Express Setup ------ //
// Require Node.js File System
const fs = require("fs/promises");
// Require Express connection
const express = require("express");
// Require CORS communication *NOT USED, BUT FOR FRONT-END*
const cors = require("cors");
// Require lodash for randomization *NOT USED YET -- ID'S, TOKENS*
const _ = require("lodash");
// Require uuid to Generate Unique IDs *NOT USED YET*
const { v4: uuidv4, parse} = require("uuid");
// dotenv package
require('dotenv').config();
// MQTT Package
const mqtt = require("mqtt");
const url = `${process.env.MQTT_IP}:${process.env.MQTT_PORT}`;
// Server Start-up
const app = express();
app.use(cors({origin: '*'}));

// Add middleware to support JSON
app.use(express.json());
// -------- END NodeJS/Express Setup ------- //


// -- START PostgreSQL Connection Options -- //
const {Client} = require('pg')
var format = require('pg-format');
const {Result} = require("lodash");

const client = new Client({
    host: process.env.DATABASE_IP,   // Requires eduroam or EEE VPN access
    user: process.env.DATABASE_USERNAME,
    port: process.env.DATABASE_PORT,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
})

client.connect();
// --- END PostgreSQL Connection Options --- //


// ----- START MQTT Connection Options ----- //
const options = {
    // Clean session
    clean: true,
    connectTimeout: 4000,
    // Authentication
    clientId: process.env.MQTT_CLIENT_ID,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: process.env.MQTT_RECONNECT_PERMISSION,
}

const mqttclient = mqtt.connect(url, options);
// ------ END MQTT Connection Options ------ //



// --- START Standardized Function Calls --- //

// Server logging

async function server_Log(logs) {
    try{
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const mseconds = String(date.getMilliseconds()).padStart(3, '0');

        console.log(`[${year}-${month}-${day} ${hours}:${minutes}:${seconds}:${mseconds}] ${logs}`);
        return;
    }catch(err){
        console.log(`[${year}-${month}-${day} ${hours}:${minutes}:${seconds}:${mseconds}] Internal Server Error: An unexpected error occurred in the server logging function\n${err}`);
        return '';
    }
}

// ____ SECURITY START ____

async function USER_is_available(user_name) {
    try{
        const queryResult = await client.query('SELECT * FROM users WHERE user_name = $1;', [user_name]);
        return !(queryResult.rowCount === 0);
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred in USER_is_available function\n${err}`);
        return false;
    }
}

async function KEY_is_available(api_key) {
    try{
        const queryResult = await client.query('SELECT * FROM users WHERE api_key = $1;', [api_key]);
        return !(queryResult.rowCount === 0);
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred in KEY_is_available function\n${err}`);
        return false;
    }
}

async function RETURN_access_level(api_key) {
    try{
        const result = await client.query(`SELECT * FROM users WHERE api_key = $1;`, [api_key]);
        return result.rows[0]["access_level"];
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred in RETURN_access_level function\n${err}`);
        return -1;
    }
}

async function RETURN_user_name(api_key) {
    try{
        const result = await client.query(`SELECT * FROM users WHERE api_key = $1;`, [api_key]);
        return result.rows[0]["user_name"];
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred in RETURN_user_name function\n${err}`);
        return '';
    }
}

async function SECURITY_CHECK(res, req, api_key, array) {
    try{
        let to_verify = await KEY_is_available(api_key);
        if(to_verify){
            access_level = await RETURN_access_level(api_key);
        }else{
            server_Log(`Not Found: API Key does not exist`);
            res.status(401).json({ error: `API Key does not exist: Ensure your API key is valid and correctly provided.`});
            return false;
        }

        if(array.includes(access_level)){
            return true;  //check if access level matches one of the described values
        }

        server_Log(`Forbidden Request: User does not have access to this endpoint`);
        res.status(403).json({ error: `Forbidden Request: User does not have access to this endpoint`});
        return false;
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred in SECURITY_CHECK function\n${err}`);
        return false;
    }
}
// ____ SECURITY END ____

// ____ TRANSACTIONS START ____
async function getCurrentTimestamp() {
    try{
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred in getCurrentTimestamp function\n${err}`);
        return '';
    }
}

async function UPDATE_transactions(api_key, type, uri, success) {
    try{
        if(await RETURN_user_name(api_key)==="Digital_Twin"){
            return;
        }

        client.query(`INSERT INTO transactions (timestamp, user_name, type, uri, success) VALUES ($1, $2, $3, $4, $5);`, [await getCurrentTimestamp(), await RETURN_user_name(api_key), type, uri, success], (err, response) => {
            if(!err){
                server_Log("Successfully logged transaction");
            }else{
                server_Log("ERROR: Unsuccessfully logged transaction");
            }
        })
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred in UPDATE_transactions function\n${err}`);
    }
}
// ____ TRANSACTIONS END ____

// ____ ENDPOINTS START ____
// Check if an ID is available in the database
async function ID_is_available(table, deviceID){
    try{
        const queryResult = await client.query(format('SELECT * FROM %I WHERE id = $1;', table), [deviceID]);
        return !(queryResult.rowCount === 0);
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred in ID_is_available function\n${err}`);
        return false;
    }
}

// GET IDs
async function GET_ids(res, req, deviceName, api_key, type, uri){
    try{
        if(await SECURITY_CHECK(res, req, api_key, [0,1,2]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const queryResult = await client.query(`SELECT * FROM ${deviceName.toLowerCase().replaceAll("-","_").replaceAll(" ","_")};`);

        if(queryResult.rowCount){
            let ids = [];
            for (let index = 0; index < queryResult.rowCount; index++) {
                ids.push(queryResult.rows[index]["id"]);
            }
            server_Log(`Successfully returned all available ${deviceName} IDs`);
            UPDATE_transactions(api_key, type, uri, true);
            res.json(ids);
        }else{
            server_Log(`There are no ${deviceName} IDs to return`);
            UPDATE_transactions(api_key, type, uri, false);
            res.json([]);
        }
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
}

// GET most recent/historical data
async function GET_data(res, req, deviceName, api_key, type, uri){
    try{
        if(await SECURITY_CHECK(res, req, api_key, [0,1,2]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const deviceID = req.params.id;
        // Optional arguments; will be NULL if not provided
        const timeStart = req.query.time_start;
        const timeEnd = req.query.time_end;

        // Step 1: Check if an deviceName with ID: deviceID is available
        if(await ID_is_available(`${deviceName.toLowerCase().replaceAll("-","_").replaceAll(" ","_")}`, deviceID) === false){
            server_Log(`Not Found: ${deviceName} with ID: ${deviceID} does not exist`);
            UPDATE_transactions(api_key, type, uri, false);
            return res.status(404).json({error: `Not Found: ${deviceName} with ID: ${deviceID} does not exist`});
        }

        // Step 2: Return data based on parameter values
        if(!timeStart && !timeEnd){
            // [A] If NO optional parameter values were given
            const queryText = format('SELECT * FROM %I ORDER BY timestamp DESC LIMIT 1;', `${deviceName.toLowerCase().replaceAll("-","_").replaceAll(" ","_")}_${deviceID.replaceAll(".","_")}`)

            client.query(queryText, (err, data) => {
                if(err){
                    server_Log(`Internal Server Error: Unable to get most recent data from ${deviceName} with ID: ${deviceID}`);
                    return res.status(500).send(`Internal Server Error: Unable to get most recent data from ${deviceName} with ID: ${deviceID}`);
                }
                server_Log(`Successfully returned most recent data from ${deviceName} with ID: ${deviceID}`);
                UPDATE_transactions(api_key, type, uri, true);
                res.json(data.rows[0]);
            })
        }else if(timeStart && timeEnd){
            // [B] If optional parameter values for timeStart and timeEnd were given
            const queryText = format('SELECT * FROM %I WHERE timestamp BETWEEN $1 AND $2;', `${deviceName.toLowerCase().replaceAll("-","_").replaceAll(" ","_")}_${deviceID.replaceAll(".","_")}`);
            const queryValues = [timeStart, timeEnd];

            client.query(queryText, queryValues, (err, data) => {
                if(err){
                    server_Log(`Bad Request: Invalid arguments in historical data GET request for ${deviceName} with ID: ${deviceID}`);
                    return res.status(400).json({error: `Bad Request: Invalid arguments in historical data GET request for ${deviceName} with ID: ${deviceID}`});
                }
                server_Log(`Successfully returned historical data (${timeStart} to ${timeEnd}) from ${deviceName} with ID: ${deviceID}`);
                UPDATE_transactions(api_key, type, uri, true);
                res.json(data.rows);
            })
        }else{
            // [C] If optional parameter values are INCOMPLETE (Error 400)
            server_Log(`Bad Request: Incomplete parameters in GET request for ${deviceName} with ID: ${deviceID}`);
            UPDATE_transactions(api_key, type, uri, false);
            return res.status(400).json({error: `Bad Request: Incomplete parameters in GET request for ${deviceName} with ID: ${deviceID}`});
        }
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
}

// GET average of historical data
async function GET_avg(res, req, deviceName, api_key, type, uri){
    try{
        if(await SECURITY_CHECK(res, req, api_key, [0,1,2]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const deviceID = req.params.id;
        const specData = req.query.sensData;
        // Optional arguments; will be NULL if not provided
        const timeStart = req.query.time_start;
        const timeEnd = req.query.time_end;

        // Step 1: Check if an deviceName with ID: deviceID is available
        if(await ID_is_available(`${deviceName.toLowerCase().replaceAll("-","_").replaceAll(" ","_")}`, deviceID) === false){
            server_Log(`Not Found: ${deviceName} with ID: ${deviceID} does not exist`);
            UPDATE_transactions(api_key, type, uri, false);
            return res.status(404).json({error: `Not Found: ${deviceName} with ID: ${deviceID} does not exist`});
        }

        // Step 2: Return data based on parameter values
        if(!timeStart && !timeEnd && specData){
            // [A] If NO optional parameter values were given
            const queryText = format(`SELECT average(time_weight('Linear', timestamp, %I)) as time_weighted_average FROM %I WHERE timestamp > NOW() - INTERVAL '1 day';`, `${specData}`, `${deviceName.toLowerCase().replaceAll("-","_").replaceAll(" ","_")}_${deviceID.replaceAll(".","_")}`);

            client.query(queryText, (err, data) => {
                if(err || data.rowCount === 0){
                    server_Log(`Internal Server Error: Unable to get average historical ${specData} data from ${deviceName} with ID: ${deviceID}`);
                    return res.status(500).send(`Internal Server Error: Unable to get average historical ${specData} data from ${deviceName} with ID: ${deviceID}`);
                }
                server_Log(`Successfully returned average historical ${specData} data (last 24 hours) from ${deviceName} with ID: ${deviceID}`);
                UPDATE_transactions(api_key, type, uri, true);
                res.json(data.rows[0]);
            })
        }else if(timeStart && timeEnd && specData){
            // [B] If optional parameter values for timeStart and timeEnd were given
            const queryText = format(`SELECT average(time_weight('Linear', timestamp, %I)) as time_weighted_average FROM %I WHERE timestamp BETWEEN $1 AND $2;`, `${specData}`, `${deviceName.toLowerCase().replaceAll("-","_").replaceAll(" ","_")}_${deviceID}`);
            const queryValues = [timeStart, timeEnd];

            client.query(queryText, queryValues, (err, data) => {
                if(err || data.rowCount === 0){
                    server_Log(`Bad Request: Invalid arguments in average historical ${specData} data GET request for ${deviceName} with ID: ${deviceID}`);
                    return res.status(400).json({error: `Bad Request: Invalid arguments in average historical ${specData} data GET request for ${deviceName} with ID: ${deviceID}`});
                }
                server_Log(`Successfully returned average historical ${specData} data (${timeStart} to ${timeEnd}) from ${deviceName} with ID: ${deviceID}`);
                UPDATE_transactions(api_key, type, uri, true);
                res.json(data.rows);
            })
        }else{
            // [C] If optional parameter values are INCOMPLETE (Error 400)
            server_Log(`Bad Request: Incomplete parameters in GET average historical data request for ${deviceName} with ID: ${deviceID}`);
            UPDATE_transactions(api_key, type, uri, false);
            return res.status(400).json({error: `Bad Request: Incomplete parameters in GET average historical data request for ${deviceName} with ID: ${deviceID}`});
        }
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
}

// POST LED light/strip
async function POST_light(res, req, deviceName, api_key, type, uri){
    try{
        if(await SECURITY_CHECK(res, req, api_key, [0,2]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const deviceID = req.params.id;
        // Optional arguments; will be NULL if not provided
        const lightState = req.query.state;
        const lightRed   = req.query.red;
        const lightGreen = req.query.green;
        const lightBlue  = req.query.blue;
        const lightBrightness = req.query.brightness;

        // Step 1: Check if an deviceName with ID: deviceID is available
        if(await ID_is_available(`${deviceName.toLowerCase().replaceAll("-","_").replaceAll(" ","_")}`, deviceID) === false){
            server_Log(`Not Found: ${deviceName} with ID: ${deviceID} does not exist`);
            UPDATE_transactions(api_key, type, uri, false);
            return res.status(404).json({error: `Not Found: ${deviceName} with ID: ${deviceID} does not exist`});
        }

        // Step 2: Check if at least one optional parameter was given
        if(!lightState && !lightRed && !lightGreen && !lightBlue && !lightBrightness){
            server_Log(`Bad Request: Incomplete parameters in POST request for ${deviceName} with ID: ${deviceID}`);
            UPDATE_transactions(api_key, type, uri, false);
            return res.status(400).json({error: `Bad Request: Incomplete parameters in POST request for ${deviceName} with ID: ${deviceID}`});
        }

        // Step 3: Check if the given values are valid and build the JSON file to be published
        let toPublish = {};
        if(lightState){
            if(lightState !== "ON" && lightState !== "OFF"){
                server_Log(`Bad Request: Invalid 'state' parameter in POST request for ${deviceName} with ID: ${deviceID}. \n - Given value: ${lightState} \n - Possible values: "ON", "OFF"`);
                UPDATE_transactions(api_key, type, uri, false);
                return res.status(400).json({error: `Bad Request: Invalid 'state' parameter in POST request for ${deviceName} with ID: ${deviceID}. | Given value: ${lightState} | Possible values: "ON", "OFF"`});
            }
            toPublish['state'] = lightState;
        }
        if(lightRed){
            if(lightRed < 0 || lightRed > 1){
                server_Log(`Bad Request: Invalid 'red' parameter in POST request for ${deviceName} with ID: ${deviceID}. \n - Given value: ${lightRed} \n - Possible values: any value from 0-1`);
                UPDATE_transactions(api_key, type, uri, false);
                return res.status(400).json({error: `Bad Request: Invalid 'red' parameter in POST request for ${deviceName} with ID: ${deviceID}. | Given value: ${lightRed} | Possible values: any value from 0-1`});
            }
            toPublish['r'] = lightRed;
        }
        if(lightGreen){
            if(lightGreen < 0 || lightGreen > 1){
                server_Log(`Bad Request: Invalid 'green' parameter in POST request for ${deviceName} with ID: ${deviceID}. \n - Given value: ${lightGreen} \n - Possible values: any value from 0-1`);
                UPDATE_transactions(api_key, type, uri, false);
                return res.status(400).json({error: `Bad Request: Invalid 'green' parameter in POST request for ${deviceName} with ID: ${deviceID}. | Given value: ${lightGreen} | Possible values: any value from 0-1`});
            }
            toPublish['g'] = lightGreen;
        }
        if(lightBlue){
            if(lightBlue < 0 || lightBlue > 1){
                server_Log(`Bad Request: Invalid 'blue' parameter in POST request for ${deviceName} with ID: ${deviceID}. \n - Given value: ${lightBlue} \n - Possible values: any value from 0-1`);
                UPDATE_transactions(api_key, type, uri, false);
                return res.status(400).json({error: `Bad Request: Invalid 'blue' parameter in POST request for ${deviceName} with ID: ${deviceID}. | Given value: ${lightBlue} | Possible values: any value from 0-1`});
            }
            toPublish['b'] = lightBlue;
        }
        if(lightBrightness){
            if(lightBrightness < 0 || lightBrightness > 1){
                server_Log(`Bad Request: Invalid 'brightness' parameter in POST request for ${deviceName} with ID: ${deviceID}. \n - Given value: ${lightBrightness} \n - Possible values: any value from 0-1`);
                UPDATE_transactions(api_key, type, uri, false);
                return res.status(400).json({error: `Bad Request: Invalid 'brightness' parameter in POST request for ${deviceName} with ID: ${deviceID}. | Given value: ${lightBrightness} | Possible values: any value from 0-1`});
            }
            toPublish['brightness'] = lightBrightness;
        }

        // Step 4: Publish the JSON file to the correct MQTT topic to set the LED light/strip
        mqttclient.publish(`${deviceName.toLowerCase().replace("-","_").replace(" ","_")}_${deviceID}/light`, JSON.stringify(toPublish), { qos: 2 }, (err) => {
            if (err) {
                server_Log(`Internal Server Error: MQTT Connection Failed`);
                UPDATE_transactions(api_key, type, uri, false);
                return res.status(500).json({error: `Internal Server Error: MQTT Connection Failed`});
            }else{
                server_Log(`POST request to ${deviceName} with ID: ${deviceID} OK`);
                server_Log(` - MQTT Topic: ${deviceName.toLowerCase().replace("-","_").replace(" ","_")}_${deviceID}/light`);
                server_Log(` - JSON File: ${JSON.stringify(toPublish)}`);
                UPDATE_transactions(api_key, type, uri, true);
                return res.status(200).send(`POST request to ${deviceName} with ID: ${deviceID} OK`);
            }
        });
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }

}
// ____ ENDPOINTS END ____

// ---- END Standardized Function Calls ---- //


// ----------- START Define REST Endpoints ---------- //

// START Digital Twin Endpoints -------------------------- //

// (#1) GET "/access/:api_key" -- Return access_level of api_key
app.get("/access/:api_key", async (req,res)=>{
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        server_Log(`Successfully returned access level`);
        UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);

        const api_key = req.params.api_key;
        let to_verify = await KEY_is_available(api_key);
        if(to_verify){ // check if API Key is valid
            let access_level = await RETURN_access_level(api_key);
            res.json(access_level);
        }else{
            res.json(-1); // RETURN -1 if API Key is NOT Valid
        }
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// END Digital Twin Endpoints -------------------------- //


// START User Management Endpoints -------------------------- //

// (#1) GET "/users" -- Return List of Users
app.get("/users", async (req,res)=>{
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        //RETURN LIST OF USERS
        client.query(`SELECT * FROM users`, (err, response) => {
            if(response){
                let arr_user_names = [];
                for (let user in response.rows){
                    arr_user_names.push(response.rows[user]["user_name"]);
                }
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
                server_Log(`Successfully returned list of usernames`);
                res.json(arr_user_names);
            } else {
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                server_Log(`Database Error Occurred: An unexpected error occurred while creating the user.`);
                return res.status(500).json({ error: `Database Error Occurred: An unexpected error occurred while creating the user.` });
            }
        })
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// (#2) POST "/user/{user_name}" -- Create new user
app.post("/users/:user_name", async (req,res)=>{
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const user_name = req.params.user_name;
        const access_level = req.query.access_level;
        let api_key = uuidv4(); // generate API key

        // Check if user is available
        let to_check = await USER_is_available(user_name); // Call ID checker function
        if (to_check === true) {
            server_Log(`ERROR: ${user_name} is already taken`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(409).json({ error: `${user_name} is already taken: Please choose a different username.` });
        }

        // Check if access_level is defined
        if(access_level === undefined){
            server_Log(`ERROR: Request Incomplete Parameters`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({ error: `Missing required parameters: Ensure all required fields are provided.` });
        }

        // Check access_level is a number
        if(!(/\d/.test(access_level))){
            server_Log(`ERROR: Invalid data type`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({ error: `Invalid data type: Ensure all parameters are of the correct data type.` });
        }

        // CREATE USER IN DATABASE
        // INSERT INTO users (username, api_key, access_level)
        // VALUES ('peter', 'j1324lkj1234k1j234','0');
        client.query(`INSERT INTO users (user_name, api_key, access_level) VALUES ('${user_name}', '${api_key}','${access_level}')`, (err, response) => {
            if (!err){
                //SUCCESS
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
                server_Log(`SUCCESSFULLY create new user ${user_name}`);
                return res.status(200).send();
            } else {
                //ERROR PGADMIN
                server_Log("ERROR: Unsuccessfully in creating new user");
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                return res.status(500).json({ error: `Database error occurred: An unexpected error occurred while creating the user.` });
            }
        })
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// (#3) GET "/users/:user_name}" -- Return Data of Specific User (with query)
app.get("/users/:user_name", async (req,res)=>{
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        // Check if user is available
        const user_name = req.params.user_name;
        let to_check = await USER_is_available(user_name); // Call ID checker function
        if (to_check === false) {
            server_Log(`ERROR: User with the username ${user_name} is unavailable`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(404).json({ error: `Not Found: User ${user_name} not available` });
        }

        //Return specific userdata
        client.query(`SELECT * FROM users WHERE user_name='${user_name}'`, (err, response) => {
            if(response){
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
                server_Log(`SUCCESSFULLY return data of user ${user_name}`);
                res.json(response.rows[0]);
            }
            else {
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                return res.status(500).json({ error: `Database error occurred: An unexpected error occurred.` });
            }
        })
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }

})

// (#4) PUT "/user" -- Edit Access Level of User
app.put("/users/:user_name", async (req,res)=>{
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const user_name = req.params.user_name;
        const access_level = req.query.access_level;

        // Check if user is available
        let to_check = await USER_is_available(user_name); // Call ID checker function
        if (to_check === false) {
            server_Log(`ERROR: User with the username ${user_name} is unavailable`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(404).json({ error: `Not Found: User ${user_name} not available` });
        }

        // Check if access_level is defined
        if(access_level !== undefined){
            //do nothing
        }else{
            server_Log(`ERROR: Request Incomplete Parameters`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({ error: `Missing required parameters: Ensure all required fields are provided.` });
        }

        // Check access_level is a number
        if(/\d/.test(access_level)){
            //do nothing
        }else{
            server_Log(`ERROR: Invalid data type`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({ error: `Invalid data type: Ensure all parameters are of the correct data type.` });
        }

        client.query(`UPDATE users SET access_level = '${access_level}' WHERE user_name = '${user_name}'`, (err, response) => {
            if (!err){
                //SUCCESS
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
                server_Log(`SUCCESSFULLY changed access level of user ${user_name} to ${access_level}`);
                return res.status(200).send();
            } else {
                //ERROR PGADMIN
                server_Log(`ERROR: Unsuccessfully modified user ${user_name}'s access level to ${access_level}`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                return res.status(500).json({ error: `Database error occurred: An unexpected error occurred.` });
            }
        })
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// (#5) DELETE "/user" -- Delete Specific User
app.delete("/users/:user_name", async (req,res)=>{
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const user_name = req.params.user_name;

        // Check if user is available
        let to_check = await USER_is_available(user_name); // Call ID checker function
        if (to_check === false) {
            server_Log(`ERROR: User with the username '${user_name}' is unavailable`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(404).json({ error: `Not Found: User '${user_name}' not available` });
        }

        //DELETE USER IN DATABASE
        // DELETE FROM users WHERE user_name ='peter';
        client.query(`DELETE FROM users WHERE user_name = '${user_name}'`, (err, response) => {
            if (!err){
                //SUCCESS
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
                server_Log(`SUCCESSFULLY deleted user ${user_name}`);
                return res.status(200).send();
            } else {
                //ERROR PGADMIN
                server_Log(`ERROR: Unsuccessfully deleted user ${user_name}`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                return res.status(500).json({ error: `Database error occurred: An unexpected error occurred.` });
            }
            //END POSTGRES CONNECTION
        })
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// END User Management Endpoints -------------------------- //


// START Transactions Endpoints -------------------------- //

// (#1) "/transactions/?time_start&time_end" Return Last 20 Transactions by Default, Can give timestamp range
app.get("/transactions", async (req,res)=>{
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        // Optional arguments; will be NULL if not provided
        // Format: yyyy-mm-dd hh:mm:ss (hh in 24-hour cycle)
        const time_start = req.query.time_start;
        const time_end = req.query.time_end;

        // Step 1: Return data based on parameter values
        // [A] If NO optional parameters
        if (!time_start && !time_end){
            // Order all data by descending date and time and get ONLY the most recent
            client.query(`SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 10`, (err, data) => {
                if (!err){
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
                    server_Log(`SUCCESSFULLY returned most recent transactions`);
                    res.json(data.rows[0]);
                } else {
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    server_Log("ERROR: Getting most recent transactions");
                }
            })

        } else if (time_start && time_end) {
            // [B] With optional parameters time_start and time_end
            /*
            let arr_time_start = time_start.split("_");
            let arr_time_end  = time_end.split("_");
             */
            client.query(`SELECT * FROM transactions WHERE (timestamp BETWEEN '${time_start}' AND '${time_end}')`, (err, data) => {
                if(!err) {
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
                    server_Log(`SUCCESSFULLY returned transactions`);
                    res.json(data.rows);
                } else {
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    server_Log("ERROR: Getting transactions");
                    return res.status(500).json({ error: `Database error occurred: An unexpected error occurred.` });
                }
            })

        } else {
            // [C] Error 400: Optional parameters are INCOMPLETE
            server_Log("ERROR: Incomplete parameters in transactions request");
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({ error: 'Invalid request: Missing arguments in request' });
        }
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// END Transactions Endpoints -------------------------- //


// START Apollo AIR-1 Endpoints ------------------------ //

// (#1) "/air-1" GET all available Apollo AIR-1 IDs
app.get("/air-1", async (req, res) => {
    return GET_ids(res, req, "Apollo AIR-1", req.header("x-api-key"), req.method, req.originalUrl);
})

// (#2) "/air-1/{id}" and "/air-1/{id}&options" GET the most recent/historical data of a specific Apollo AIR-1
app.get("/air-1/:id", async (req, res) => {
    return GET_data(res, req, "Apollo AIR-1", req.header("x-api-key"), req.method, req.originalUrl);
})

// (#3) "/air-1/{id}/light" POST the state of the LED light of a specific Apollo AIR-1
app.post("/air-1/:id/light", async (req, res) => {
    return POST_light(res, req, "Apollo AIR-1", req.header("x-api-key"), req.method, req.originalUrl);
})

// (#4) "/air-1/{id}/avg&options" GET the average historical data of a specific sensor data of a specific Apollo AIR-1
app.get("/air-1/:id/avg", async (req, res) => {
    return GET_avg(res, req, "Apollo AIR-1", req.header("x-api-key"), req.method, req.originalUrl);
})

// END Apollo AIR-1 Endpoints -------------------------- //


// START Apollo MSR-2 Endpoints ------------------------ //

// (#1) "/msr-2" GET all available Apollo MSR-2 IDs
app.get("/msr-2", async (req, res) => {
    return GET_ids(res, req, "Apollo MSR-2", req.header("x-api-key"), req.method, req.originalUrl)
})

// (#2) "/msr-2/{id}" and "/msr-2/{id}&options" GET the most recent/historical data of a specific Apollo MSR-2
app.get("/msr-2/:id", async (req, res) => {
    return GET_data(res, req, "Apollo MSR-2", req.header("x-api-key"), req.method, req.originalUrl);
})

// (#3) "/msr-2/{id}/light" POST the state of the LED light of a specific Apollo MSR-2
app.post("/msr-2/:id/light", async (req, res) => {
    return POST_light(res, req, "Apollo MSR-2", req.header("x-api-key"), req.method, req.originalUrl);
})

// (#4) "/msr-2/{id}/buzzer" POST the rtttl string to be played on the buzzer of a specific Apollo MSR-2
app.post("/msr-2/:id/buzzer", async (req, res) => {
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0,2]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const deviceID = req.params.id;
        // Optional argument; will be NULL if not provided
        const mtttl_string = req.query.mtttl_string;

        // Step 1: Check if an Apollo MSR-2 with ID: deviceID is available
        if(await ID_is_available('apollo_msr_2', deviceID) === false){
            server_Log(`Not Found: Apollo MSR-2 with ID: ${deviceID} does not exist`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(404).json({error: `Not Found: Apollo MSR-2 with ID: ${deviceID} does not exist`});
        }

        // Step 2: Check if the string to play was given
        if(!mtttl_string){
            server_Log(`Bad Request: Incomplete parameters in POST request for Apollo MSR-2 with ID: ${device_id}`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({error: `Bad Request: Incomplete parameters in POST request for Apollo MSR-2 with ID: ${device_id}`});
        }

        // Step 3: Build and publish the JSON file to the correct MQTT topic to play the buzzer
        let toPublish = {'mtttl_string' : `${mtttl_string}`};
        // Guarantee the message with MQTT QOS2 and return an error request if there is an issue sending the message
        mqttclient.publish(`apollo_msr_2_${deviceID}/buzzer`, JSON.stringify(toPublish), { qos: 2 }, (err) => {
            if (err) {
                server_Log(`Internal Server Error: MQTT Connection Failed`);
                return res.status(500).json({error: `Internal Server Error: MQTT Connection Failed`});
            }else{
                server_Log(`POST request to Apollo MSR-2 with ID: ${deviceID} OK`);
                server_Log(` - MQTT Topic: apollo_msr_2_${deviceID}/buzzer`);
                server_Log(` - JSON File: ${JSON.stringify(toPublish)}`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
                return res.status(200).send(`POST request to Apollo MSR-2 with ID: ${deviceID} OK`);
            }
        });
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// (#5) "/msr-2/{id}/avg&options" GET the average historical data of a specific sensor data of a specific Apollo MSR-2
app.get("/msr-2/:id/avg", async (req, res) => {
    return GET_avg(res, req, "Apollo MSR-2", req.header("x-api-key"), req.method, req.originalUrl);
})

// END Apollo MSR-2 Endpoints -------------------------- //


// START Athom Smart Plug v2 Endpoints ----------------- //

// (#1) "/smart-plug-v2" GET all available Athom Smart Plug v2 IDs
app.get("/smart-plug-v2", async (req, res) => {
    return GET_ids(res, req, "Athom Smart Plug v2", req.header("x-api-key"), req.method, req.originalUrl)
})

// (#2) "/smart-plug-v2/{id}" and "/smart-plug-v2/{id}&options" GET the most recent/historical data of specific Athom Smart Plug v2
app.get("/smart-plug-v2/:id", async (req, res) => {
    return GET_data(res, req, "Athom Smart Plug v2", req.header("x-api-key"), req.method, req.originalUrl);
})

// (#3) "/smart-plug-v2/{id}/relay" POST relay of specific Athom Smart Plug v2
app.post("/smart-plug-v2/:id/relay", async (req, res) => {
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0,2]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const deviceID = req.params.id;
        // Optional argument; will be NULL if not provided
        const relayState = req.query.state;

        // Step 1: Check if an Athom Smart Plug v2 with ID: deviceID is available
        if(await ID_is_available('athom_smart_plug_v2', deviceID) === false){
            server_Log(`Not Found: Athom Smart Plug v2 with ID: ${deviceID} does not exist`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(404).json({error: `Not Found: Athom Smart Plug v2 with ID: ${deviceID} does not exist`});
        }

        // Step 2: Check if relayState was given and is a valid value
        if(!relayState){
            server_Log(`Bad Request: Incomplete parameters in POST request for Athom Smart Plug v2 with ID: ${deviceID}`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({error: `Bad Request: Incomplete parameters in POST request for Athom Smart Plug v2 with ID: ${deviceID}`});
        }else if(relayState !== "On" && relayState !== "Off"){
            server_Log(`Bad Request: Invalid 'state' parameter in POST request for Athom Smart Plug v2 with ID: ${deviceID}. \n - Given value: ${relayState} \n - Possible values: "On", "Off"`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({error: `Bad Request: Invalid 'state' parameter in POST request for Athom Smart Plug v2 with ID: ${deviceID}. | Given value: ${relayState} | Possible values: "On", "Off"`});
        }

        // Step 3: Build and publish the JSON file to the correct MQTT topic to set the relay
        let toPublish = {'state' : `${relayState}`};
        // Guarantee the message with MQTT QOS2 and return an error request if there is an issue sending the message
        mqttclient.publish(`athom_smart_plug_v2_${deviceID}/relay`, JSON.stringify(toPublish), { qos: 2 }, (err) => {
            if (err) {
                server_Log(`Internal Server Error: MQTT Connection Failed`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                return res.status(500).json({error: `Internal Server Error: MQTT Connection Failed`});
            }else{
                server_Log(`POST request to Athom Smart Plug v2 with ID: ${deviceID} OK`);
                server_Log(` - MQTT Topic: athom_smart_plug_v2_${deviceID}/relay`);
                server_Log(` - JSON File: ${JSON.stringify(toPublish)}`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
                return res.status(200).send(`POST request to Athom Smart Plug v2 with ID: ${deviceID} OK`);
            }
        });
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }

})

// (#4) "/smart-plug-v2/{id}/avg&options" GET the average historical data of a specific sensor data of a specific Athom Smart Plug v2
app.get("/smart-plug-v2/:id/avg", async (req, res) => {
    return GET_avg(res, req, "Athom Smart Plug v2", req.header("x-api-key"), req.method, req.originalUrl);
})

// END Athom Smart Plug v2 Endpoints ------------------- //


// START AirGradient One Endpoints --------------------- //

// (#1) "/ag-one" GET all available AirGradient One IDs
app.get("/ag-one", async (req, res) => {
    return GET_ids(res, req, "AirGradient One", req.header("x-api-key"), req.method, req.originalUrl)
})

// (#2) "/ag-one/{id}" and "/ag-one/{id}&options" GET the most recent/historical data of a specific AirGradient One
app.get("/ag-one/:id", async (req, res) => {
    return GET_data(res, req, "AirGradient One", req.header("x-api-key"), req.method, req.originalUrl);
})

// (#3) "/ag-one/{id}/light" POST the state of the LED strip of a specific AirGradient One
app.post("/ag-one/:id/light", async (req, res) => {
    return POST_light(res, req, "AirGradient One", req.header("x-api-key"), req.method, req.originalUrl);
})

// (#4) "/ag-one/{id}/avg&options" GET the average historical data of a specific sensor data of a specific Athom Smart Plug v2
app.get("/ag-one/:id/avg", async (req, res) => {
    return GET_avg(res, req, "AirGradient One", req.header("x-api-key"), req.method, req.originalUrl);
})

// END AirGradient One Endpoints ----------------------- //


// START Zigbee2MQTT Endpoints ------------------------- //

// (#1) "/zigbee2mqtt" GET all available Zigbee2MQTT device IDs and group IDs
app.get("/zigbee2mqtt", async (req, res) => {
    return GET_ids(res, req, "Zigbee2MQTT", req.header("x-api-key"), req.method, req.originalUrl)
})

// (#2) "/zigbee2mqtt/{id}/get" GET the most recent/historical state of a specific Zigbee2MQTT device
app.get("/zigbee2mqtt/:id", async (req, res) => {
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0,1,2]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        // Step 0: Check if the ID belongs to a group
        let queryText = 'SELECT * FROM zigbee2mqtt WHERE id = $1;';
        let queryValues = [req.params.id];
        let queryResult = await client.query(queryText, queryValues);

        if(!queryResult.rowCount) {
            server_Log(`Not found: Zigbee2MQTT with ID: ${req.params.id} does not exist`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(404).json({error: `Not found: Zigbee2MQTT with ID: ${req.params.id} does not exist`});
        }else if(queryResult.rows[0]['type'] === "group"){
            server_Log(`Bad Request: ID: ${req.params.id} belongs to a Zigbee2MQTT group. Data requests are not available for groups`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({error: `Bad Request: ID: ${req.params.id} belongs to a Zigbee2MQTT group. Data requests are not available for groups`});
        }

        return GET_data(res, req, "Zigbee2MQTT", specific_api_key, req.method, req.originalUrl);
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// (#3) "/zigbee2mqtt/{id}/set" POST the state of a specific Zigbee2MQTT device or group
app.post("/zigbee2mqtt/:id", async (req, res) => {
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0,2]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const entityID = req.params.id;
        // Optional arguments; will be NULL if not provided
        // for groups and lights:
        const lightState = req.query.light_state;
        const lightBrightness = req.query.light_brightness;
        const lightColorTemperature = req.query.light_color_temperature;
        // for switches:
        const switchState = req.query.switch_state;
        // for blinds:
        const blindsState = req.query.blinds_state;
        const blindsPosition = req.query.blinds_position;

        // Step 1: Check if an Zigbee2MQTT device or group with ID: entity_id is available
        let baseTopic = "";
        let deviceType = "";
        let queryResult = await client.query(`SELECT * FROM zigbee2mqtt WHERE id = '${entityID}'`);
        if(!queryResult.rowCount) {
            server_Log(`Not Found: Zigbee2MQTT with ID: ${entityID} does not exist`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(404).json({error: `Not Found: Zigbee2MQTT with ID: ${entityID} does not exist`});
        }else{
            // If entity_id is found, store its base topic
            baseTopic = queryResult.rows[0]["base_topic"];
            deviceType = queryResult.rows[0]["type"];
        }

        let toPublish = {};
        // each type of device has a corresponding json file
        if(deviceType === "group" || deviceType === "lights"){
            // Step 2: Check if at least one optional parameter was given
            if(!lightState && !lightBrightness && !lightColorTemperature){
                server_Log(`Bad Request: Incomplete parameters in POST request for Zigbee2MQTT with ID: ${entityID}`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                return res.status(400).json({error: `Bad Request: Incomplete parameters in POST request for Zigbee2MQTT with ID: ${entityID}`});
            }

            // Step 3: Check if the given values are valid and build the json file to be published
            if(lightState){
                if(lightState !== "ON" && lightState !== "OFF"){
                    server_Log(`Bad Request: Invalid 'light_state' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. \n - Given value: ${lightState} \n - Possible values: "ON", "OFF"`);
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    return res.status(400).json({error: `Bad Request: Invalid 'state' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. | Given value: ${lightState} | Possible values: "ON", "OFF"`});
                }
                toPublish['state'] = lightState;
            }
            if(lightBrightness){
                if(lightBrightness < 0 || lightBrightness > 254){
                    server_Log(`Bad Request: Invalid 'light_brightness' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. \n - Given value: ${lightBrightness} \n - Possible values: any integer from 0 to 254`);
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    return res.status(400).json({error: `Bad Request: Invalid 'brightness' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. | Given value: ${lightBrightness} | Possible values: any integer from 0 to 254`});
                }
                toPublish['brightness'] = lightBrightness;
            }
            if(lightColorTemperature){
                if(lightColorTemperature < 153 || lightColorTemperature > 500){
                    server_Log(`Bad Request: Invalid 'light_color_temperature' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. \n - Given value: ${lightColorTemperature} \n - Possible values: any integer from 153 to 500`);
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    return res.status(400).json({error: `Bad Request: Invalid 'color_temperature' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. | Given value: ${lightColorTemperature} | Possible values: any integer from 153 to 500`});
                }
                toPublish['color_temp'] = lightColorTemperature;
            }
        }else if(deviceType === "switch"){
            // Step 2-3: Check if the optional parameter was given and check if the given value is valid then build the json file to be published
            if(!switchState){
                server_Log(`Bad Request: Incomplete parameters in POST request for Zigbee2MQTT with ID: ${entityID}`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                return res.status(400).json({error: `Bad Request: Incomplete parameters in POST request for Zigbee2MQTT with ID: ${entityID}`});
            }else{
                if(switchState !== "ON" && switchState !== "OFF" && switchState !== "TOGGLE"){
                    server_Log(`Bad Request: Invalid 'blinds_state' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. \n - Given value: ${blindsState} \n - Possible values: "ON", "OFF", "TOGGLE"`);
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    return res.status(400).json({error: `ad Request: Invalid 'blinds_state' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. \n - Given value: ${blindsState} \n - Possible values: "ON", "OFF", "TOGGLE"`});
                }
                toPublish['state'] = switchState;
            }
        }else if(deviceType === "blinds"){
            // Step 2: Check if at least one optional parameter was given
            if(!blindsState && !blindsPosition) {
                server_Log(`Bad Request: Incomplete parameters in POST request for Zigbee2MQTT with ID: ${entityID}`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                return res.status(400).json({error: `Bad Request: Incomplete parameters in POST request for Zigbee2MQTT with ID: ${entityID}`});
            }

            // Step 3: Check if the given values are valid and build the json file to be published
            if(blindsState) {
                if (blindsState !== "OPEN" && blindsState !== "CLOSE" && blindsState !== "STOP") {
                    server_Log(`Bad Request: Invalid 'blinds_state' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. \n - Given value: ${blindsState} \n - Possible values: "OPEN", "CLOSE", "STOP"`);
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    return res.status(400).json({error: `Bad Request: Invalid 'blinds_state' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. | Given value: ${blindsState} | - Possible values: "OPEN", "CLOSE", "STOP"`});
                }
                toPublish['state'] = blindsState;
            }
            if(blindsPosition) {
                if (blindsPosition < 0 || blindsPosition > 100) {
                    server_Log(`Bad Request: Invalid 'blinds_position' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. \n - Given value: ${blindsPosition} \n - Possible values: any integer from 0 to 100`);
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    return res.status(400).json({error: `Bad Request: Invalid 'blinds_position' parameter in POST request for Zigbee2MQTT with ID: ${entityID}. \n - Given value: ${blindsPosition} \n - Possible values: any integer from 0 to 100`});
                }
                toPublish['position'] = blindsPosition;
            }
        }

        // Step 4: Publish the json file to the correct MQTT topic to set the light
        // Guarantee the message with MQTT QOS2 and return an error request if there is an issue sending the message
        mqttclient.publish(`${baseTopic}/${entityID}/set`, JSON.stringify(toPublish), { qos: 2 }, (err) => {
            if (err) {
                server_Log(`Internal Server Error: MQTT Connection Failed`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
                return res.status(500).json({error: `Internal Server Error: MQTT Connection Failed`});
            }else{
                server_Log(`POST request to Zigbee2MQTT with ID: ${entityID} OK`);
                server_Log(` - MQTT Topic: ${baseTopic}/${entityID}/set`);
                server_Log(` - JSON File: ${JSON.stringify(toPublish)}`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
                return res.status(200).send(`POST request to Zigbee2MQTT with ID: ${entityID} OK`);
            }
        });
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }

})

// END Zigbee2MQTT Endpoints --------------------------- //


// START Sensibo Endpoints ----------------------------- //

// (#1) "/sensibo" GET all available Sensibo Air Pro IDs
app.get("/sensibo", async (req, res) => {
    return GET_ids(res, req, "Sensibo", req.header("x-api-key"), req.method, req.originalUrl)
})

// (#2) "/sensibo/{id}" and "/sensibo/{id}&options" GET the [most recent/historical] data of a specific Sensibo Air Pro
app.get("/sensibo/:id", async (req, res) => {
    return GET_data(res, req, "Sensibo", req.header("x-api-key"), req.method, req.originalUrl);
})

// (#3) "/sensibo/{id}/hvac" POST the state of a Sensibo Air Pro's HVAC
app.post("/sensibo/:id/hvac", async (req, res) => {
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0,2]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const deviceID = req.params.id;
        // Optional arguments; will be NULL if not provided
        const hvacMode = req.query.hvac_mode
        const targetTemperature = req.query.target_temperature

        // Step 1: Check if an Sensibo with ID: deviceID is available
        if(await ID_is_available('sensibo', deviceID) === false){
            server_Log(`Not Found: Sensibo with ID: ${deviceID} does not exist`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(404).json({error: `Not Found: Sensibo with ID: ${deviceID} does not exist`});
        }

        // Step 2: Check if at least one optional parameter is given
        if(!hvacMode && !targetTemperature){
            server_Log(`Bad Request: Incomplete parameters in POST request for Sensibo with ID: ${deviceID}`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({error: `Bad Request: Incomplete parameters in POST request for Sensibo with ID: ${deviceID}`});
        }

        // Step 3: POST based on parameter values and check if they are valid
        if(hvacMode){
            if(hvacMode !== "off" && hvacMode !== "heat" && hvacMode !== "cool"){
                server_Log(`Bad Request: Invalid 'hvac_mode' parameter in POST request for Sensibo with ID: ${deviceID} \n - Given value: ${hvacMode} \n - Possible values: "off", "heat", "cool"`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                return res.status(404).json({error: `Bad Request: Invalid 'hvac_mode' parameter in POST request for Sensibo with ID: ${deviceID} | Given value: ${hvacMode} | Possible values: "off", "heat", "cool"`});
            }
            let parameters = {"entity_id": deviceID, "hvac_mode": hvacMode};
            await fetch(`${process.env.HOME_ASSISTANT_URL}:${process.env.HOME_ASSISTANT_PORT}/api/services/climate/set_hvac_mode`, {method: 'POST', body: JSON.stringify(parameters), headers: {"Authorization":`Bearer ${process.env.HOME_ASSISTANT_TOKEN}`, "content-type":"application/json"}})
        }
        if(targetTemperature){
            if(targetTemperature < 10 || targetTemperature > 35){
                server_Log(`Bad Request: Invalid 'target_temperature' parameter in POST request for Sensibo with ID: ${deviceID} \n - Given value: ${targetTemperature} \n - Possible values: any value from 10 to 35`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                return res.status(404).json({error: `Bad Request: Invalid 'target_temperature' parameter in POST request for Sensibo with ID: ${deviceID} | Given value: ${targetTemperature} | Possible values: any value from 10 to 35`});
            }
            let parameters = {"entity_id": deviceID, "temperature": targetTemperature};
            await fetch(`${process.env.HOME_ASSISTANT_URL}:${process.env.HOME_ASSISTANT_PORT}/api/services/climate/set_temperature`, {method: 'POST', body: JSON.stringify(parameters), headers: {"Authorization":`Bearer ${process.env.HOME_ASSISTANT_TOKEN}`, "content-type":"application/json"}});
        }

        // Step 4: Return status 200 OK
        server_Log(`POST request to Sensibo with ID: ${deviceID} OK`);
        UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
        if(hvacMode){server_Log(` - Given HVAC mode: ${hvacMode}`);}
        if(targetTemperature){server_Log(` - Given target temperature: ${targetTemperature}`);}
        return res.status(200).send(`POST request to Sensibo with ID: ${deviceID} OK`);
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// END Sensibo Endpoints ------------------------------- //


// START Groups Endpoints ------------------------------ //

// (#1) "/groups" GET/POST/PUT/DELETE groups (mapping of devices to tables)
// (1a) GET: Return all group IDs
app.get("/groups", async (req, res) => {
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0,1,2]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const queryResult = await client.query('SELECT * FROM groups;');

        if(queryResult.rowCount){
            let data = {};
            for(let row of queryResult.rows) {
                data[row["id"]] = {};
                if(row["apollo_air_1_ids"]){
                    data[row["id"]]["apollo_air_1_ids"] = row["apollo_air_1_ids"];
                }
                if(row["apollo_msr_2_ids"]){
                    data[row["id"]]["apollo_msr_2_ids"] = row["apollo_msr_2_ids"];
                }
                if(row["athom_smart_plug_v2_ids"]){
                    data[row["id"]]["athom_smart_plug_v2_ids"] = row["athom_smart_plug_v2_ids"];
                }
                if(row["zigbee2mqtt_ids"]){
                    data[row["id"]]["zigbee2mqtt_ids"] = row["zigbee2mqtt_ids"];
                }
            }
            server_Log("Successfully returned all group IDs");
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
            res.json(data);
        }
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// (1b) POST: Add a new group. FOR HIGHEST PRIVILEGE ONLY
app.post("/groups", async (req, res) => {
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const id = req.query.id;
        // Optional arguments; will be NULL if not provided
        apollo_air_1_ids = req.query.apollo_air_1_ids;
        apollo_msr_2_ids = req.query.apollo_msr_2_ids;
        athom_smart_plug_v2_ids = req.query.athom_smart_plug_v2_ids;
        zigbee2mqtt_ids = req.query.zigbee2mqtt_ids;

        // Step 1: Check if the id is already taken
        let queryText = 'SELECT * FROM groups WHERE id = $1;';
        let queryValues = [id];
        let queryResult = await client.query(queryText, queryValues);

        if(queryResult.rows.length){
            server_Log(`Bad Request: There is already a group with ID: ${id}`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({error: `Bad Request: There is already a group with ID: ${id}`});
        }

        // Step 2: Build the data for the query and check if the given device IDs are valid
        let deviceIDs = [apollo_air_1_ids, apollo_msr_2_ids, athom_smart_plug_v2_ids, zigbee2mqtt_ids];
        let deviceNames = ['Apollo AIR-1', 'Apollo MSR-2', 'Athom Smart Plug v2', 'Zigbee2MQTT'];
        let data = {"id":`'${id}'`};
        let id_is_available = true;

        for(let nameIndex = 0; nameIndex < deviceIDs.length; nameIndex++){
            if(!deviceIDs[nameIndex]){
                continue;
            }

            if(typeof(deviceIDs[nameIndex]) === "string"){
                deviceIDs[nameIndex] = [deviceIDs[nameIndex]];
            }

            for(let idIndex = 0; idIndex < deviceIDs[nameIndex].length; idIndex++){
                id_is_available = await ID_is_available(`${deviceNames[nameIndex].toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")}`, deviceIDs[nameIndex][idIndex]);
                if(!id_is_available){
                    server_Log(`Not Found: ${deviceNames[nameIndex]} with ID: ${deviceIDs[nameIndex][idIndex]} does not exist`);
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    return res.status(404).json({error: `Not Found: ${deviceNames[nameIndex]} with ID: ${deviceIDs[nameIndex][idIndex]} does not exist`});
                }
                if(deviceNames[nameIndex] === "Zigbee2MQTT"){
                    queryText = 'SELECT * FROM zigbee2mqtt WHERE id = $1 AND type != $2;';
                    queryValues = [deviceIDs[nameIndex][idIndex], 'group'];
                    queryResult = await client.query(queryText, queryValues);

                    if(!queryResult.rowCount){
                        server_Log(`Bad Request: ${deviceNames[nameIndex]} with ID: ${deviceIDs[nameIndex][idIndex]} cannot be added to a group`);
                        UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                        return res.status(404).json({error: `Bad Request: ${deviceNames[nameIndex]} with ID: ${deviceIDs[nameIndex][idIndex]} cannot be added to a group`});
                    }
                }
            }

            data[`${deviceNames[nameIndex].toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")}_ids`] = `'{${deviceIDs[nameIndex]}}'`;
        }

        // Step 3: Insert data about the group into the database
        queryText = format('INSERT INTO groups (%s) VALUES (%s);', Object.keys(data).toString(), Object.values(data).toString());

        await client.query(queryText, (err) => {
            if(err){
                server_Log(err);
                server_Log(`Bad Request: Bad arguments in POST request`);
                UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                return res.status(400).json({error: `Bad Request: Bad arguments in POST request`})
            }
        })

        server_Log(`Successfully crated a new group with ID: ${id}`);
        if(apollo_air_1_ids){server_Log(` - Apollo AIR-1's: ${apollo_air_1_ids}`);}
        if(apollo_msr_2_ids){server_Log(` - Apollo MSR-2's: ${apollo_msr_2_ids}`);}
        if(athom_smart_plug_v2_ids){server_Log(` - Athom Smart Plug v2's: ${athom_smart_plug_v2_ids}`);}
        if(zigbee2mqtt_ids){server_Log(` - Zigbee2MQTT's: ${zigbee2mqtt_ids}`);}
        UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
        return res.status(200).send(`Successfully crated a new group with ID: ${id}`);
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// (1c) PUT: Change the members of a group. FOR HIGHEST PRIVILEGE ONLY
app.put("/groups", async (req, res) => {
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const id = req.query.id;
        // Optional arguments; will be NULL if not provided
        apollo_air_1_ids = req.query.apollo_air_1_ids;
        apollo_msr_2_ids = req.query.apollo_msr_2_ids;
        athom_smart_plug_v2_ids = req.query.athom_smart_plug_v2_ids;
        zigbee2mqtt_ids = req.query.zigbee2mqtt_ids;

        // Step 1: Check if a group with ID: id is available
        let queryText = 'SELECT * FROM groups WHERE id = $1;';
        let queryValues = [id];
        let queryResult = await client.query(queryText, queryValues);

        if(!queryResult.rows.length){
            server_Log(`Not Found: Group with ID: ${id} does not exist`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(404).json({error: `Not Found: Group with ID: ${id} does not exist`});
        }

        // Step 2: Check if at least one optional parameter is given
        if(!apollo_air_1_ids && !apollo_msr_2_ids && !athom_smart_plug_v2_ids && !zigbee2mqtt_ids){
            server_Log(`ERROR: Incomplete parameters in PUT request`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(400).json({error: `Invalid request: Incomplete parameters in PUT request`});
        }

        // Step 3: Build the data to be used in the query and check if the given device IDs are valid
        let deviceIDs = [apollo_air_1_ids, apollo_msr_2_ids, athom_smart_plug_v2_ids, zigbee2mqtt_ids];
        let deviceNames = ['Apollo AIR-1', 'Apollo MSR-2', 'Athom Smart Plug v2', 'Zigbee2MQTT'];
        let data = {};
        let id_is_available = true;

        for(let nameIndex = 0; nameIndex < deviceIDs.length; nameIndex++){
            if(!deviceIDs[nameIndex]){
                continue;
            }

            if(typeof(deviceIDs[nameIndex]) === "string"){
                if(deviceIDs[nameIndex] === "[REMOVE MEMBERS]"){
                    data[`${deviceNames[nameIndex].toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")}`] = 'NULL';
                    continue;
                }
                if(typeof(deviceIDs[nameIndex]) === "string"){
                    deviceIDs[nameIndex] = [deviceIDs[nameIndex]];
                }
            }

            for(let idIndex = 0; idIndex < deviceIDs[nameIndex].length; idIndex++){
                id_is_available = await ID_is_available(`${deviceNames[nameIndex].toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")}`, deviceIDs[nameIndex][idIndex]);
                if(!id_is_available){
                    server_Log(`Not Found: ${deviceNames[nameIndex]} with ID: ${deviceIDs[nameIndex][idIndex]} does not exist`);
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    return res.status(404).json({error: `Not Found: ${deviceNames[nameIndex]} with ID: ${deviceIDs[nameIndex][idIndex]} does not exist`});
                }
                if(deviceNames[nameIndex] === "Zigbee2MQTT"){
                    queryText = 'SELECT * FROM zigbee2mqtt WHERE id = $1 AND type != $2;';
                    queryValues = [deviceIDs[nameIndex][idIndex], 'group'];
                    queryResult = await client.query(queryText, queryValues);

                    if(!queryResult.rowCount){
                        server_Log(`Bad Request: ${deviceNames[nameIndex]} with ID: ${deviceIDs[nameIndex][idIndex]} cannot be added to a group`);
                        UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                        return res.status(404).json({error: `Bad Request: ${deviceNames[nameIndex]} with ID: ${deviceIDs[nameIndex][idIndex]} cannot be added to a group`});
                    }
                }
            }

            data[`${deviceNames[nameIndex].toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")}`] = `'{${deviceIDs[nameIndex]}}'`;

        }

        // Step 4: Edit the group's details in the database
        for(let index = 0; index < Object.keys(data).length; index++){
            queryText = format('UPDATE groups SET %I = %s WHERE id = %L;', `${Object.keys(data)[index]}_ids`, Object.values(data)[index], id);
            server_Log(queryText);

            await client.query(queryText, (err) => {
                if(err){
                    server_Log(err);
                    server_Log(`ERROR: Bad arguments in PUT request`);
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    return res.status(400).json({error: `Bad arguments in PUT request`})
                }
            })
        }

        server_Log(`Successfully edited members of group with ID: ${id}`);
        if(apollo_air_1_ids){server_Log(` - Apollo AIR-1's: ${apollo_air_1_ids}`);}
        if(apollo_msr_2_ids){server_Log(` - Apollo MSR-2's: ${apollo_msr_2_ids}`);}
        if(athom_smart_plug_v2_ids){server_Log(` - Athom Smart Plug v2's: ${athom_smart_plug_v2_ids}`);}
        if(zigbee2mqtt_ids){server_Log(` - Zigbee2MQTT's: ${zigbee2mqtt_ids}`);}
        UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
        return res.status(200).send(`Successfully edited members of group with ID: ${id}`);
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// (1d) DELETE: Delete a group. FOR HIGHEST PRIVILEGE ONLY
app.delete("/groups", async (req, res) => {
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const id = req.query.id;

        // Step 1: Check if a group with ID: id is available
        let queryText = 'SELECT * FROM groups WHERE id = $1;';
        let queryValues = [id];
        let queryResult = await client.query(queryText, queryValues);

        if(!queryResult.rows.length){
            server_Log(`Not Found: Group with ID: ${id} does not exist`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
            return res.status(404).json({error: `Not Found: Group with ID: ${id} does not exist`});
        }

        // Step 2: DELETE the group from the table
        queryText = 'DELETE FROM groups WHERE id = $1;';
        queryValues = [id];

        await client.query(queryText, queryValues, () => {
            server_Log(`Successfully deleted group with ID: ${id}`);
            UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
            return res.status(200).send(`Successfully deleted group with ID: ${id}`);
        });
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// (#2) "/groups/{id}" GET all current data from all devices in a specific group
app.get("/groups/:id", async (req, res) => {
    try{
        let specific_api_key = req.header("x-api-key"); //Extract API Key from Header
        if(await SECURITY_CHECK(res, req, specific_api_key, [0,1,2]) === false){ //______ SECURITY CONDITIONAL
            return;
        }

        const id = req.params.id;

        // Step 1: Check if a group with ID: id is available. If id is available, get the group members
        let groupMembers = await new Promise(function(resolve){
            let queryText = 'SELECT * FROM groups WHERE id = $1;';
            let queryValues = [id];

            client.query(queryText, queryValues, (err, queryResult) => {
                if(!queryResult.rows.length){
                    server_Log(`Not Found: Group with ID: ${id} does not exist`);
                    UPDATE_transactions(specific_api_key, req.method, req.originalUrl, false);
                    return res.status(404).json({error: `Not Found: Group with ID: ${id} does not exist`});
                }
                delete queryResult.rows[0].id;
                resolve(queryResult.rows[0]);
            });
        });

        // Step 2: Get the most recent data from the group's members
        let groupData = {};
        let groupMembersKeys = Object.keys(groupMembers);
        let groupMembersValues = Object.values(groupMembers);
        for(let keyIndex = 0; keyIndex < groupMembersKeys.length; keyIndex++){
            if(!groupMembers[groupMembersKeys[keyIndex]]){
                // Skip if there are no ids
                continue;
            }
            // Get the data from each of the ids
            for(let valueIndex = 0; valueIndex < groupMembersValues[keyIndex].length; valueIndex++){
                groupData[`${groupMembersKeys[keyIndex].replace("_ids", "")}_${groupMembersValues[keyIndex][valueIndex]}`] = await new Promise(function (resolve) {
                    let queryText = format('SELECT * FROM %I ORDER BY timestamp DESC LIMIT 1;', `${groupMembersKeys[keyIndex].replace("_ids", "")}_${groupMembersValues[keyIndex][valueIndex]}`);
                    client.query(queryText, (err, queryResult) => {
                        resolve(queryResult.rows[0]);
                    });
                });
            }
        }

        // Step 3: Pass the data to the GET request
        server_Log(`Successfully returned most recent data for all devices in the group with id: ${id}`);
        UPDATE_transactions(specific_api_key, req.method, req.originalUrl, true);
        res.json(groupData);
    }catch(err){
        server_Log(`Internal Server Error: An unexpected error occurred\n${err}`);
        return res.status(500).json({error: `Internal Server Error: An unexpected error occurred`});
    }
})

// END Groups Endpoints -------------------------------- //


// ------------ END Define REST Endpoints ----------- //



// Server hosted at port 80
app.listen(process.env.HOST_PORT, () => console.log(`SSL IoT 1 Server Hosted at port ${process.env.HOST_PORT}`));
