const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const PORT = 4000;
app.use(cors());

// connet to MongoDB Atlas
let server;
try {
    server = require('./config_backend.json').mongodbServer;
} catch (error){
    server = "mongodb://127.0.0.1:27017/wordDB";
}

mongoose.connect(server, {useNewUrlParser: true, dbName:"WordDB"});

const connection = mongoose.connection;

connection.once("open", function(){
    console.log("Connection with MongoDB was successful");
});

// implement endpoints
const router = express.Router();
app.use("/", router);

let noun = require("./model");
router.route("/getRandomWord").get(function(req, res){

    // get the count of all words
    noun.countDocuments({}, function(err, count){
        if(err){
            res.send(err);
        }else{

            // get a random entry
            var random = Math.floor(Math.random() * count);
            
            // query all words but only fetch one offset by random #
            noun.findOne({}).skip(random).then(
                function (err, result){
                    if(err){
                        res.send(err);
                    }else{
                        console.log(result);
                        res.status(200);
                    }
                }
            );
        }
    });
});

app.listen(PORT, function(){
    console.log("Server is running on Port: "+PORT);
});
