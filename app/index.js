const express = require('express');
const ServerEventMgr = require('@aphorica/server-event-mgr');
const app = express();

const VERBOSE = true;

function log(str) {
  if (VERBOSE)
    console.log(str);
}

var allowCrossDomain = function(req, res, next) {
  log('allowXDomain: ' + req.method + ' ' + req.path);
  if (req.path.indexOf('/register-listener/') === -1) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Content-Length, X-Requested-With');
    // intercept OPTIONS method
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
  }

  else
    log(' --> filtered');
  
  next();
};

app.use(allowCrossDomain);
app.use(ServerEventMgr.createRouter());

ServerEventMgr.setVerbose(VERBOSE);

//
// Must implement. The prefix isn't really necessary, but nice for consistency.
//
app.put(ServerEventMgr.prefix + 'submit-task/:id/:taskid', function(req, res) {
  let id = req.params.id, taskid = req.params.taskid;
  log('app:submit-task, id: ' + id + ', taskid:' + taskid);
  if (ServerEventMgr.isRegistered(id)) {
    setTimeout(async ()=>{
      await ServerEventMgr.notifyCompletions(id, taskid);
    }, 5000);
    res.send("ok")
  }
  else
    res.status(404).send("not found");
});

app.put(ServerEventMgr.prefix + 'listen/:id/:listenkey', function(req,res) {
  let id = req.params.id, listenKey = req.params['listenkey'];
  log('app:listen, id: ' + id + ', listenKey: ' + listenKey);
  if (ServerEventMgr.isRegistered(id)) {
    switch(listenKey) {
      case 'listeners-changed':
        ServerEventMgr.listenersChangedKey = listenKey;
        break;
      case 'clock-tick':
        setInterval(()=>{
          ServerEventMgr.notifyListeners(id, listenKey);
        }, 60000);
        break;
      default:
        console.error('/listen - unrecognized listen-key: ' + listenKey);
        res.status(500).send("bad key");
    }
    res.send("ok");
  } else {
    log(' --> not registered...');
    res.status(404).send("not found");
  }
});

app.get('/testme', function(req, res) {
  console.log('server: in testme');
  res.send("I'm here!!!\n");
});

app.listen(3000);
console.log('Listening on port 3000');
