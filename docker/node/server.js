const express = require('express');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

const PORT = 3000;
const HOST = '0.0.0.0';

// connect MongoDB
var db = mongoose.createConnection('mongodb://root:GUARDIAN@0.0.0.0:27017/test', {
    useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false
}).then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

db.once('open', function () {
  var gfs = Grid(db.db, mongoose.mongo);
  console.log("gfs");
})

// app
const app = express();
app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);