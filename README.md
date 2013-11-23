rtc-connector
=============

JavaScript WebRTC connector class. **Work in progress**

Usage
-----

Assuming you use require.js to load it:

```javascript
require(['rtc-connector'], function (webrtc) {
  // Callbacks and functions that are abstracted away from this library

  var signalDeliveryFunction = function (data) {
    // For example, a socket.io "emit" call, or whatever
    // Your signalling channel will need to keep track of peers via some ID,
    // in the messages "from" and "to" are the expected properties
  };

  var onAddStream = function (stream) {
    // Fires when we receive a remote stream from a peer
  };

  var onRemoveStream = function () {
    // Fires when we lose the remote stream
  };

  // Constructing the class itself

  var peerConnector = new webrtc.RtcConnector(signalDeliveryFunction, onAddStream, onRemoveStream);

  // Setting local stream

  navigator.getUserMedia({video: true, audio: true}, function (stream) {
    peerConnector.setGlobalOutgoingStream(stream);
  });

  // Registering a new peer (for example, from a list of all peers you could
  // receive from your socket.io server)

  peerConnector.registerPeer(peerId);

  // Negotiation handling via a signalling channel

  signallingChannel.on('message', function (d) {
    var peer = peerConnector.findPeer(d.from);

    if (peer === null) {
      peer = peerConnector.registerPeer(d.from);
    }

    if (d.type === 'offer') {
      peerConnector.respond(peer, d.payload);
    } else if (d.type === 'answer') {
      peerConnector.finalizeCall(peer, d.payload);
    } else if (d.type === 'candidate') {
      peer.addCandidate(d.payload);
    }
  });

  // Calling all peers

  peerConnector.callAllPeers();
});
```
