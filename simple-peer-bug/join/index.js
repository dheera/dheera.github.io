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
let isOfferer = true;

function verifyAuth(passCode, onSuccess, onFailure) {
  droneRoomName = 'observable-' + hash(roomName + "-" + passCode);
  room = drone.subscribe(droneRoomName);

  room.on('open', error => console.error(error));

  room.on('members', members => {
    console.log('MEMBERS', members);
    // If we are the second user to connect to the room we will be creating the offer
    isOfferer = true;

    onSuccess();
  });

  p = new SimplePeer({
          initiator: true,
          trickle: false
  });

  room.on('data', (data, client) => {
    if (client.id === drone.clientId) {
      return;
    }
    console.log("signal <- ", data);
    p.signal(data);
  });

  p.on('signal', data=> {
      console.log("signal -> ", data);
      drone.publish({
        room: droneRoomName,
        message: data
      });
  });

  p.on('data', data=> {
    console.log(data);
  });
}

function onSuccess() {};
function onFailure() {};

let p;
