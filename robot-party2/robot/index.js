// Generate random room name if needed
if (!location.hash) {
  location.hash = makeid(6);
}
let roomName = location.hash.substring(1);
console.log("roomName = " + roomName);

let robotId = window.localStorage.getItem("robotId") || -1;
let passCode = window.localStorage.getItem("passCode") || "";

const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
});

let droneRoomName = 'observable-' + hash(roomName + "-" + passCode);
let isOfferer = false;

$(()=>{
  room = drone.subscribe(droneRoomName);

  room.on('open', () => console.log("room.open"));

  room.on('members', members => {
    console.log('room.members', members);
    // If we are the second user to connect to the room we will be creating the offer
  });

  startPeer();
});

let p;

function startPeer() {
  p = new SimplePeer({
          initiator: false,
          trickle: false
  });

  room.on('data', (data, client) => {
    if (client.id === drone.clientId) {
      return;
    }
    console.log("room.signal", data);
    p.signal(data);
  });

  p.on('signal', data=> {
      console.log("peer.signal -> ", data);
      drone.publish({
        room: droneRoomName,
        message: data
      });
  });

  p.on('close', data=> {
    console.log("peer.close");
    p.destroy();
    startPeer();
  });

  p.on('data', data=> {
    console.log(data);
  });
}
