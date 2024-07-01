//setting up the server
var express = require('express');
var router = express.Router();

//setting up the database
const { MongoClient } = require("mongodb");
var ObjectId = require('mongodb').ObjectId;

const uri = "mongodb+srv://chimhoiyan:******.mongodb.net/";
const client = new MongoClient(uri);
const tokenSecret = '******';  //hidden for security measure

//for all the routes that need to be verified by token
async function verifyToken(req, res, next) {  
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1]; //get the token from the array

    //compare token with the token in the database (single login)
    let authData = jwt.verify(bearerToken, tokenSecret)

    const database = client.db('FYP_medApp');
    let result = await database.collection('medApp_userProfile').findOne({ username: authData.username, token: bearerToken });

    if (result) {
      // console.log("verifyToken: " + result);
      req.token = authData;
      req.user = result;
      return next();
    }

    return res.sendStatus(403);  //failed to verify token

  }

}

//setting up the api

router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

const jwt = require('jsonwebtoken');

//POST Login function and fetch user profile
router.post('/login', async function (req, res) {
  const database = client.db('FYP_medApp');
  let username = req.body.username;
  let password = req.body.password;
  let patientFCM_token = req.body.patientFCM_token;

  const query = { $or: [{ username: username }, { userID: username }] } //object query

  let result = await database.collection('medApp_userProfile').findOne(query);

  console.log("post login result:\n", result);

  if (result && result.password === password) {

    delete result.token; //delete token in the result

    // Generate JWT token and encapsulate the result into the token
    const token = jwt.sign({...result}, tokenSecret, { expiresIn: '24h' });  

    //update token in database
    let updateTokenResult = await database.collection('medApp_userProfile').updateOne(query, { 
      $set: { token: token, patientFCM_token: patientFCM_token } });
    if (updateTokenResult.modifiedCount == 0) {
      console.log("update token fail");
      return res.json({ resultCode: 400 });
    }

    console.log("login success");
    console.log(result); //userProfile

    return res.json({ token: token, resultCode: 200 }); //token; resultCode, userProfile

  } else {
    console.log("login fail");
    return res.json({ resultCode: 400 });
  }
});


//GET patient profile in caregiver mode, 
//verify token using caregive own token
//verified token will store user info in req.user
router.get('/patientProfileList', verifyToken, async function (req, res) {
  const database = client.db('FYP_medApp');
  
  const query = { userID: req.user.userID };

  let pipeline = [
    {
      $match: query
    },
    {
      $lookup: {
        from: "medApp_userProfile",  //target collection
        localField: "patientConnection.patientID",     //caregiver's patient connection field
        foreignField: "userID",   //caregiver's ID field
        as: "patientProfileList"      //mapping as patientProfileList
      }
    }, 
    {
      $project: {
        _id: 1,
        "userID": 1,
        "patientProfileList": {
          _id: 1,
          "userID": 1,
          "firstName": 1,
          "lastName": 1,
          "gender": 1,
          "age": 1,
          "dob": 1,
          "username": 1,
          "email": 1,
          "password": 1
        },
      }
    }
  ];

  let patientProfile = await database.collection('medApp_userProfile').aggregate(pipeline).toArray();

  //handle jwt security measure?
  console.log("patientProfile");
  console.log(patientProfile[0]); //userProfile
  console.log(patientProfile[0].patientProfileList); //userProfile

  if (patientProfile[0] == null) {
    let patientProfile = {};
    patientProfile.resultCode = 404; //not found
  }

  return res.json(patientProfile[0]);

});


//GET medical record
//pipeline: array of operations, use the result of 1st operation can be used for the 2nd operation
router.get('/medicineRecord/:userID', verifyToken, async function (req, res) {  //verifyToken is a middleware function
  const database = client.db('FYP_medApp');

  console.log("userID: " + req.params.userID); //userID

  const query = { userID: req.params.userID }; //req.user.userID from verifyToken
  //  req.user vs req.body

  let pipeline = [
    {
      $match: query
    },
    {
      $lookup: {
        from: "medApp_medicineInfo",  //target collection
        localField: "medicineId",     //medicineRecord field
        foreignField: "medicineId",   //medicineInfo field
        as: "medicineInfo"            //mapping as medicineInfo
      }
    },
    {
      $unwind: "$medicineInfo"  //pick the array out and directly insert into the object (medicineRecord)
    }];

  let medinceRecord = await database.collection('medApp_medicineRecord').aggregate(pipeline).toArray();

  console.log(medinceRecord); //medicalRecord, object
  if (!medinceRecord) {
    return res.status(404).send('No medicine record found.');  //no need resultCode, just send error message
  }

  console.log("\n=================After pipeline=================\n");

  return res.json(medinceRecord);

});

