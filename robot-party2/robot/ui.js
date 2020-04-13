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
