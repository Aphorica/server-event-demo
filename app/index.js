const express = require('express');
const {ServerEventMgr,serverEventRouter} = require('ServerEvent');
const app = express();

var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Content-Length, X-Requested-With');
  // intercept OPTIONS method
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
  } else {
    next();
  }
};

app.use(allowCrossDomain);
app.use(serverEventRouter);

ServerEventMgr.setNotifyListenersChanged(true);

app.get('/make-id/:name', function(req,rsp) {
  let id = ServerEventMgr.getUniqueID(req.params.name);
  rsp.send(id);
});

app.put('/submit-task/:id/:taskid', function(req, res) {
  let id = req.params.id, taskid = req.params.taskid;
  if (ServerEventMgr.isRegistered(id)) {
    setTimeout(async ()=>{ await ServerEventMgr.notifyCompletions(id, taskid)}, 5000);
    res.send("ok")
  }
  else
    res.status(404).send("not found");
});

app.get('/list-registrants', function(req, res) {
  res.send(ServerEventMgr.getListenersJSON());
});

app.get('/clear-registrants', function(req, res) {
  await ServerEventMgr.unregisterAllListeners();
  res.send("ok");
});

/**
 * register a listener
 */
app.get('/register-listener/:id', function(req, res) {
  let id = req.params.id;
  ServerEventMgr.registerListener(id, res);
});

app.get('/disconnect-registrant/:id', function(req,res){
  ServerEventMgr.unregisterListener(req.params.id);
  res.send('ok');
});

app.get('/testme', function(req, res) {
  console.log('server: in testme');
  sendResponse(res, "I'm here!!!\n");
});

app.listen(3000);
console.log('Listening on port 3000');