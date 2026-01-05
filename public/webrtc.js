let video = document.getElementById("myVideo");

async function startCamera(){
try{
  //Ask fro camera and microphone access

  let stream = await navigator.mediaDevices.getUserMedia({
    video:true,
    audio:true
  });

//Show stream in video element 
video.srcObject = stream;
console.log("Camera started");

}catch(err){
  console.log("Error: "+ err);
  alert("Could not access camera and microphone Please check/allow permissions.");

}
}
startCamera();