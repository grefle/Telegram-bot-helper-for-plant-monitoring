const mongoose = require('mongoose');

const plantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    scientificName: String,
    wateringInterval: Number,
    germinationConditions: String,
    lastWatered: Date,
    userId: { type: String, required: true }
});

const Plant = mongoose.model('Plant', plantSchema);

module.exports = {
    Plant,
};
