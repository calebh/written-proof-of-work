import Quill from 'quill/core';

import Toolbar from 'quill/modules/toolbar';
import Snow from 'quill/themes/snow';

import Bold from 'quill/formats/bold';
import Italic from 'quill/formats/italic';
import Header from 'quill/formats/header';

//import TimeStampReq from 'pkijs';
const pkijs = require('pkijs');
const asn1js = require('asn1js');
const FileSaver = require('file-saver');

import './style.css';
const stringify = require('json-stringify-deterministic');

Quill.register({
  'modules/toolbar': Toolbar,
  'themes/snow': Snow,
  'formats/bold': Bold,
  'formats/italic': Italic,
  'formats/header': Header
});

export default Quill;

var quill = new Quill('#editor-container', {
  modules: {
    toolbar: true
  },
  placeholder: 'Compose an epic...',
  theme: 'snow'
});

var history = [];
var historyLocked = false;
var historyBuff = [];

var addToHistory = (info) => {
  if (historyLocked) {
    historyBuff.push(info);
  } else {
    history.push(info);
  }
};

var lockHistory = () => {
  historyLocked = true;
};

var unlockHistory = () => {
  history.push.apply(history, historyBuff);
  historyBuff = [];
  historyLocked = false;
}

// Store accumulated changes
//var change = new Delta();
quill.on('text-change', function(delta) {
  addToHistory({type: "delta", time: Date.now(), delta: delta});
});

// Timestamp every 20 seconds
var stampInterval = 20 * 1000;

var changesSinceLastTimestamp = function() {
  if (history.length == 0) {
    return history;
  } else {
    var lastTimeStampIdx = history.length - 1;
    for (; lastTimeStampIdx >= 0; lastTimeStampIdx--) {
      if (history[lastTimeStampIdx].type === "timestamp") {
        break;
      }
    }
    if (lastTimeStampIdx >= 0) {
      // Found a timestamp at the given idx
      return history.slice(lastTimeStampIdx);
    } else {
      // Did not find a timestamp at all in the history
      return history;
    }
  }
};

var generateNonce = function() {
  var nonceBuff = new ArrayBuffer(8);
  var nonceView = new Uint8Array(nonceBuff);
  crypto.getRandomValues(nonceView);
  return new asn1js.Integer({ valueHex: nonceBuff });
};

var encodeStr = (str) => new TextEncoder("utf-8").encode(str);

var generateTimestampReq = async (encodedStr) => {
  return new pkijs.TimeStampReq({
    version: 1,
    messageImprint: await pkijs.MessageImprint.create('SHA-256', encodedStr),
    certReq: true,
    nonce: generateNonce()
  });
};

