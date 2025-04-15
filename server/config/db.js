import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';

dotenv.config(); // Load .env variables
const uri = process.env.MONGO_URI;

const connectDB = async () => {
  try{
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Successfully connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1); // Exit process on failure
  }
};
// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (error) => {
  console.log('Mongoose connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});


// Create a MongoClient with a MongoClientOptions object
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// You can add a function to connect with the MongoDB driver directly if needed
const connectWithMongoClient = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB with MongoClient");
    return client;
  } catch (error) {
    console.error("Error connecting with MongoClient:", error);
    throw error;
  }
};

export default connectDB;
export { connectWithMongoClient, client };