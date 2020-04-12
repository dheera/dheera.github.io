// Generate random room name if needed
if (!location.hash) { location.hash = randomId(6); }

window.onhashchange = function() {
    window.location.reload();
}

// roomName from http://.../robot-party/#roomName
let roomName = location.hash.substring(1);

// Room name needs to be prefixed with 'observable-'
const configuration = {
  iceServers: [{
    urls: 'stun:stun.l.google.com:19302'
  }]
};

let room;
let peerConnection;
let dataChannel;

const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
});

let droneRoomName = "";

function verifyAuth(passCode, onSuccess, onFailure) {
  droneRoomName = 'observable-' + hash(roomName + "-" + passCode);
  room = drone.subscribe(droneRoomName);
  room.on('open', error => {
    if (error) {
      onError(error);
    }
  });
  // We're connected to the room and received an array of 'members'
  // connected to the room (including us). Signaling server is ready.
  room.on('members', members => {
    console.log('MEMBERS', members);
    // If we are the second user to connect to the room we will be creating the offer
    const isOfferer = members.length === 2;

    if(isOfferer) {
      onSuccess();
      startWebRTC(isOfferer);
    } else {
      room.unsubscribe();
      onFailure();
    }
  });
}

function onSuccess() {};
function onError(error, data) {
  console.error(error, data);
};

// Send signaling data via Scaledrone
function sendMessage(message) {
  drone.publish({
    room: droneRoomName,
    message
  });
}

function startWebRTC(isOfferer) {
  peerConnection = new RTCPeerConnection(configuration);

  var dataChannelOptions = {
          ordered: false, //no guaranteed delivery, unreliable but faster
          maxRetransmitTime: 1000, //milliseconds
          negotiated: true,
          id: 0,
  };

  dataChannel = peerConnection.createDataChannel("data", dataChannelOptions);
  dataChannel.onopen = () => {
    console.log("dataChannel.onopen");
  };
  dataChannel.onmessage = event => {
    console.log(event);
  };
  dataChannel.onclose = () => {
    console.log("dataChannel.onclose");
  };

  // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
  // message to the other peer through the signaling server
  peerConnection.onicecandidate = event => {
    console.log("onicecandidate");
    if (event.candidate) {
      sendMessage({'candidate': event.candidate});
    }
  };

  // If user is offerer let the 'negotiationneeded' event create the offer
  if (isOfferer) {
    peerConnection.onnegotiationneeded = () => {
      console.log("onnegotiationneeded");
      peerConnection.createOffer().then(localDescCreated).catch(onError);
    }
  }

  // When a remote stream arrives display it in the #remoteVideo element
  peerConnection.ontrack = event => {
    console.log("ontrack");
    const stream = event.streams[0];
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
    }
  };

  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  }).then(stream => {
    // Display your local video in #localVideo element
    localVideo.srcObject = stream;
    // Add your stream to be sent to the conneting peer
    stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
  }, onError);

  // Listen to signaling data from Scaledrone
  room.on('data', (message, client) => {
    // Message was sent by us
    if (client.id === drone.clientId) {
      return;
    }

    if (message.sdp) {
      console.log("remoteDescription", message.sdp);
      // This is called after receiving an offer or answer from another peer
      peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
        // When receiving an offer lets answer it
        if (peerConnection.remoteDescription.type === 'offer') {
          peerConnection.createAnswer().then(localDescCreated).catch(onError);
        }
      }, onError);
    } else if (message.candidate) {
      // Add the new ICE candidate to our connections remote description
      peerConnection.addIceCandidate(
        new RTCIceCandidate(message.candidate), onSuccess, onError
      );
    } else if(message.ping) {
      sendMessage({'pong': true});
    }
  });
}

function localDescCreated(desc) {
  console.log("localDescription", desc.sdp);
  peerConnection.setLocalDescription(
    desc,
    () => sendMessage({'sdp': peerConnection.localDescription}),
    onError
  );
}