function base64ToArrayBuffer(base64) {
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (var i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function hexToBytes(hex) {
  let bytes = new Uint8Array(hex.length / 2);
  for (let c = 0, i = 0; c < hex.length; c += 2, i += 1) {
    bytes[i] = parseInt(hex.substr(c, 2), 16);
  }
  return bytes;
}

// TODO: Figure out a way to work around CORs issue
// At the moment there are no timestamp servers that allow
// cross origin connections
const tsa = "http://timestamp.sectigo.com/";

const tsa_cert = (() => {
  const sectigoRootCa = "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";
  var ber = base64ToArrayBuffer(sectigoRootCa);
  const asn1 = asn1js.fromBER(ber)
  return new pkijs.Certificate({ schema: asn1.result })
})();

// Verifies that a timestamp response is correct for a given encoded string
var verifyTimestampRsp = async (encodedStr, timestampRsp) => {
  // Verify that the timestamp is okay
  var verificationParams = {
    signer: 0,
    data: encodedStr,
    trustedCerts: [tsa_cert],
    checkChain: true
  };

  var okay = false;
  try {
    okay = await timestampRsp.verify(verificationParams);
  } catch (e) {
    okay = false;
  }
  
  return okay;
};

// Given an input history, this function verifies all cryptographic timestamps
// and validates temporal monoticity
var verifyEntireHistory = async (history) => {
  if (history.length > 0) {
    // Check #1: Last element of history must be a timestamp
    if (history[history.length - 1].type !== "timestamp") {
      return false;
    }
    // Check #2: Each timestamp must be valid, encoding the previous history
    // and being correctly signed by the TSA
    var startIdx = 0;
    for (var currIdx = 0; currIdx < history.length; currIdx += 1) {
      if (history[currIdx].type === "timestamp") {
        var subHistory = history.slice(startIdx, currIdx);
        var subHistoryStr = stringify(subHistory);
        var encodedSubHistory = encodeStr(subHistoryStr);
        var tspRsp = pkijs.TimeStampResp.fromBER(hexToBytes(history[currIdx].timestamp));

        var okay = await verifyTimestampRsp(encodedSubHistory, tspRsp);
        if (!okay) {
          return false;
        }

        startIdx = currIdx;
      }
    }
    // Check #3: The times attached to the deltas/documents must be monotonically
    // increasing
    var lastTime = null;
    for (var i = 0; i < history.length; i += 1) {
      if (history[i].type === "delta" || history[i].type === "document") {
        var currTime = history[i].time;
        if (lastTime !== null) {
          if (lastTime > currTime) {
            return false;
          }
        }
        lastTime = currTime;
      }
    }
    // Check #4: All document -> timestamp -> delta sequences must
    // be monotonically increasing within a 10 second margin of error
    for (var currIdx = 0; i < history.length; currIdx += 1) {
      if (history[currIdx].type === "timestamp") {
        var prevTime = history[currIdx - 1].time;
        var prevTimeSlacked = new Date(prevTime - (10 * 1000));

        var tspRsp = pkijs.TimeStampResp.fromBER(hexToBytes(history[currIdx].timestamp));
        var signedData = new pkijs.SignedData({schema: tspRsp.timeStampToken.content});
        var tstInfo = pkijs.TSTInfo.fromBER(signedData.encapContentInfo.eContent.valueBlock.valueHexView);
        
        var tokenTime = tstInfo.genTime;

        if (prevTimeSlacked > tokenTime) {
          return false;
        }

        if ((currIdx + 1) < history.length) {
          var nextTime = history[currIdx + 1].time;
          var nextTimeSlacked = new Date(nextTime + (10 * 1000));
          if (tokenTime > nextTimeSlacked) {
            return false;
          }
        }
      }
    }
  }

  return true;
};

var getCurrentContents = () => quill.getContents();

var doTimestamp = async () => {
  if (history.length > 0) {
    // Check if there has been a delta since we last committed
    if (history[history.length - 1].type === "delta") {
      // Add the entire contents of the document to the history
      addToHistory({type: "document", time: Date.now(), contents: getCurrentContents()});

      lockHistory();

      var changesToTimestamp = changesSinceLastTimestamp();
      var changesStr = stringify(changesToTimestamp);
      var encodedStr = encodeStr(changesStr);
      
      var tspReq = await generateTimestampReq(encodedStr);
      var bodyData = tspReq.toSchema().toBER();
      
      var fetchRsp;
      try {
        fetchRsp = await fetch(tsa, {
          method: 'POST',
          headers: {
            "Content-Type": "application/timestamp-query"
          },
          body: bodyData
        });
      } catch (e) {
        return false;
      }

      var data = await (await fetchRsp.blob()).arrayBuffer();
      var tspRsp = pkijs.TimeStampResp.fromBER(data);
      var okay = await verifyTimestampRsp(encodedStr, tspRsp);

      if (okay) {
        var histTimeStamp = {"type": "timestamp", "timestamp": tspRsp.toString()};
        history.push(histTimeStamp);
      } else {
        console.log("Unable to validate timestamp server response. The certificate validation chain was likely invalid. By default this program trusts the Sectigo TSA Root Certificate, which expires on Jan 18, 2038.");
      }

      unlockHistory();
    }
  }

  return true;
};

// Save periodically
setInterval(doTimestamp, stampInterval);

document.getElementById('export-history-button').onclick = async () => {
  var timestampSucceeded = await doTimestamp();
  if (timestampSucceeded) {
    var blob = new Blob([stringify(history)], {type: "text/plain;charset=utf-8"});
    FileSaver.saveAs(blob, "demo-document.json");
  } else {
    alert("Failed to timestamp document with Sectigo Timestamp Authority (TSA). This is typically caused by CORS restrictions being enabled in your browser settings, but it could also occur if the TSA is down or otherwise unreachable.");
  }
};

let isObject = (value) => value !== null && typeof value === 'object';
let isString = (value) => typeof value === 'string' || value instanceof String;
let isNumber = (value) => !isNaN(value) && typeof value === 'number';

var validateSchema = (history) => {
  if (Array.isArray(history)) {
    var prevType = null;
    for (var i = 0; i < history.length; i += 1) {
      var entry = history[i];
      if (isObject(entry) && entry.hasOwnProperty("type")) {
        if (entry.type === "timestamp") {
          if (!(entry.hasOwnProperty("timestamp") && isString(entry.timestamp) && prevType === "document")) {
            return false;
          }
        } else if (entry.type === "delta") {
          if (!(entry.hasOwnProperty("time") && isNumber(entry.time) && entry.hasOwnProperty('delta'))) {
            return false;
          }
        } else if (entry.type === "document") {
          if (!(entry.hasOwnProperty("time") && isNumber(entry.time) && entry.hasOwnProperty("contents"))) {
            return false;
          }
        }
        prevType = entry.type;
      } else {
        return false;
      }
    }

    return true;
  } else {
    return false;
  }
}

document.getElementById('verify-file-chooser').addEventListener('change', function() {
  var fr = new FileReader();
  fr.onload = async () => {
    try {
      var parsedHistory = JSON.parse(fr.result);
      if (validateSchema(parsedHistory)) {
        var okay = await verifyEntireHistory(parsedHistory);
        if (okay) {
          alert("Your edit history passed the verification check!");
        } else {
          alert("Your edit history failed the verification check!");
        }
      } else {
        alert("Input file did not have a valid schema.");
      }
    } catch (e) {
      console.log(e);
      alert("Input file was not valid JSON.");
    }
  };
  if (this.files.length > 0) {
    fr.readAsText(this.files[0]);
  }
});
