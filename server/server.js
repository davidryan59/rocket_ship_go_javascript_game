var express = require('express');
var app = express();
var path = require('path');

console.log("Starting server")

app.get('/', function (req, res) {
  console.log("GET request to /")
  res.sendFile(path.join(__dirname + '/../client/build/index.html'));
});

app.use(express.static('client/build'));

var server = app.listen(3001, function () {
// var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Rocket Ship Go! listening at http://localhost:%s', port);
});
