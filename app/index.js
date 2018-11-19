const express = require('express');
const sse = require('./sse');

const app = express()

let connections = {};

app.use(sse);

function sendResponse(res, msg, code) {
  if (code === undefined) {
    code = 200;
  }
  res.writeHead(code, {
    'Content-Type': 'text/plain',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*'
  });

  res.end(msg);
}

function notifyListenersChanged() {
  let registrants = Object.keys(connections);
  let sseRsps = Object.values(connections);
  let msg = "listeners:" + registrants.join('+');
  for (let ix = 0; ix < sseRsps.length; ++ix)
    sseRsps[ix].sseSend(msg);
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
  if (id in connections) {
    notifyListenersChanged();
              // notify everyone of listener changes
    setTimeout(function() {
      let name = id.split('_')[0];
      let idKeys = Object.keys(connections);
      for (let ix = 0; ix < idKeys.length; ++ix)
        if (idKeys[ix].startsWith(name))
          connections[idKeys[ix]].sseSend("Server completion for: " + id);
                // notify target listeners for specific event
    }, 5000);

    sendResponse(res, "Submitted for: " + id);
  } else {
    sendResponse(res, "Not registered", 404);
  }
});

app.get('/registered-users', function(req, res) {
  let rspData = Object.keys(connections).join('+');
  sendResponse(res, rspData);
});

app.get('/clear-registrants', function(req, res) {
  connections = {};
  sendResponse(res, "cleared");
  notifyListenersChanged();
});

app.get('/stream/:id', function(req, res) {
  let id = req.params.id;
  res.sseSetup();
  res.sseSend("Registered: " + id);
  connections[id] = res;
});

app.get('/disconnect/:id', function(req,res){
  let id = req.params.id;
  delete connections[id];
  sendResponse(res, 'Server disconnected: ' + id)
  notifyListenersChanged();
});

app.get('/testme', function(req, res) {
  console.log('server: in testme');
  sendResponse(res, "I'm here!!!\n");
});

app.listen(3000);
console.log('Listening on port 3000');