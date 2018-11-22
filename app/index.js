const express = require('express');
const sse = require('./sse');

const app = express();

const DEFAULT_DURATION = 86400000;
          // 24 hrs - if we don't hear from you before then,
          // we'll assume you're gone
const CLEANUP_INTERVAL = 30000;
          // 5 mins - check to delete cleanups

let connections = {};
let cleanupTimerID = null;

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

function asyncNotifyListenersChanged() {   
  return new Promise(function(acc, rej) {
    let idKeys = Object.keys(connections);
    if (idKeys.length === 0)
      rej(false);

    else {
      let msg = "listeners:" + idKeys.join('+'); 
      let sseRsps = Object.values(connections);
                  // work on a copy

      function notifyListenersChanged(ix) {
        while(true) {
          if (ix >= sseRsps.length) {
            acc(true);
            break;
          }

          if (sseRsps[ix].duration !== 0) {
            sseRsps[ix].notifyRes.sseSend(msg);
            break;
          }
          ++ix;
        }

        setImmediate(notifyListenersChanged.bind(null, ++ix));
      }

      notifyListenersChanged(0);
    }
  });
}

function asyncCleanupRegistered() {
  return new Promise(function(acc, rej) {
    if (connections.length === 0)
      acc(true); // nothing to do
    else {
      function cleanupRegistered(ix) {
        if (ix >= connections.length)
          acc(true);

        else {
          let idKeys = Object.keys(ix), idKey, sseRsp;
          while (true) {
            if (ix >= idKeys.length) {
              acc(true);
              break;
                    // done
            }
            idKey = idKeys[ix];
            sseRsp = connections[idKey];
            if (!sseRsp.busy) {
                      // leave the busy ones alone

              if ((date.now() - sseRsp.start) > sseRsp.duration)
                delete connections[idKey];
                      // only calc (and optionally delete)
                      // once per iteration
              break;
            }
          }
          
          setImmediate(cleanupRegistered.bind(null, ++ix));
        }
      }

      cleanupRegistered(0);
    }
  });
}

function asyncNotifyCompletions(name) {
  return new Promise(function(acc, rej) {
    let idKeys = Object.keys(connections);
              // get a current snapshot of the keys

    if (idKeys.length === 0)
      acc(true);

    else {
      function notifyCompletions(ix) {
        if (ix >= idKeys.length)
          acc(true);

        else {
          let idKey = idKeys[ix];
          if ((idKey in connections) && idKey.startsWith(name))
            connections[idKey].notifyRes.sseSend("Server completion for: " + idKey);
                    // notify target listeners for specific event
          
          setImmediate(notifyCompletions.bind(null, ++ix));
        }
      }
      
      notifyCompletions(0);
    }
  })
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
    connections[id].notifyRes.start = Date.now();
              // reset the timeout start

    if (req.params.duration)
      connections[id].duration = req.params.duration;

    connections[id].singleShot = req.params.singleShot || false;

    setTimeout(function(){
      asyncNotifyListenersChanged()
                // notify everyone of listener changes
      .then(function(rsp){
        setTimeout(function() {
          let name = id.split('_')[0];
          asyncNotifyCompletions(name);
        }, 5000);
      });
    });

    sendResponse(res, "Submitted for: " + id);
  } else {
    sendResponse(res, "Not registered", 404);
  }
});

app.get('/list-registrants', function(req, res) {
  let rspData = Object.keys(connections).join('+');
  sendResponse(res, rspData);
});

app.get('/clear-registrants', function(req, res) {
  stopCleanupInterval();
  connections = {};
  sendResponse(res, "cleared");
  asyncNotifyListenersChanged();
  startCleanupInterval();
});

/**
 * register a listener
 */
app.get('/register-listener/:id', function(req, res) {
  let id = req.params.id,
      resObj = id in connections? connections[id] : 
               { start:Date.now(), duration: DEFAULT_DURATION} ;
  res.sseSetup();
  res.sseSend("Registered: " + id);
  
  resObj['notifyRes'] = res;
  connections[id] = resObj;
});

app.get('/disconnect-registrant/:id', function(req,res){
  let id = req.params.id;
  if (id in connections) {
    connections[id].duration = 0;
              // mark for deletion on next cleanup loop

    sendResponse(res, 'Server disconnected: ' + id)
    asyncNotifyListenersChanged();
  }
});

app.get('/testme', function(req, res) {
  console.log('server: in testme');
  sendResponse(res, "I'm here!!!\n");
});

function stopCleanupInterval() {
  if (cleanupTimerID > 0) {
    clearTimeout(cleanupTimerID);
    cleanupTimerID = -1;
  }
}

function startCleanupInterval() {
  function doCleanup() {
    cleanupTimerID = setTimeout(function() {
      clearTimeout(cleanupTimerID);
      cleanupTimerID = 0;
      asyncCleanupRegistered()
      .then(function(rsp){
        if (cleanupTimerID === 0)
          setImmediate(doCleanup);
      })
    }, CLEANUP_INTERVAL);
  }

  doCleanup();
}

startCleanupInterval();

app.listen(3000);
console.log('Listening on port 3000');