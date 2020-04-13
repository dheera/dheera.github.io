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


const drone = new ScaleDrone('yiS12Ts5RdNhebyM');
drone.on('open', error => {
  if (error) {
    return console.error(error);
  }
});

let droneRoomName = "";
let isOfferer = false;

function verifyAuth(passCode, onSuccess, onFailure) {
  droneRoomName = 'observable-' + hash(roomName + "-" + passCode);
  room = drone.subscribe(droneRoomName);

  room.on('open', error => console.error(error));

  room.on('members', members => {
    console.log('MEMBERS', members);
    // If we are the second user to connect to the room we will be creating the offer
  });

  room.on('data', (message, client) => {
    if (client.id === drone.clientId) {
      return;
    }
    p.signal(message);
  });

  p.on('signal', data=> {
      drone.publish({
        room: droneRoomName,
        message
      });
  });
}

const p = new SimplePeer({
        initiator: false,
        trickle: false
});
