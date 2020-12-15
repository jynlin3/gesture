const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const noun = new Schema({
    item: String,
    correct_rate: Number
});

module.exports = mongoose.model("noun", noun, "noun");