const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { Schema } = mongoose;

// MongoDB connection setup
const uri = "mongodb+srv://XXXX:XXXX@audiodb.txm6x.mongodb.net/?retryWrites=true&w=majority&appName=audioDB";

// Connect to MongoDB Atlas
mongoose.connect(uri)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Set up storage configuration for multer (saving audio files in 'uploads' directory)
const storage = multer.memoryStorage(); // Use memoryStorage to store the file in memory
const upload = multer({ storage });

// Define the Audio schema
const audioSchema = new Schema({
  fileName: String,
  fileData: Buffer, // Store audio as a binary data buffer
  contentType: String,
  createdAt: { type: Date, default: Date.now },
});

const Audio = mongoose.model('Audio', audioSchema); // Create the Audio model

// Initialize express app
const app = express();
const port = 5000;

// Middleware to parse JSON requests
app.use(express.json());

// POST endpoint for saving the audio file
app.post('/upload-audio', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'No file uploaded' });
  }

  try {
    const audio = new Audio({
      fileName: `audio_${Date.now()}.wav`, // You can customize the filename
      fileData: req.file.buffer,          // Store the audio file as a Buffer
      contentType: req.file.mimetype,    // Store content type (audio/wav)
    });

    await audio.save(); // Save the audio file to MongoDB
    res.send({ message: 'File uploaded successfully', fileId: audio._id });
  } catch (error) {
    console.error('Error saving audio to MongoDB:', error);
    res.status(500).send({ message: 'Error saving audio' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
