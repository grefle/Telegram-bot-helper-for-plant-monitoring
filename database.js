const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/plantReminderDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const plantSchema = new mongoose.Schema({
    name: String,
    scientificName: String,
    wateringInterval: Number,
    germinationConditions: String,
    lastWatered: Date,
    photoURL: String
});

const Plant = mongoose.model('Plant', plantSchema);

module.exports = Plant;
