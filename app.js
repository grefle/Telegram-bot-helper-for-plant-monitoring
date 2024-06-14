const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Plant } = require('./database.js');

// Завантаження змінних середовища з файлу .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const mongoDbUri = process.env.MONGODB_URI;

if (!mongoDbUri) {
    console.error('MongoDB URI is not defined in environment variables.');
    process.exit(1);
}

mongoose.connect(mongoDbUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected');
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    })
    .catch(error => {
        console.error('Error connecting to MongoDB:', error);
    });

app.use(bodyParser.json());

app.post('/addPlant', async (req, res) => {
    try {
        const plantData = req.body;
        const newPlant = new Plant(plantData);
        await newPlant.save();
        res.status(200).send('Рослину додано до бази даних.');
    } catch (error) {
        console.error('Error in /addPlant:', error);
        res.status(500).send(`Помилка: ${error.message}`);
    }
});

app.get('/myPlants', async (req, res) => {
    try {
        const plants = await Plant.find({});
        console.log('Plants:', plants);  // Перевірка даних на сервері
        res.json(plants);
    } catch (error) {
        console.error('Error fetching plants:', error);
        res.status(500).send('Помилка отримання даних про рослини');
    }
});


app.delete('/deletePlant/:id', async (req, res) => {
    try {
        const plantId = req.params.id;
        await Plant.findByIdAndDelete(plantId);
        res.status(200).send('Рослину видалено успішно.');
    } catch (error) {
        console.error('Error in /deletePlant/:id:', error);
        res.status(500).send(`Помилка: ${error.message}`);
    }
});

// Маршрут для оновлення інформації про рослину
app.put('/updatePlant/:id', async (req, res) => {
    try {
        const plantId = req.params.id;
        const updatedData = req.body;

        if (!updatedData) {
            return res.status(400).send('Не вказані дані для оновлення рослини.');
        }
        const updatedPlant = await Plant.findByIdAndUpdate(plantId, updatedData, { new: true });

        if (!updatedPlant) {
            return res.status(404).send('Рослину не знайдено для оновлення.');
        }
        res.status(200).send('Рослину оновлено успішно.');
    } catch (error) {
        console.error('Помилка при оновленні рослини:', error);
        res.status(500).send(`Помилка: ${error.message}`);
    }
});
