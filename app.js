//loading all required node modules
//jshint esversion:6
// @ts-ignore
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');

const app = express();
const port = 3000;

// Serve static files from the public directory
app.use(express.static('public'));

// Body parser middleware for parsing JSON data
app.use(bodyParser.json());

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Connect to MongoDB server
mongoose.set('strictQuery', true);
mongoose.connect(process.env.MONGODB_CONNECT_URI, { useNewUrlParser: true });

// Defining the Log schema
const LogSchema = new mongoose.Schema({
  level: String,
  message: String,
  resourceId: String,
  timestamp: Date,
  traceId: String,
  spanId: String,
  commit: String,
  metadata: {
    parentResourceId: String
  }
});

// Creating the Log model
const Log = mongoose.model('Log', LogSchema);

// Home Page
app.get('/', (req, res) => {
  res.render('home');
});

// Log ingestor
app.get('/ingest', (req, res) => {
  res.render('ingest-log');
});

//posting to ingestor
app.post('/ingest-log', async (req, res) => {
    try {
       
      const logData = req.body;
  
      // Adding the current timestamp  
      logData.timestamp = new Date().toISOString();
  
      
      const log = new Log(logData);
  
      // Saveing
      await log.save();
  
      console.log('Log ingested:', logData);
      res.send('Log ingested successfully');
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  

// Query Interface
app.get('/search', (req, res) => {
  res.render('search');
});

//search
app.get('/search-results', async (req, res) => {
    try {
      const query = req.query;
      const filteredLogs = await filterLogs(query);
      res.render('index', { logs: filteredLogs });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
 
  app.get('/logs', async (req, res) => {
    try {
      // Fetching
      const allLogs = await Log.find({});
      
       //render the all logs page
      res.render('logs', { logs: allLogs });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  
// Filtering logs function
async function filterLogs(filters) {
    // Extract filter values from the request
    const {
      level = '',
      message = '',
      resourceId = '',
      startTimestamp = '',
      endTimestamp = '',
      traceId = '',
      spanId = '',
      commit = '',
      parentResourceId = '',
      searchString = '', // this adds text search facility in the database
    } = filters;
  
    
    const query = {};
  
    // Add criteria to the query if the filter is not an empty string
    if (level !== '') {
      query.level = { $regex: level, $options: 'i' }; // Case-insensitive substring match
    }
  
    if (message !== '') {
      query.message = { $regex: message, $options: 'i' };
    }
  
    if (resourceId !== '') {
      query.resourceId = { $regex: resourceId, $options: 'i' };
    }
  
    if (startTimestamp !== '' && endTimestamp !== '') {
      // Adding a date range query for logs between startTimestamp and endTimestamp
      query.timestamp = { $gte: new Date(startTimestamp), $lte: new Date(endTimestamp) };
    }
  
    if (traceId !== '') {
      query.traceId = { $regex: traceId, $options: 'i' };
    }
  
    if (spanId !== '') {
      query.spanId = { $regex: spanId, $options: 'i' };
    }
  
    if (commit !== '') {
      query.commit = { $regex: commit, $options: 'i' };
    }
  
    if (parentResourceId !== '') {
      query['metadata.parentResourceId'] = { $regex: parentResourceId, $options: 'i' };
    }
  
    // Adding substring search for all fields
    if (searchString !== '') {
      const substringSearch = { $regex: searchString, $options: 'i' };
      query.$or = [
        { level: substringSearch },
        { message: substringSearch },
        { resourceId: substringSearch },
        { traceId: substringSearch },
        { spanId: substringSearch },
        { commit: substringSearch },
        { 'metadata.parentResourceId': substringSearch },
      ];
    }
  
    
    return await Log.find(query);
  }
  
// Starting the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
