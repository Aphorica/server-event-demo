const express = require('express');
const sse = require('./sse');

const app = express();

const RETRY_INTERVAL = 10000; // 120000;
const CLEANUP_INTERVAL = 2500; // 30000;
const CLEANUP_STALE_ENTRIES_THRESHOLD = 86400000;
          // 5 mins - check to delete cleanups

let connections = {}, removeQueue = {};
let cleanupTimerID = null;

app.use(sse);

function sendResponse(res, msg, code) {
  if (code === undefined) {
    code = 200;
  }
  res.writeHead(code, {
    'Content-Type': 'text/plain',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': msg.length
  });

  res.end(msg);
}

function asyncNotifyListenersChanged() {   
  return new Promise(function(acc, rej) {
    let sseRsps = Object.values(connections);
    if (sseRsps.length === 0)
      acc(true);

    else {
      let msg = "listeners-changed"; 
                  // work on a copy

      function notifyListenersChanged(ix) {
        while(true) {
          if (ix >= sseRsps.length) {
            acc(true);
            break;
          }

          if (sseRsps[ix]['registered-ts'] !== 0) {
            sseRsps[ix].notifyRes.sseSend(RETRY_INTERVAL, msg);
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
    console.log('in asyncCleanupRegistered');
    let allEntries = Object.assign(
              Object.assign({}, removeQueue), connections);
    let idKeys = Object.keys(allEntries);
                    // pull a copy of the keys

    if (idKeys.length === 0) {
      console.log(' --> no connections (no keys)')
      acc(true); // nothing to do
    }
    else {
      function cleanupRegistered(ix) {
        if (ix >= idKeys.length)
          acc(true);

        else {
          let idKey, sseRsp, duration;

          while (true) {
                  // loop through the keys

            if (ix >= idKeys.length) {
              acc(true);
              break;
                    // done
            }

            idKey = idKeys[ix];
            if (!allEntries[idKey])
              continue;
                    // got deleted in between calls -
                    // go on to next without exiting

            sseRsp = allEntries[idKey];
            duration = Date.now() - sseRsp['registered-ts'];
            console.log(' --> duration for id: ' + idKey + ', registered-ts: ' +
                        sseRsp['registered-ts'] + ' = ' +
                        duration/1000);
            if (idKey in removeQueue) {
              if (duration > CLEANUP_STALE_ENTRIES_THRESHOLD) {
                console.log(' --> cleaning stale entry, id: ' + idKey);
                delete removeQueue[idKey];
              }

            } else {
              if (duration > RETRY_INTERVAL + 1000) {
                console.log(' --> moving: ' + idKey + ' to removeQueue');
                removeQueue[idKey] = sseRsp;
                delete connections[idKey];
                            // move to removeQueue
                break;
              }
            }
                    // else loop around for the next
            ++ix;
          }
          
          setImmediate(cleanupRegistered.bind(null, ++ix));
                    // trigger the next iteration
        }
      }

      cleanupRegistered(0);
                    // initial call
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
          if ((idKey in connections) && idKey.startsWith(name)) {
            connections[idKey].notifyRes.sseSend(RETRY_INTERVAL, "completed^" +
              JSON.stringify({"timestamp": Date.now(), "id":idKey}));
                    // notify target listeners for specific event
          }
          
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

app.get('/trigger-server-response/:id', function(req,res) {
  let id = req.params.id;
  console.log('in trigger-server-response: ' +  id);

  if (id in connections) {
    connections[id].notifyRes.sseSend(RETRY_INTERVAL, "triggered^" +
      JSON.stringify({"timestamp": Date.now(), "id":id}));
  }

  sendResponse(res,'ok');
});

app.get('/trigger-cleanup', function(req,res) {
  setTimeout(asyncCleanupRegistered);
  sendResponse(res, 'ok');
});

app.get('/list-registrants', function(req, res) {
  let idKeys = Object.keys(connections);
  let rspData = {}, tmpObj;
  
  for (let ix = 0; ix < idKeys.length; ++ix) {
    let idKey = idKeys[ix];

    if (connections[idKey] && connections[idKey]['registered-ts'] !== 0) {
      tmpObj = Object.assign({}, connections[idKey]);
      delete tmpObj.notifyRes;
      rspData[idKey] = tmpObj;
    }
  }

  sendResponse(res, JSON.stringify(rspData));
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
      resObj = id in connections? connections[id] : {},
      timeStamp = Date.now();

  console.log('in register-listener, id: ' + id);

  if (id in removeQueue) {
    // marked for deletion
    removeQueue[id].notifyRes.sseSend(0, 'removed');
    setTimeout(function(){delete removeQueue[id]}, 1000);
    console.log(' --> deleted from removeQueue: ' + id);
  } else {
    if (!(id in connections)) {
      resObj['notifyRes'] = res;
      console.log(' --> server registered id: ' + id);
    } else {
      console.log(' --> is in connections');
    }

    res.sseSetup();
    res.sseSend(RETRY_INTERVAL, "registered^" + id);
    resObj['registered-ts'] = timeStamp;
    connections[id] = resObj;
  }
});

app.get('/disconnect-registrant/:id', function(req,res){
  let id = req.params.id;
  if (id in connections) {
    removeQueue[id] = connections[id];
    delete connections[id];
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
        setTimeout(asyncNotifyListenersChanged);
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