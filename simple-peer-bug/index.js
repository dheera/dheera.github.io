function randomId(length) {
   var result           = '';
   var characters       = 'abcdefghijklmnpoqrstuvwxyz';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

// Generate random room name if needed
if (!location.hash) {
  location.hash = randomId(6);
}

window.onhashchange = function() {
    window.location.reload();
}

let roomName = location.hash.substring(1);
console.log("roomName = " + roomName);

const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
});
let droneRoomName = 'observable-' + roomName;
let isOfferer = false;

$(()=>{
  room = drone.subscribe(droneRoomName);

  room.on('open', () => console.log("room.open"));

  room.on('members', members => {
    console.log('room.members', members);
    // we are the offerer if we are the 2nd person in the room
    isOfferer = members.length === 2;
    startPeer();
  });
});

let p;
let interval;

function startPeer() {
  console.log("isOfferer = " + isOfferer);

  p = new SimplePeer({
          initiator: isOfferer,
          trickle: false
  });

  // signal (incoming)
  room.on('data', (data, client) => {
    if (client.id === drone.clientId) {
      return;
    }
    console.log("room.signal", data);
    p.signal(data);
  });

  // signal (outgoing)
  p.on('signal', data=> {
      console.log("peer.signal -> ", data);
      drone.publish({
        room: droneRoomName,
        message: data
      });
  });

  // if the connection gets closed,
  // destroy the Peer object and re-instantiate it so
  // we are ready for a new connection

  p.on('close', data=> {
    console.log("peer.close");
    clearInterval(interval);
    p.destroy();
    startPeer();
  });


  // received data
  p.on('data', data=> {
    let message = new TextDecoder("utf-8").decode(data);
    console.log("received: " + message);
  });

  // send hello world every 1 second
  interval = setInterval(() => {
    if(!p.connected) return;
    let message = "hello world " + Math.random();
    console.log("sending: " + message);
    p.send(message);
  }, 1000);
}
