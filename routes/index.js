//setting up the server
var express = require('express');
var router = express.Router();

//setting up the database
const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://chimhoiyan:emlgEs6uzYEyJWjn@medapp.oz0x78w.mongodb.net/";
const client = new MongoClient(uri);

//setting up the api

router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});



//POST Login function and fetch user profile
router.post('/login', async function (req, res) {

  let username = req.body.username;
  let password = req.body.password;

  const query = { $or: [{username: username }, {userID: username}] } //object query

  const database = client.db('FYP_medApp');
  let result = await database.collection('medApp_userProfile').findOne(query);
  console.log("post login result:");
  console.log(result); //userProfile

  if (result != null && result?.password == password) {
    result.resultCode = 200; //success
    console.log("login success");
    return res.json(result);
 
  } else {
    console.log("login fail");
    let result = {};
    result.resultCode = 400; //fail
    return res.json(result)
  }

});


//GET medical record
//pipeline: array of operations, use the result of 1st operation can be used for the 2nd operation
router.get('/medicineRecord/:userID', async function (req, res) {
  const database = client.db('FYP_medApp');
  const query = { userID: req.params.userID };

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

  if(appointmentRecord == null) {
    let appointmentRecord = {};
    appointmentRecord.resultCode = 404; //not found
  }
  
  return res.json(appointmentRecord);

});

//GET all health data of a patient
router.get('/healthDataRecord/:userID', async function (req, res) {
  const database = client.db('FYP_medApp');
  const query = { userId: req.params.userID };

  let healthDataRecord = await database.collection('medApp_healthDataRecord').find(query).toArray();

  console.log(healthDataRecord); //medicalRecord, object

  if(healthDataRecord == null) {
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