const mongoose = require('mongoose');
const Reminder = require('./models/reminder');
const express = require('express');
const router = express.Router();
const dbURI = 'mongodb+srv://gmgadmin:RF8eo4JVyJ8JyPuq@cluster0.b6uj2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0' 
router.get('/reminders', async (req, res) => 
{
    try {
        const reminders = await Reminder.find();
        console.log(res);
    } catch (error){
        console.log(error);
    }
})
