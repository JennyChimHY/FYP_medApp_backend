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


// //GET user profile
// router.get('/user', async function (req, res) {
//   const database = client.db('FYP_medApp');

//   //query to find a username with the name "jambro0"
//   const query = { username: 'jambro0' };

//   let result = await database.collection('medApp_userProfile').findOne(query);
//   console.log(result); //userProfile

//   return res.json(result); //not res.render -- that's to render ejs file only.

// });

//POST Login function
router.post('/login', async function (req, res) {

  let username = req.body.username;
  let password = req.body.password;

  const query = { username: username } //object query

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
router.get('/medicineRecord/:userID', async function (req, res) {
  const database = client.db('FYP_medApp');
  const query = { userID: req.params.userID }; //TODO: userID

  let medinceRecord = await database.collection('medApp_medicineRecord').find(query).toArray();
  console.log(medinceRecord); //medicalRecord, object

  if(medinceRecord == null) {
    let medinceRecord = {};
    medinceRecord.resultCode = 404; //not found
    return res.json(medinceRecord)
  } else {
  //TODO: await again, take medicine info(name..), using medicineId, from medicineRecord db

    // for (let i = 0; i < medinceRecord.length; i++) {
// 
    // const query2 = { medicineID: medinceRecord[i].medicineID };
    // let medicineInfo = await database.collection('medApp_medicineInfo').find(query2);
    // console.log(medicineInfo); //medicineInfo, object
    
    // medinceRecord[i].medicineInfo = JSON.Stringify.parse(medicineInfo); //copy medicineInfo to medicineRecord, not pointer only
    // }

    return res.json(medinceRecord);
  }

});

//GET Appointment record
router.get('/appointmentRecord/:userID', async function (req, res) {
  const database = client.db('FYP_medApp');
  const query = { patientID: req.params.userID };

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

//UPDATE user profile (later)


module.exports = router;