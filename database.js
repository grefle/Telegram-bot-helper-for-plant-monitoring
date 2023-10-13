const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoDBURI = 'mongodb+srv://new_user:024650@cluster0.4tmcbxm.mongodb.net/?retryWrites=true&w=majority';
        await mongoose.connect(mongoDBURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB Atlas');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1); // Exit process with failure
    }
};

const plantSchema = new mongoose.Schema({
    name: String,
    scientificName: String,
    wateringInterval: Number,
    germinationConditions: String,
    lastWatered: Date,
    photoURL: String
});

const Plant = mongoose.model('Plant', plantSchema);

module.exports = {
    connectDB,
    Plant
};
