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

//GET user profile
router.get('/user', async function (req, res) {
  const database = client.db('FYP_medApp');

  //query to find a username with the name "jambro0"
  const query = { username: 'jambro0' };

  let result = await database.collection('medApp_userProfile').findOne(query);
  console.log(result); //userProfile, object

  //TODO1: find the user, compare the password with the password in the database
  //TODO2: throw userProfile if the password is right; null if the password is wrong
  //TODO3: throw error message if system error

  return res.json(result); //not res.render -- that's to render ejs file only.

});

//GET medical record
router.get('/medicalRecord', async function (req, res) {
  const database = client.db('FYP_medApp');

  //TODO1: input = user id
  //TODO2: findOne in medical db
  //return medical record
  const query = { medicineId: '881' };

  let result = await database.collection('medApp_medicalRecord').findOne(query);
  console.log(result); //medicalRecord, object

  return res.json(result); 

});


//UPDATE user profile (later)


module.exports = router;