//setting up the server
var express = require('express');
var router = express.Router();

//setting up the database
const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://chimhoiyan:emlgEs6uzYEyJWjn@medapp.oz0x78w.mongodb.net/";
const client = new MongoClient(uri);
const tokenSecret = 'r2g9^!Gb4dwo5J3G';

async function verifyToken(req, res, next) {  //for all the routes that need to be verified by token
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1]; //get the token from the array
    // req.token = bearerToken;

    //compare token with the token in the database (single login)
    let authData = jwt.verify(bearerToken, tokenSecret)

    console.log(authData);
    // console.log("verifyToken: " + authData);
    // req.token = authData;

    const database = client.db('FYP_medApp');
    let result = await database.collection('medApp_userProfile').findOne({ username: authData.username, token: bearerToken });

    if (result) {
      console.log("verifyToken: " + result);
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

  let username = req.body.username;
  let password = req.body.password;

  const query = { $or: [{ username: username }, { userID: username }] } //object query

  const database = client.db('FYP_medApp');
  let result = await database.collection('medApp_userProfile').findOne(query);
  console.log("post login result:");

  if (result && result.password === password) {

    delete result.token; //delete token in the result

    // Generate JWT token and encapsulate the result into the token
    const token = jwt.sign({ ...result }, tokenSecret, { expiresIn: '24h' });  //... take the json 1 level outter

    //update token in database
    let updateTokenResult = await database.collection('medApp_userProfile').updateOne(query, { $set: { token: token } });
    if (updateTokenResult.modifiedCount == 0) {
      console.log("update token fail");
      return res.json({ resultCode: 400 });
    }

    console.log("login success");

    console.log(result); //userProfile

    //result.token = token; ?????

    return res.json({ token: token, resultCode: 200 });

  } else {
    console.log("login fail");
    return res.json({ resultCode: 400 });
  }

});


//GET medical record
//pipeline: array of operations, use the result of 1st operation can be used for the 2nd operation
router.get('/medicineRecord/:userID', verifyToken, async function (req, res) {  //verifyToken is a middleware function
  const database = client.db('FYP_medApp');
  const query = { userID: req.user.userID }; //TODO: delete, replaced by token in body 
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


  // let medinceRecord = await database.collection('medApp_medicineRecord').find(query).toArray();
  console.log(medinceRecord); //medicalRecord, object
  if (!medinceRecord) {
    // let medinceRecord = {};
    return res.status(404).send('No medicine record found.');  //no need resultCode, just send error message
  }

  console.log("\n=================After pipeline=================\n");

  return res.json(medinceRecord);
  // }

});

//TODO: PATCH medicine record with selfNote
router.patch('/medicineRecordEdit/:userID', async function (req, res) {


});

//GET Appointment record
router.get('/appointmentRecord/:userID', async function (req, res) {
  const database = client.db('FYP_medApp');
  const query = { $or: [{ patientID: req.params.userID }, { doctorID: req.params.userID }] };

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

//GET all health data of a patient 
//TODO: Window scanning -- take a peroid of time, (and get the average of the data)
router.get('/healthDataRecord/:userID', async function (req, res) {
  const database = client.db('FYP_medApp');
  const query = { userId: req.params.userID };

  let healthDataRecord = await database.collection('medApp_healthDataRecord').find(query).toArray();

  console.log(healthDataRecord); //medicalRecord, object

  if (healthDataRecord == null) {
    let healthDataRecord = {};
    healthDataRecord.resultCode = 404; //not found
  }

  return res.json(healthDataRecord);

});

//GET filtered health data
// db.users.find(
//   { status: "A",
//   age: 50 }
// )



module.exports = router;