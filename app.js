const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();
const port = 3000;

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

app.use(bodyParser.json());

app.post('/addPlant', (req, res) => {
    const plantData = req.body;

    const newPlant = new Plant(plantData);
    newPlant.save()
        .then(() => {
            res.status(200).send('Рослину додано до бази даних.');
        })
        .catch((error) => {
            res.status(500).send(`Помилка: ${error}`);
        });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

app.get('/myPlants', (req, res) => {
    Plant.find({}, (err, plants) => {
        if (err) {
            res.status(500).send(`Помилка: ${err}`);
        } else {
            res.status(200).send(plants);
        }
    });
});

app.delete('/deletePlant/:id', (req, res) => {
    const plantId = req.params.id;

    Plant.findByIdAndDelete(plantId, (err) => {
        if (err) {
            res.status(500).send(`Помилка: ${err}`);
        } else {
            res.status(200).send('Рослину видалено успішно.');
        }
    });
});