// //TODO: PATCH medicine record with selfNote
// router.patch('/medicineRecordEdit/:userID', async function (req, res) {


// });

//GET Appointment record by userID or appointID
router.get('/appointmentRecord/:userAppointID', verifyToken, async function (req, res) {
  const database = client.db('FYP_medApp');
  const query = { $or: [{ patientID: req.params.userAppointID }, { doctorID: req.params.userAppointID }, {appointID: req.params.userAppointID}] };

  let appointmentRecord = await database.collection('medApp_appointmentRecord').find(query).toArray();

  if (appointmentRecord.length == 0) { //if no appointment record found, check if user is a doctor
    const query = { doctorID: req.params.userID };
    appointmentRecord = await database.collection('medApp_appointmentRecord').find(query).toArray();
  }

  console.log(appointmentRecord); //medicalRecord, object

  if (appointmentRecord == null) {
    let appointmentRecord = {};
    appointmentRecord.resultCode = 404; //not found
  }

  return res.json(appointmentRecord);

});

//PUT update patient apply appointment record
router.put('/patientApplyAppointment/:appointID', verifyToken, async function (req, res) {

  console.log("Enter PUT patientApplyAppointment");

  const database = client.db('FYP_medApp');
  const query = { appointID: req.body.appointID };
  const update = { $set: { appointUpdateDateTime: req.body.appointUpdateDateTime, doctorUpdateStatus: req.body.doctorUpdateStatus } };  //partial update

  let updateAppointmentRecord = await database.collection('medApp_appointmentRecord').updateOne(query, update);

  console.log(updateAppointmentRecord); //medicalRecord, object

  if (updateAppointmentRecord == null) {
    let updateAppointmentRecord = {};
    updateAppointmentRecord.resultCode = 404; //not found
  }

  return res.json(updateAppointmentRecord);

});


//PUT update doctor approve appointment record
router.put('/doctorApproveAppointment/:appointID', verifyToken, async function (req, res) {

  console.log("Enter PUT doctorApproveAppointment");

  //method 2: string from frontend only
  // await findOne
  // if approve / reject
  // await updateOne

  console.log("update appoint info");
  console.log(req.body.appointID);
  console.log(req.body.appointUpdateDateTime);
  console.log(req.body.doctorUpdateStatus);


  const database = client.db('FYP_medApp');
  const query = { appointID: req.params.appointID };
  let update = { $set: { doctorUpdateStatus: "Initialize" } };  //partial update

  if (req.body.doctorUpdateStatus == "Approved") { //approve
    update = { $set: { appointDateTime: req.body.appointUpdateDateTime, appointTimestamp: req.body.appointUpdateTimestamp, appointUpdateDateTime: null, appointUpdateTimestamp: 0, doctorUpdateStatus: req.body.doctorUpdateStatus } };  //partial update
  } else { //reject
    update = { $set: { appointUpdateDateTime: null, appointUpdateTimestamp: 0, doctorUpdateStatus: req.body.doctorUpdateStatus } };  //partial update
  }
  

  //TODO update failed for appoint date time

  let updateAppointmentRecord = await database.collection('medApp_appointmentRecord').updateOne(query, update);

  console.log(updateAppointmentRecord); //medicalRecord, object

  if (updateAppointmentRecord == null) {
    let updateAppointmentRecord = {};
    updateAppointmentRecord.resultCode = 404; //not found
  }

  return res.json(updateAppointmentRecord);

});




//GET all health data of a patient 
//TODO: Window scanning -- take a peroid of time, (and get the average of the data)
//TODO*******: sort date
router.get('/healthDataRecord/:userID', verifyToken, async function (req, res) {
  const database = client.db('FYP_medApp');
  const query = { userID: req.params.userID };

  let healthDataRecord = await database.collection('medApp_healthDataRecord').find(query).toArray();

  console.log(healthDataRecord); //medicalRecord, object

  if (healthDataRecord == null) {
    let healthDataRecord = {};
    healthDataRecord.resultCode = 404; //not found
  }

  return res.json(healthDataRecord);

});

