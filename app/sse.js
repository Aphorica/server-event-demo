module.exports = function (req, res, next) {
  res.sseSetup = function(close) {
    let rspCode = close? 404 : 200;
    let contentType = close? 'text/plaintext' : 'text/event-stream';
    res.writeHead(rspCode, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    })
  }

  res.sseSend = function(retryInterval, data) {
    let msg = '';
//    if (retryInterval !== 0)
//      msg = "retry:" + retryInterval + "\n";

    msg += "data:" + JSON.stringify(data) + "\n\n";
    res.write(msg);
  }

  next();
}
