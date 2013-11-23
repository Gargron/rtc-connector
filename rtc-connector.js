if (typeof exports === 'object' && typeof define !== 'function') {
  define = function (factory) {
    factory(require, exports, module);
  };
}

define(function (require, exports, module) {
  var RTCPeerConnection = (RTCPeerConnection || mozRTCPeerConnection) || webkitRTCPeerConnection;
  var RTCSessionDescription = (RTCSessionDescription || mozRTCSessionDescription) || webkitRTCSessionDescription;
  var RTCIceCandidate = (RTCIceCandidate || mozRTCIceCandidate) || webkitRTCIceCandidate;

  var peerConfig = {
    "iceServers": [
      {
        "url": "stun:stun.services.mozilla.com"
      }
    ]
  };

  var peerConstraints = {
    "optional": [
      {
        "DtlsSrtpKeyAgreement": true
      }
    ]
  };

  var offerConstraints = {
    'optional': [],
    'mandatory': {
      'OfferToReceiveAudio': true,
      'OfferToReceiveVideo': true
    }
  };

  var Peer = function (id, signalFn, onStreamFn, offStreamFn) {
    var self = this;

    this.id = id;
    this.connection = new RTCPeerConnection(peerConfig, peerConstraints);
    this.remoteStream = null;
    this.localStream = null;
    this.signalFn = signalFn;
    this.onStreamFn = onStreamFn;
    this.offStreamFn = offStreamFn;

    this.connection.onicecandidate = function (e) {
      if (e.candidate) {
        console.log('Ice candidate generated', e.candidate);
        self.deliver('candidate', e.candidate.candidate);
        self.connection.onicecandidate = null;
      } else {
        console.log('End of ice candidates');
      }
    };

    this.connection.onnegotiationneeded = function () {
      self.connection.createOffer(function (offer) {
        console.log('Offer created', offer);
        toWhom.connection.setLocalDescription(offer);
        toWhom.deliver('offer', offer);
      }, function (err) {
        console.error(err);
      }, offerConstraints);
    };

    this.connection.onaddstream = function (e) {
      self.remoteStream = e.stream;
      console.log('Stream added', self.remoteStream);

      if (typeof self.onStreamFn === 'function') {
        self.onStreamFn.call(self.onStreamFn, self.remoteStream);
      }
    };

    this.connection.onremovestream = function (e) {
      self.remoteStream = null;
      console.log('Stream removed');

      if (typeof self.offStreamFn === 'function') {
        self.offStreamFn.call(self.offStreamFn);
      }
    };
  };

  Peer.prototype.setOutgoingStream = function (stream) {
    if (this.localStream) {
      this.connection.removeStream(this.localStream);
    }

    this.connection.addStream(stream);
    this.localStream = stream;
  };

  Peer.prototype.disconnect = function () {
    this.connection.close();
  };

  Peer.prototype.deliver = function (type, payload) {
    if (typeof this.signalFn !== 'function') {
      throw new Exception('Signal channel delivery function not set for peers');
    }

    console.log('Delivery imminent', type, payload);

    this.signalFn.call(this.signalFn, {
      to: this.id,
      type: type,
      payload: payload
    });
  };

  Peer.prototype.addCandidate = function (candidate) {
    console.log('Registering ice candidate', candidate);
    this.connection.addIceCandidate(new RTCIceCandidate({
      candidate: candidate
    }));
  };

  var RtcConnector = function (signalFn, onStreamFn, offStreamFn) {
    this.peers = [];
    this.globalOutgoingStream = null;
    this.signalFn = signalFn;
    this.onStreamFn = onStreamFn;
    this.offStreamFn = offStreamFn;
  };

  RtcConnector.prototype.prepareCall = function (toWhom) {
    toWhom.connection.createOffer(function (offer) {
      console.log('Offer created', offer);
      toWhom.connection.setLocalDescription(offer);
      toWhom.deliver('offer', offer);
    }, function (err) {
      console.error(err);
    }, offerConstraints);
  };

  RtcConnector.prototype.callAllPeers = function () {
    var self = this;

    this.peers.forEach(function (peer) {
      self.prepareCall(peer);
    });
  };

  RtcConnector.prototype.respond = function (toWhom, offer) {
    toWhom.connection.setRemoteDescription(new RTCSessionDescription(offer));

    toWhom.connection.createAnswer(function (answer) {
      console.log('Answer created', answer);
      toWhom.connection.setLocalDescription(answer);
      toWhom.deliver('answer', answer);
    }, function (err) {
      console.error(err);
    }, offerConstraints);
  };

  RtcConnector.prototype.finalizeCall = function (toWhom, answer) {
    toWhom.connection.setRemoteDescription(new RTCSessionDescription(answer));
  };

  RtcConnector.prototype.registerPeer = function (id) {
    var peer = new Peer(id, this.signalFn, this.onStreamFn, this.offStreamFn);

    if(this.globalOutgoingStream) {
      peer.setOutgoingStream(this.globalOutgoingStream);
    }

    this.peers.push(peer);

    return peer;
  };

  RtcConnector.prototype.findPeer = function (id) {
    var found = null;

    this.peers.forEach(function (peer) {
      if (peer.id === id) {
        found = peer;
      }
    });

    return found;
  };

  RtcConnector.prototype.setGlobalOutgoingStream = function (stream) {
    this.globalOutgoingStream = stream;

    this.peers.forEach(function (peer) {
      peer.setOutgoingStream(stream);
    });
  };

  exports.Peer = Peer;
  exports.RtcConnector = RtcConnector;
});
