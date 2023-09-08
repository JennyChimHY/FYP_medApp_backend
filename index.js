// //setting up the database
// const { MongoClient } = require("mongodb");
// var ObjectId = require('mongodb').ObjectId; //from lab4

// const uri = "mongodb+srv://chimhoiyan:emlgEs6uzYEyJWjn@medapp.oz0x78w.mongodb.net/";
// const client = new MongoClient(uri);

// //setting up the server
// const routes = require('./routes/routes');
// const express = require("express");
// const app = express();

// app.use('/api', routes)
// module.exports = router;

// app.listen(3000,() => console.log("Server listening at port 3000"));


// const router = express.Router()
// module.exports = router;

// // Getting all
// app.get("/", (req, res) => {
//     res.send("Hello World");
// });

// // Getting user in backend only
// app.get("/users", async(req, res) => {
//     try {
//         const database = client.db('FYP_medApp');
//         const userProfileList = database.collection('medApp_userProfile');
    
//         // Query to find a username with the name "jambro0"
//         const query = { username: 'jambro0' };
//         const userProfile = await userProfileList.findOne(query);
    
//         console.log(userProfile);
//       } finally {
//         // Ensures that the client will close when you finish/error
//         await client.close();
//       }

//     // from lab 4
//     //   if (!ObjectId.isValid(req.params.id))
//     //   return res.status(404).send('Unable to find the requested resource!');
//     //   let result = await db.collection("bookings").findOne({ _id:
//     //  ObjectId(req.params.id) })
//     //   if (result)
//     //   res.render('booking', { booking: result });
//     //   else
//     //   res.status(404).send('Unable to find the requested resource!');
// });
   

// // // Getting one
// // app.get("/users/:id", (req, res) => {

// // });

// // // Creating one
// // app.post("/users", (req, res) => {});

// // // Updating one
// // app.patch("/users/:id", (req, res) => {});

// // // Deleting one
// // app.delete("/users/:id", (req, res) => {});



// // http://localhost:3000/