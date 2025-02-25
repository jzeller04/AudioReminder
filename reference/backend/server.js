const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
const { Schema } = mongoose;

// Dynamically import the 'open' package
(async () => {
  const { default: open } = await import('open'); // Ensure to use default export

  // Function to decode a base64 string and save it as an MP3 file
  function decodeBase64ToMp3(base64String, outputPath) {
    const buffer = Buffer.from(base64String, 'base64'); // Convert the base64 string to a buffer
    fs.writeFile(outputPath, buffer, (err) => { // Write the buffer to a file
      if (err) {
        console.error('Error writing file:', err);
      } else {
        console.log(`File saved as ${outputPath}`);

        // Open the MP3 player in the browser automatically
        open('index.html'); // Update the path if necessary
      }
    });
  }

  // Function to read Base64 data from a file and decode it
  function readBase64AndDecode(inputFile, outputFile) {
    fs.readFile(inputFile, 'utf8', (err, data) => { // Read the base64.txt file
      if (err) {
        console.error('Error reading file:', err);
        return;
      }

      // Remove extra newlines or spaces from Base64 data
      const base64Data = data.replace(/\r?\n|\r/g, '').trim(); // Clean up the base64 string

      // Decode the Base64 data and save it as an MP3 file
      decodeBase64ToMp3(base64Data, outputFile);
    });
  }

  // Function to initialize server and handle base64 file decoding
  function initializeServer() {
    // Convert base64.txt to MP3 file on startup
    const base64FilePath = './base64.txt'; // Path to the base64.txt file
    const mp3FilePath = '../public/output.mp3'; // Path where the MP3 file will be saved

    // Automatically convert base64.txt to output.mp3 when the server starts
    readBase64AndDecode(base64FilePath, mp3FilePath);

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
  }

  // Initialize server on startup
  initializeServer();

})();
