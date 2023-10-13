const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Load routes
const plantRoutes = require('./routes/plants');
const reminderRoutes = require('./routes/reminders');
app.use('/plants', plantRoutes);
app.use('/reminders', reminderRoutes);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
