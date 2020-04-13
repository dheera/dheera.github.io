// Generate random room name if needed
if (!location.hash) {
  location.hash = makeid(6);
}
let roomName = location.hash.substring(1);

function makeid(length) {
   var result           = '';
   var characters       = 'abcdefghijklmnpoqrstuvwxyz';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}
let hash = function(b){for(var a=0,c=b.length;c--;)a+=b.charCodeAt(c),a+=a<<10,a^=a>>6;a+=a<<3;a^=a>>11;return((a+(a<<15)&4294967295)>>>0).toString(16)};

let robotId = window.localStorage.getItem("robotId") || -1;
let passCode = window.localStorage.getItem("passCode") || "";

$(() => {
  if(!window.localStorage.getItem("robotId")) {
    $("#panelConfiguration").show();
    $("#panelConfiguration-inputPassCode").val(makeid(6));
  } else {
    robotId = window.localStorage.getItem("robotId");
    passCode = window.localStorage.getItem("passCode");
    $("#panelConfiguration-inputRobotId").val(robotId);
    $("#panelConfiguration-inputPassCode").val(passCode);
  }
});

$("#panelConfiguration-buttonSave").click(()=>{
  window.localStorage.setItem("robotId", $("#panelConfiguration-inputRobotId").val());
  window.localStorage.setItem("passCode", $("#panelConfiguration-inputPassCode").val());
  $("#panelConfiguration").hide();
});

// TODO: Replace with your own channel ID
const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
// Room name needs to be prefixed with 'observable-'
const droneRoomName = 'observable-' + hash(roomName + "-" + passCode);
const configuration = {
  iceServers: [{
    urls: 'stun:stun.l.google.com:19302'
  }]
};
let room;
let peerConnection;


function onSuccess() {};
function onError(error) {
  console.error(error);
};

drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
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
    // const isOfferer = members.length === 2;
    const isOfferer = false;
    startWebRTC(isOfferer);
  });
});

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
          id: 5,
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



/*
  peerConnection.ondatachannel = event => {
    // console.log("ondatachannel", event);
    event.channel.onopen = () => {
      console.log("dataChannel.onopen");
    };
    event.channel.onmessage = event => {
      console.log("dataChannel.onmessage", event);
      let message = JSON.parse(event.data);
      if(message.stick) {
        let linear = -message.stick[1];
        let angular = -message.stick[0];
        console.log("robot: linear=" + linear + " angular=" + angular);
      }
    };
    event.channel.onclose = () => {
      console.log("dataChannel.onclose");
    };
  };
*/


  // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
  // message to the other peer through the signaling server
  peerConnection.onicecandidate = event => {
    // console.log("onicecandidate", event);
    if (event.candidate) {
      sendMessage({'candidate': event.candidate});
    }
  };

  // If user is offerer let the 'negotiationneeded' event create the offer
  if (isOfferer) {
    peerConnection.onnegotiationneeded = () => {
      // console.log("onnegotiationneeded");
      peerConnection.createOffer().then(localDescCreated).catch(onError);
    }
  }

  // When a remote stream arrives display it in the #remoteVideo element
  peerConnection.ontrack = event => {
    //console.log("ontrack");
    const stream = event.streams[0];
    if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
      remoteVideo.srcObject = stream;
    }
    $("#panelLocalVideo").fadeOut();
  };

  peerConnection.onconnectionstatechange = event => {
    if(peerConnection.connectionState==="failed") {
      peerConnection.close();
      startWebRTC(isOfferer);
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
    //console.log("data:", message, client);
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
