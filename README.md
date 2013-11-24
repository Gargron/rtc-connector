rtc-connector
=============

JavaScript WebRTC connector class. **Work in progress**

Usage
-----

Assuming you use [require.js][1] to load it:

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

Help! How does WebRTC work?
---------------------------

Yeah, I didn't know either, and I found it to be quite confusing, which is why I'm adding this section, just in case. You probably do know that WebRTC is about peer-to-peer communications.

The truth is, you still need a central server to coordinate the start of such communications — that is the "signalling channel".

Whoever you want to communicate with is called a "peer", and that's what `RTCPeerConnection` is all about. Also, `MediaStream`s is what is being transmitted. Such a "peer" object keeps track of the incoming stream (remote) that you are receiving and the outgoing stream (local) that you are sending to that peer.

When you want to initiate communication with a peer, you generate an "offer", and send that over through the signalling channel. The receiver of that offer then generates an "answer" and sends it back. At the same time, `RTCPeerConnection` generates an "ICE candidate" (not a German high-speed train) which also needs to be delivered to the remote peer. And when you receive such an ICE candidate, you also have to add it to the corresponding peer object. That ICE is basically about finding a route (IPs, ports, etc) directly from the browser of one peer to the browser of the other peer.

I hope this short passage sheds some light on why I designed this class and named the methods this way.

Please also note that `MediaStream`s are a whole Pandora's Box on their own. The most talked-about use case is acquiring access to the user's camera and microphone through `navigator.getUserMedia`, but in theory, `<video>` and `<audio>` contents are `MediaStream`s as well. There is a [whole draft on processing and mixing those][2], though unfortunately at the time of writing it is not very complete and barely implemented.
