const express = require('express');
const sse = require('./sse');

const app = express()

let connections = {};

app.use(sse);

function sendResponse(res, msg) {
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });

  res.end(msg);
}

app.get('/make-id/:name', function(req,rsp) {
  let name = req.params.name;
  let id = '';

  console.log('server in make-id: ' + name);
  
  do {
    id = [name, Math.random().toString(36).substring(7)].join('_');
  } while (id in connections);

  sendResponse(rsp, id);
});

app.get('/submitted/:id', function(req, res) {
  let id = req.params.id;
  console.log('server in submitted: ' + id);
  setTimeout(function() {
    let name = id.split('_')[0];
    let idKeys = Object.keys(connections);
    for (let ix = 0; ix < idKeys.length; ++ix)
      if (idKeys[ix].startsWith(name))
        connections[idKeys[ix]].sseSend("Server completion for: " + id);
  }, 5000);

  sendResponse(res, "Submitted for: " + id);
});

app.get('/stream/:id', function(req, res) {
  let id = req.params.id;
  res.sseSetup();
  res.sseSend("Registered: " + id);
  connections[id] = res;
});

app.get('/disconnect/:id', function(req,res){
  delete connections[req.param.id];
  sendResponse(res, 'Server disconnected: ' + id)
});

app.get('/testme', function(req, res) {
  console.log('server: in testme');
  sendResponse(res, "I'm here!!!\n");
});

app.listen(3000);
console.log('Listening on port 3000');