//post health data: Add health data
router.post('/addHealthDataRecord', verifyToken, async function (req, res) {
  const database = client.db('FYP_medApp');

  console.log(req.body);

  let addhealthDataRecordResult = await database.collection('medApp_healthDataRecord').insertOne(req.body);

  console.log("addhealthDataRecordResult");
  console.log(addhealthDataRecordResult); //medicalRecord, object

  if (addhealthDataRecordResult == null) {
    let addhealthDataRecordResult = {};
    addhealthDataRecordResult.resultCode = 404; //not found
  }

  return res.json(addhealthDataRecordResult); //return the inserted data?

});

//delete health data: Delete health data  TODO modifyyyyyyyyyyyyyyy
router.delete('/deleteHealthDataRecord/:recordID', verifyToken, async function (req, res) {
  const database = client.db('FYP_medApp');
  const query = { _id: new ObjectId(req.params.recordID) };

  console.log("query");
  console.log(query);

  let deleteHealthDataRecordResult = await database.collection("medApp_healthDataRecord").deleteOne(query) //findOneAndDelete


  console.log("deleteHealthDataRecordResult"); //medicalRecord, object
  console.log(deleteHealthDataRecordResult); 

  if (deleteHealthDataRecordResult == null) {
    let deleteHealthDataRecordResult = {};
    deleteHealthDataRecordResult.resultCode = 404; //not found
  }

});

//put health data: Edit health data  //not created

//post location data: add location record
router.post('/addLocationRecord', verifyToken, async function (req, res) {
  const database = client.db('FYP_medApp');
  // const query = { userId: req.params.userID };

  console.log(req.body);

  //to be modified
  let addLocationRecordResult = await database.collection('medApp_locationRecord').insertOne(req.body);

  console.log("addLocationRecordResult");
  console.log(addLocationRecordResult);

  if (addLocationRecordResult == null) {
    let addLocationRecordResult = {};
    addLocationRecordResult.resultCode = 404;
  }

  return res.json(addLocationRecordResult); //return the inserted data?

});

//get location data: get location record
router.get('/getlocationRecord/:userID', verifyToken, async function (req, res) {
  const database = client.db('FYP_medApp');
  const query = { userID: req.params.userID };

  let locationRecord = await database.collection('medApp_locationRecord').find(query).toArray();

  console.log(locationRecord); //medicalRecord, object

  if (locationRecord == null) {
    let locationRecord = {};
    locationRecord.resultCode = 404; //not found
  }

  return res.json(locationRecord);

});


//POST Firebase Cloud Messaging
router.post('/sendFirebaseNotificationToCloud', verifyToken, async function (req, res) {

  //1. fetch patientFCM_token from database, query by patientID
  //2. send notification setting to the cloud server
  
  const database = client.db('FYP_medApp');
  const query = { userID: req.body.patientID };

  let result = await database.collection('medApp_userProfile').findOne(query);

  if (result == null || !result.patientFCM_token) {
    let result = {};
    result.resultCode = 404; //not found

    console.log("FAILED post login result:\n", result);

    return res.json(result);
  }

  console.log("post login result:\n", result);
  console.log("post login result patientFCM_token:\n", result.patientFCM_token);


  //make a post request to the firebase cloud messaging server

  console.log(req.body);

  let patientFCM_token = result.patientFCM_token;

//https://fcm.googleapis.com/fcm/send
//body: json from https://firebase.google.com/docs/cloud-messaging/http-server-ref 

let cloudMessage = {
  "to" : patientFCM_token,  // patient device's registration token
  "priority" : "high",
  "notification" : {
                    "title" : req.body.notificationStatus,
                    "body" : req.body.notificationMsg
   }
 }

  console.log(cloudMessage);

  const fetch = require('node-fetch'); //node version < 18.0
  let fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    body: JSON.stringify(cloudMessage),
    headers: { 'Content-Type': 'application/json', 'Authorization': 'key='******' }
  })

  result = await fcmRes.json();

  console.log("FCM after sending to cloud, post login result:\n", result);

  return res.json(result);

});


//GET filtered health data
// db.users.find(
//   { status: "A",
//   age: 50 }
// )



module.exports = router;