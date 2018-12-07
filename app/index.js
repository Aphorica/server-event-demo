const express = require('express');
const {ServerEventMgr,serverEventRouter} = require('./ServerEvent.js');
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
ServerEventMgr.setVerbose(true);

app.put('/submit-task/:id/:taskid', function(req, res) {
  let id = req.params.id, taskid = req.params.taskid;
  if (ServerEventMgr.isRegistered(id)) {
    setTimeout(async ()=>{ await ServerEventMgr.notifyCompletions(id, taskid)}, 5000);
    res.send("ok")
  }
  else
    res.status(404).send("not found");
});

app.get('/testme', function(req, res) {
  console.log('server: in testme');
  res.send("I'm here!!!\n");
});

app.listen(3000);
console.log('Listening on port 3000');