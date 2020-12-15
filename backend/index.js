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
                        res.status(200);
                    }
                }
            );
        }
    });
});

router.route('/updateCorrectRate').put(function(req, res){
    if (!req.query.word || !req.query.correct)
        res.json({message:"Wrong input"});
    else{
        var word = req.query.word;

        noun.findOne({item: word}, function (err, result){
                if(err){
                    res.send(err);
                }
                else{
                    var total_count = result.total_count + 1;
                    var correct_count = req.query.correct == 1 ? result.correct_count + 1 : result.correct_count;
                    noun.updateOne({item: word}, {correct_rate: correct_count/total_count, correct_count: correct_count, total_count:total_count}, function(error, result){});
                    res.json({message:"OK"});
                }
        });
    }
});

app.listen(PORT, function(){
    console.log("Server is running on Port: "+PORT);
});
