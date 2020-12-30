import React, { useState } from "react";
import Janus from "./Janus";
import $ from "jquery";
import { Container, Row, Col, ThemeProvider } from "react-bootstrap";
import Countdown from "react-countdown";
import axios from "axios";

let server;

try {
  server = require("./config.json").janusServer;
} catch (err) {
  console.log(err);
  // server = "http://localhost:8088/janus";
}
let gestureGameroom = null;
let vroomHandle = null;
let myroom = null;
let opaqueId = "videoroom-" + Janus.randomString(12);
let mypvtid = null;
let feeds = [];
let myid = null;
let mystream = null;

// question from datachannel
let question = "";
let theirQuestion = "";
let sendMessage = "";

let myIndexInRoom = 0;
let userName = "";
let arr1 = [0, 1];
let arr2 = [2, 3];
let arr3 = [4, 5];
let res = null;
let listReq = null;
let frequency = 5000 * 6;
let scoreA = 0;
let scoreB = 0;

// form team usage only, date structure would be {playername => {id: rfid, team: team, videoindex: rfindex}}
let players = new Map();
// form team usage only, data structure would be {A: ['jyn', ...]}, B: ['debo', ...]}
let teams = {A: [], B: []};

// start game usage only
let remoteStart = false; 

function updateTeamStatus(playerName, teamID) {
	// remove from the original team
	if ('team' in players.get(playerName)) {
		let oldTeam = players.get(playerName).team;
		let pos = teams[oldTeam].indexOf(playerName);
		teams[oldTeam].splice(pos, 1);
	}

	teams[teamID].push(playerName);
	players.get(playerName).team = teamID;

	console.log("[updateTeamStatus] players = ", players);
	console.log("[updateTeamStatus] team = ", teams);

  	// update the team status
  	for (let i = 0; i < 3; i++) {
		if (i < teams.A.length)
			document.getElementById("Ateam" + (i+1)).innerHTML = teams.A[i];
		else
			document.getElementById("Ateam" + (i+1)).innerHTML = "";

		if (i < teams.B.length)
			document.getElementById("Bteam" + (i+1)).innerHTML = teams.B[i];
		else
			document.getElementById("Bteam" + (i+1)).innerHTML = "";
  	}
}

class Game extends React.Component {
  constructor(props) {
    super(props);
    // this.state = {...props};
    let url = window.location.href;
    let url_params = url.split("/");
    let roomID = url_params[url_params.length - 1];

    // check roomID
    if (roomID !== "" && Number.isInteger(parseInt(roomID))) {
      myroom = parseInt(roomID);
      props.changeRoom(myroom);
    } else if (roomID === "") {
      alert("room ID should be an integer, instead of empty");
    } else {
      alert("room ID should be an integer" + { roomID });
    }


    // check user name
    if (props.name === "debo") {
      userName = prompt("Please enter your name");
      while (userName === "") {
        userName = prompt(
          "Please enter your name again, don't let it be empty"
        );
      }
    } else {
      userName = props.name;
    }

    // bind functions
    this.handleJoinClick = this.handleJoinClick.bind(this);
    this.startGame = this.startGame.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
	this.handleSendText = this.handleSendText.bind(this);

    // member variables
    this.state = {
      // question from database
      question: question,
      // timer usage only,
      completions: 0,
      // game logic
      step: -1,
    };
	// playbook index, default is audience (6)
	this.id = 6;
	this.playbook = null;

    // form team usage only
    players.set(userName, {});

    this.state.allVideos = [1, 1, 1, 1, 1, 1];
    this.state.generalVideoSwitch = this.generalVideoSwitch.bind(this);


    // this.state.video1 = 1;
    // this.switchVideo1 = this.switchVideo1.bind(this);
    // this.state.video0 = 1;
    // this.switchVideo0 = this.switchVideo0.bind(this);
  }

  pickQuestion() {
    axios.get("/api/getRandomWord").then((res) => {
      console.log(res);
      question = res.data.item;
      this.setState({
        question: question,
      });
      
      // send to remotes
      var message = {
        textroom: "question",
        room: myroom,
        question: question,
        team: players.get(userName).team,
      };
      this.sendData(message);
    });
  }

  componentDidMount() {
    this.GameServerRoomStart();
  }

  updateRole() {
    console.log("[Game] update role");
    let newStep = this.state.step + 1
    this.setState({
      step: newStep >= this.playbook.length ? -1 : newStep
    });
  }

  GameServerRoomStart() {
    function publishOwnFeed(useAudio) {
      // Publish our stream
      vroomHandle.createOffer({
        // media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true },	// Publishers are sendonly
        media: {
          audioRecv: false,
          videoRecv: true,
          audioSend: useAudio,
          videoSend: true,
          data: true,
        },
        success: function (jsep) {
          Janus.debug("Got publisher SDP!");
          Janus.debug(jsep);
          const publish = {
            request: "configure",
            audio: useAudio,
            video: true,
            data: true,
          };
          vroomHandle.send({ message: publish, jsep: jsep });
        },
        error: function (error) {
          Janus.error("WebRTC error:", error);
          if (useAudio) {
            publishOwnFeed(false);
          }
        },
      });
    }
    function newRemoteFeed(id, display, audio, video) {
      // A new feed has been published, create a new plugin handle and attach to it as a subscriber
      let remoteFeed = null;
      gestureGameroom.attach({
        plugin: "janus.plugin.videoroom",
        opaqueId: opaqueId,
        success: function (pluginHandle) {
          remoteFeed = pluginHandle;
          console.log(
            "Plugin attached! (" +
            remoteFeed.getPlugin() +
            ", id=" +
            remoteFeed.getId() +
            ")"
          );
          console.log("  -- This is a subscriber");
          // We wait for the plugin to send us an offer
          console.log("this is my room :" + myroom);
          let subscribe = {
            request: "join",
            room: myroom,
            ptype: "subscriber",
            feed: id,
            private_id: mypvtid,
          };
          remoteFeed.videoCodec = video;
          remoteFeed.send({ message: subscribe });
        },
        error: function (error) {
          Janus.error("  -- Error attaching plugin...", error);
        },
        onmessage: function (msg, jsep) {
          Janus.debug(" ::: Got a message (subscriber) :::", msg);
          let event = msg["videoroom"];
          console.log("Event: " + event);
          if (event) {
            if (event === "attached") {
              console.log(`subscriber created and attached!`);
              // Subscriber created and attached
              for (let i = 1; i < 6; i++) {
                if (!feeds[i]) {
                  feeds[i] = remoteFeed;
                  remoteFeed.rfindex = i;
                  break;
                }
              }
              remoteFeed.rfid = msg["id"];
              remoteFeed.rfdisplay = msg["display"];
              console.log(`attached`, remoteFeed);
              Janus.log(
                "Successfully attached to feed " +
                remoteFeed.rfid +
                " (" +
                remoteFeed.rfdisplay +
                ") in room " +
                msg["room"]
              );
              $("#remote" + remoteFeed.rfindex)
                .removeClass("hide")
                .html(remoteFeed.rfdisplay)
                .show();
            }
            console.log("all people here");
            console.log(feeds);
          }
          if (jsep) {
            Janus.debug("Handling SDP as well...", jsep);
            // Answer and attach
            remoteFeed.createAnswer({
              jsep: jsep,
              // Add data:true here if you want to subscribe to datachannels as well
              // (obviously only works if the publisher offered them in the first place)
              media: { audioSend: false, videoSend: false, data: true }, // We want recvonly audio/video
              success: function (jsep) {
                console.log("Got SDP!", jsep);
                let body = { request: "start", room: myroom };
                remoteFeed.send({ message: body, jsep: jsep });
              },
              error: function (error) {
                console.error("WebRTC error:", error);
              },
            });
          }
        },
        iceState: function (state) {
          Janus.log(
            "ICE state of this WebRTC PeerConnection (feed #" +
            remoteFeed.rfindex +
            ") changed to " +
            state
          );
        },
        webrtcState: function (on) {
          Janus.log(
            "Janus says this WebRTC PeerConnection (feed #" +
            remoteFeed.rfindex +
            ") is " +
            (on ? "up" : "down") +
            " now"
          );
        },
        onlocalstream: function (stream) {
          // The subscriber stream is recvonly, we don't expect anything here
          // console.log("I'm in onlocal stream")
        },
        onremotestream: function (stream) {
		  console.log("Remote feed #" + remoteFeed.rfindex + ", stream:", stream);

		  // form team usage
		  players.get(remoteFeed.rfdisplay).videoindex = remoteFeed.rfindex;
		  
          if ($("#remotevideo" + remoteFeed.rfindex).length === 0) {
            // No remote video yet
            // $('#videoremote'+remoteFeed.rfindex).children('img').remove();
            $("#videoremote" + remoteFeed.rfindex).append(
              '<video class="rounded centered" id="waitingvideo' +
              remoteFeed.rfindex +
              '" width="100%" height="100%" />'
            );
            $("#videoremote" + remoteFeed.rfindex).append(
              '<video class="rounded centered relative hide" id="remotevideo' +
              remoteFeed.rfindex +
              '" width="100%" height="100%" autoplay playsinline/>'
            );
            // Show the video, hide the spinner and show the resolution when we get a playing event
            $("#remotevideo" + remoteFeed.rfindex).bind("playing", function () {
              if (remoteFeed.spinner) remoteFeed.spinner.stop();
              remoteFeed.spinner = null;
              $("#waitingvideo" + remoteFeed.rfindex).remove();
              if (this.videoWidth)
                $("#remotevideo" + remoteFeed.rfindex)
                  .removeClass("hide")
                  .show();
              if (Janus.webRTCAdapter.browserDetails.browser === "firefox") {
                // Firefox Stable has a bug: width and height are not immediately available after a playing
                setTimeout(function () {
                  let width = $("#remotevideo" + remoteFeed.rfindex).get(0)
                    .videoWidth;
                  let height = $("#remotevideo" + remoteFeed.rfindex).get(0)
                    .videoHeight;
                  $("#curres" + remoteFeed.rfindex)
                    .removeClass("hide")
                    .text(width + "x" + height)
                    .show();
                }, 2000);
              }
            });
          }
          Janus.attachMediaStream(
            $("#remotevideo" + remoteFeed.rfindex).get(0),
            stream
          );
          let videoTracks = stream.getVideoTracks();

          if (!videoTracks || videoTracks.length === 0) {
            // No remote video
            $("#remotevideo" + remoteFeed.rfindex).hide();
            if (
              $("#videoremote" + remoteFeed.rfindex + " .no-video-container")
                .length === 0
            ) {
              // $('#videoremote'+remoteFeed.rfindex).append(
              //     '<img src="' + offline + '" id="img1" class="card-media-image" style="width:300px;height:250px"></img>');
            }
          } else {
            $(
              "#videoremote" + remoteFeed.rfindex + " .no-video-container"
            ).remove();
            $("#remotevideo" + remoteFeed.rfindex)
              .removeClass("hide")
              .show();
          }
        },
        ondataopen: function (data) {
          Janus.log("The DataChannel is available");
          console.log("[ondataopen] The DataChannel is available", data);
        },
        ondata: function (data) {
          Janus.debug("We got data from the DataChannel! ", data);
          console.log("[ondata] Attach ondata:", data);
          var json = JSON.parse(data);
          if (json["textroom"] === "jointeam") {
            updateTeamStatus(json["username"], json["team"]);
          } else if (json["textroom"] === "question"){
            if (json["team"] == players.get(userName).team)
              question = json["question"];
            else
              theirQuestion = json["question"];
          } else if (json["textroom"] === "startgame"){
            remoteStart = true;
            document.getElementById("start").click();
          } else if (json["textroom"] === "answercorret"){
            if ('scoreA' in json){
              scoreA += 1;
            } else if ('scoreB' in json){
              scoreB += 1;
            }
          }
        },
        oncleanup: function () {
          Janus.log(
            " ::: Got a cleanup notification (remote feed " + id + ") :::"
          );
          if (remoteFeed.spinner) remoteFeed.spinner.stop();
          $("#remotevideo" + remoteFeed.rfindex).remove();
          // $('#videoremote'+remoteFeed.rfindex).append('<img src="' + offline + '" id="img1" class="card-media-image" style="width:300px;height:250px"></img>');
        },
      });
    }

    Janus.init({
      debug: true,
      dependencies: Janus.UseDefaultDependencies(),
      callback: function () {
        gestureGameroom = new Janus({
          server: server,
          success: function () {
            gestureGameroom.attach({
              plugin: "janus.plugin.videoroom",
              success: function (pluginHandle) {
                vroomHandle = pluginHandle;
                Janus.log(
                  "Plugin attached! (" +
                  vroomHandle.getPlugin() +
                  ", id=" +
                  vroomHandle.getId() +
                  ")"
                );
                Janus.log("  -- This is a publisher/manager");
                let reg = userName;
                console.log("display name:" + reg + ",type:" + typeof reg);
                const createRegister = {
                  request: "create",
                  room: myroom,
                  permanent: false,
                  is_private: false,
                  publishers: 6,
                };
                vroomHandle.send({ message: createRegister });
                const joinRegister = {
                  request: "join",
                  room: myroom,
                  ptype: "publisher",
                  display: userName,
                };

                vroomHandle.send({ message: joinRegister });
              },
              error: function (err) {
                Janus.error("  -- Error attaching plugin...", err);
              },
              consentDialog: function (on) {
                Janus.debug(
                  "Consent dialog should be " + (on ? "on" : "off") + " now"
                );
              },
              mediaState: function (medium, on) {
                Janus.log(
                  "Janus " +
                  (on ? "started" : "stopped") +
                  " receiving our " +
                  medium
                );
              },
              webrtcState: function (on) {
                Janus.log(
                  "Janus says our WebRTC PeerConnection is " +
                  (on ? "up" : "down") +
                  " now"
                );
              },
              onmessage: function (msg, jsep) {
                Janus.debug(" ::: Got a message (publisher) :::");
                Janus.debug(msg);
                let event = msg["videoroom"];
                Janus.debug("Event: " + event);
                if (event != undefined && event != null) {
                  if (event === "joined") {
                    // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                    myid = msg["id"];
                    mypvtid = msg["private_id"];
                    console.log(
                      "Successfully joined room " +
                      msg["room"] +
                      " with ID " +
                      myid
                    );
                    publishOwnFeed(true);

					// form team usage
                    players.get(userName).id = myid;

                    // Any new feed to attach to already joined members
                    if (
                      msg["publishers"] !== undefined &&
                      msg["publishers"] !== null
                    ) {
                      let list = msg["publishers"];
                      console.log("Got a list of available publishers/feeds:");
                      console.log(list);
                      for (let f in list) {
                        let id = list[f]["id"];
                        let display = list[f]["display"];
                        let audio = list[f]["audio_codec"];
                        let video = list[f]["video_codec"];
                        console.log(
                          "  >> [" +
                          id +
                          "] " +
                          display +
                          " (audio: " +
                          audio +
                          ", video: " +
                          video +
                          ")"
                        );
                        console.log("somebody in the same room : " + { id });

                        // form team usage
                        players.set(display, { id: id });

                        newRemoteFeed(id, display, audio, video);
                      }
                    }
                    console.log(
                      "[onmessage] get already joined event, players ",
                      players
                    );
                  } else if (event === "destroyed") {
                    // The room has been destroyed
                    Janus.warn("The room has been destroyed!");
                    console.error("The room has been destroyed");
                  } else if (event === "event") {
                    // Any new feed to attach to new joined members

                    if (!vroomHandle) {
                      listReq = { request: "listparticipants", room: myroom };
                      res = vroomHandle.send({ message: listReq });
                    }

                    if (
                      msg["publishers"] !== undefined &&
                      msg["publishers"] !== null
                    ) {
                      console.log("new publishers!");
                      let list = msg["publishers"];
                      for (let f in list) {
                        let id = list[f]["id"];
                        let display = list[f]["display"];
                        let audio = list[f]["audio_codec"];
                        let video = list[f]["video_codec"];
                        console.log(
                          "  >> [" +
                          id +
                          "] " +
                          display +
                          " (audio: " +
                          audio +
                          ", video: " +
                          video +
                          ")"
                        );

                        // form team usage
                        players.set(display, { id: id });

                        newRemoteFeed(id, display, audio, video);
                      }
                      console.log(
                        "[onmessage] get new joined event, players ",
                        players
                      );

                      // this.updatePlayers();
                      // this.state.changePlayers();
                    } else if (
                      msg["leaving"] !== undefined &&
                      msg["leaving"] !== null
                    ) {
                      var leaving = msg["leaving"];
                      Janus.log("Publisher left: " + leaving);
                      var remoteFeed = null;
                      for (var i = 1; i < 6; i++) {
                        console.log("letme see the feeds");
                        console.log(feeds);
                        if (feeds[i] && feeds[i].rfid == leaving) {
                          remoteFeed = feeds[i];
                          break;
                        }
                      }
                      if (remoteFeed != null) {
                        Janus.debug(
                          "Feed " +
                          remoteFeed.rfid +
                          " (" +
                          remoteFeed.rfdisplay +
                          ") has left the room, detaching"
                        );
                        $("#remote" + remoteFeed.rfindex)
                          .empty()
                          .hide();
                        $("#videoremote" + remoteFeed.rfindex).empty();
                        feeds[remoteFeed.rfindex] = null;
                        remoteFeed.detach();
                      }
                      console.log("all people here");
                      console.log(feeds);
                    } else if (
                      msg["unpublished"] !== undefined &&
                      msg["unpublished"] !== null
                    ) {
                      // One of the publishers has unpublished?
                      if (msg["unpublished"] === "ok") {
                        vroomHandle.hangup();
                        return;
                      }
                    } else if (
                      msg["error"] !== undefined &&
                      msg["error"] !== null
                    ) {
                      if (msg["error_code"] === 426) {
                        // This is a "no such room" error: give a more meaningful description
                      } else {
                        alert(msg["error"]);
                      }
                    }

                  }
                }
                if (jsep !== undefined && jsep !== null) {
                  Janus.debug("Got room event. Handling SDP as well...");
                  Janus.debug(jsep);
                  vroomHandle.handleRemoteJsep({ jsep: jsep });
                  // Check if any of the media we wanted to publish has
                  // been rejected (e.g., wrong or unsupported codec)
                  let audio = msg["audio_codec"];
                  if (
                    mystream &&
                    mystream.getAudioTracks() &&
                    mystream.getAudioTracks().length > 0 &&
                    !audio
                  ) {
                    // Audio has been rejected
                    alert(
                      "Our audio stream has been rejected, viewers won't hear us"
                    );
                  }
                  let video = msg["video_codec"];
                  if (
                    mystream &&
                    mystream.getVideoTracks() &&
                    mystream.getVideoTracks().length > 0 &&
                    !video
                  ) {
                    // Video has been rejected
                    alert(
                      "Our video stream has been rejected, viewers won't see us"
                    );
                    // Hide the webcam video
                    $("#myvideo").hide();
                    $("#videolocal").append(
                      '<div class="no-video-container">' +
                      '<i class="fa fa-video-camera fa-5 no-video-icon" style="height: 100%;"></i>' +
                      '<span class="no-video-text" style="font-size: 16px;">Video rejected, no webcam</span>' +
                      "</div>"
                    );
                  }
                }
              },
              onlocalstream: function (stream) {
                // top priority
                console.log(" ::: Got a local stream :::", stream);
                mystream = stream;
				console.log("my index in room : " + myIndexInRoom);
				
				// form team usage
				players.get(userName).videoindex = myIndexInRoom;

                const video = document.querySelector("video#localvideo");

                // $('#videoremote'+myIndexInRoom).children('img').remove();
                // $('#videoremote'+myIndexInRoom).append('<video class="rounded centered" id="waitingvideo' + myIndexInRoom + '" width="100%" height="100%" />');
                $("#videoremote" + myIndexInRoom).append(
                  '<video class="rounded centered relative hide" id="remotevideo' +
                  myIndexInRoom +
                  '" width="100%" height="100%" autoplay playsinline/>'
                );
                Janus.attachMediaStream(
                  $("#remotevideo" + myIndexInRoom).get(0),
                  stream
                );
                document.querySelector(
                  "#remotevideo" + myIndexInRoom
                ).muted = true;
                // const video = document.querySelector('videoremote'+myIndexInRoom);
                const videoTracks = stream.getVideoTracks();
                console.log(`Using video device: ${videoTracks[0].label}`);
                console.log("videoremote" + myIndexInRoom);
                console.log(video);
                video.srcObject = stream;
                document.querySelector("video#localvideo").muted = true;
                document.querySelector("video#localvideo").style.visibility =
                  "hidden";

              },
              onremotestream: function () {
                // second priority
              },
              ondataopen: function (data) {
                Janus.log("The DataChannel is available");
                console.log("[ondataopen] The DataChannel is available", data);
              },
              ondata: function (data) {
                Janus.debug("We got data from the DataChannel! ", data);
                console.log("[ondata] Attach ondata:", data);
                var json = JSON.parse(data);
                if (json["textroom"] === "jointeam") {
                  updateTeamStatus(json["username"], json["team"]);
                } else if (json["textroom"] === "question"){
                  if (json["team"] == players.get(userName).team)
                    question = json["question"];
                  else
                    theirQuestion = json["question"];
                } else if (json["textroom"] === "startgame"){
                  remoteStart = true;
                  document.getElementById("start").click();
                } else if (json["textroom"] === "answercorret"){
                  if ('scoreA' in json){
                    scoreA += 1;
                  } else if ('scoreB' in json){
                    scoreB += 1;
                  }
				}
				
              },
              oncleanup: function () {
                Janus.log(
                  " ::: Got a cleanup notification: we are unpublished now :::"
                );
                mystream = null;
              },
              detached: function () {},
            });
          },
          error: function (err) {
            // todo
            alert(err);
          },
          destroyed: function () {
            // todo
            console.log();
            console.log("destroyed");
            window.location.reload();
          },
        });
      },
    });
  }

  // Renderer callback with condition
  renderer = ({ seconds, completed }) => {
    if (completed) {
      // Render a completed state
      this.updateRole();
      return <span> You are good to go! </span>
    } else {
      // Render a countdown
      return <span>{seconds} seconds</span>
    }
  };

  Timer() {
    return (
      <div>
        <Countdown key={this.state.completions} date={Date.now() + frequency} renderer={this.renderer} onComplete={this.onComplete}/>,
      </div>
    );
  }

  handleJoinClick = (e) => {
    let teamId = e.target.id;
    updateTeamStatus(userName, teamId);

    // send to remotes
    var message = {
      textroom: "jointeam",
      room: myroom,
      username: userName,
      team: teamId,
    };
    this.sendData(message);
  };

  sendData = (message) => {
    // Note: messages are always acknowledged by default. This means that you'll
    // always receive a confirmation back that the message has been received by the
    // server and forwarded to the recipients. If you do not want this to happen,
    // just add an ack:false property to the message above, and server won't send
    // you a response (meaning you just have to hope it succeeded).
    vroomHandle.data({
      text: JSON.stringify(message),
      error: function (reason) {
        alert(reason);
      },
      success: function () {
        console.log("[sendData] success");
      },
    });
  };

  teamtemplate2() {
    return (
      <Container>
        <Row>
          {arr1.map((value, index) => {
            return (
              <Col>
                <div id={"videoremote" + value} className="container">
                </div>
                <h3 id={"callername" + value}> </h3>
              </Col>
            );
          })}
        </Row>
        <Row>
          {arr2.map((value, index) => {
            return (
              <Col>
                <div id={"videoremote" + value} className="container">
                </div>
                <h3 id={"callername" + value}> </h3>
              </Col>
            );
          })}
        </Row>
        <Row>
          {arr3.map((value, index) => {
            return (
              <Col>
                <div id={"videoremote" + value} className="container">
                </div>
                <h3 id={"callername" + value}> </h3>
              </Col>
            );
          })}
        </Row>
		<div id="chatBox" className="scrollbox">
			As you can see, once there's enough text in this box, the box will grow scroll bars... 
			that's why we call it a scroll box! You could also place an image into the scroll box.
		</div>
		<input id="sendMessage" className="stylized input" type="text" onChange={this.updateInnerHTML.bind(this)} placeholder="send some message"/>
		<button id="sendBtn" onClick={this.handleSendText} className="button btn btn-link">
        	{" "}send{" "}
        </button>{" "}
      </Container>

    );
  }

  /*
  Get the play's role on differect steps.
  The role would be "READ_TOPIC" or "ANSWER" or "PLAY" or "AUDIENCE" or "WAIT" or "OBSERVE".
  */
 getRole = (memberCnt, order, step) => {
   let roles = null;
   switch(memberCnt) {
     case 1:
       roles = [["READ_TOPIC", "ANSWER"]];
       break;
     case 2:
       roles = [
          ["READ_TOPIC","PLAY",   "AUDIENCE"],
          ["WAIT",      "OBSERVE","ANSWER"]
       ];
       break;
     case 3:
       roles = [
         ["READ_TOPIC", "PLAY",    "AUDIENCE","AUDIENCE"],
         ["WAIT",       "OBSERVE", "PLAY",    "AUDIENCE"],
         ["WAIT",       "WAIT",    "OBSERVE", "ANSWER"]
       ];
       break; 
     default:
       break;
   }
   console.log("[getRole] roles = ", roles);
   return roles == null ? "AUDIENCE" : roles[order][step];
 }

  /*
  Generate playbook based on the player's team and his/her order.
  The playbook's data structure would be like ["READ_TOPIC",  "PLAY", "AUDIENCE", "AUDIENCE", "AUDIENCE",   "AUDIENCE", "AUDIENCE", "AUDIENCE"]
  */
  generatePlaybook = () =>{
    let teamASteps = teams.A.length > 0 ? teams.A.length + 1 : 0;
    let teamBSteps = teams.B.length > 0 ? teams.B.length + 1 : 0;

    this.playbook = Array.apply(null, new Array(teamASteps+teamBSteps));
    this.playbook = this.playbook.map((element, index) => "AUDIENCE");

    let playerTeam = players.get(userName).team;
    if (playerTeam == 'A') {
      for (let i = 0; i < teamASteps; i++){
        this.playbook[i] = this.getRole(teams.A.length, teams.A.indexOf(userName), i);
      }
    } else if (playerTeam == 'B') {
      for (let i = 0; i < teamBSteps; i++){
        this.playbook[teamASteps + i] = this.getRole(teams.B.length, teams.B.indexOf(userName), i);
      }
    }
    console.log('[generatePlaybook] playbook = ', this.playbook);
  }

  startGame = () => {
    if(!remoteStart){
      // notify remote players
      var message = {
        textroom: "startgame",
        room: myroom,
      };
      this.sendData(message);
    }

    this.generatePlaybook();

    if(this.playbook.includes("READ_TOPIC"))
      this.pickQuestion();

    // update state
    this.setState({
      step: 0
    });
  };

  answerRenderer = ({ seconds, completed }) => {
    if (completed) {
      // Render a completed state
      return <span>Time's up</span>
    } else {
      // Render a countdown
      return <span>{seconds} seconds</span>;
    }
  };


  generalVideoSwitch = (e) => {
    let id;
    if (!Number.isInteger(e)) {
      id = e.target.id;
    } else {
      id = e;
      alert("I got you");
      return;
    }
    console.log(e);
    if (document.querySelector("video#remotevideo" + id) == null) {
      alert("No such video " + id + " item yet");
      return;
    }
    if (id == 0) {
      if (this.state.allVideos[id] == 1) {
        document.querySelector("video#remotevideo" + id).muted = true;
        document.querySelector("video#remotevideo" + id).style.visibility =
          "hidden";
        document.querySelector("video#remotevideo" + id).style.width = "5%";
        document.querySelector("video#remotevideo" + id).style.height = "5%";

        this.state.allVideos[id] = 0;
      } else {
        document.querySelector("video#remotevideo" + id).muted = true;
        document.querySelector("video#remotevideo" + id).style.visibility =
          "visible";
        document.querySelector("video#remotevideo" + id).style.width = "100%";
        document.querySelector("video#remotevideo" + id).style.height = "100%";
        this.state.allVideos[id] = 1;
      }
      return;
    }


    if (this.state.allVideos[id] == 1) {
      document.querySelector("video#remotevideo" + id).muted = true;
      document.querySelector("video#remotevideo" + id).style.visibility =
        "hidden";
      document.querySelector("video#remotevideo" + id).style.width = "5%";
      document.querySelector("video#remotevideo" + id).style.height = "5%";
      this.state.allVideos[id] = 0;
    } else {
      document.querySelector("video#remotevideo" + id).muted = false;
      document.querySelector("video#remotevideo" + id).style.visibility =
        "visible";
      document.querySelector("video#remotevideo" + id).style.width = "100%";
      document.querySelector("video#remotevideo" + id).style.height = "100%";
      this.state.allVideos[id] = 1;
    }
  };

  answerTimer() {
    return (
      <div>
        <Countdown date={Date.now() + 3000} renderer={this.answerRenderer} />,
      </div>
    );
  }

  handleSubmit(event) {
    let word = question;
    let correct = question === document.getElementById("answer").value;
    axios
      .put(
        `/api/updateCorrectRate?word=${word}&correct=${correct}`
      )
      .then((state) => {
        console.log(state);
      });
    if (correct) {
      if (players.get(userName).team == 'A'){
        scoreA += 1;

        // send to remotes
        var message = {
          textroom: "answercorret",
          room: myroom,
          scoreA: scoreA,
        };
        this.sendData(message);

      } else {
        scoreB += 1;

        // send to remotes
        var message = {
          textroom: "answercorret",
          room: myroom,
          scoreB: scoreB,
        };
        this.sendData(message);        
      }

      alert("Good job! You save your team");
    } else {
      alert("BOOM!!! Wrong answer");
    }
  }

  handleSendText(event){
	console.log('text sent');
	let a = document.getElementById("chatBox")
	let b = document.getElementById("sendMessage")
	document.getElementById('chatBox').innerHTML = 
		document.getElementById('chatBox').innerHTML +'<br>'+ userName + ":" + sendMessage;
	sendMessage = "";
  }

  updateInnerHTML(event){
	  sendMessage = event.target.value;
  }

  onComplete = () => {
    this.setState({
      completions: this.state.completions + 1
    },
      () => console.log('completions', this.state.completions)
    )
  }

  _handleKeyUp =(e) =>{
      if(e.key==='Enter' || e.keyCode === 13){
          document.getElementById("submit").click();
      }
  }

/*
Check the current role is from team A or Team B
Use getRole to check which person is the wanted role
*/
  getVideoindexByRole = (step, role) =>{
    let teamASteps = teams.A.length > 0 ? teams.A.length + 1 : 0;
    
    let name = null;
    // the current player is from team A
    if (step < teamASteps)  {
      for(let i = 0; i < teams.A.length; i++){
        let curRole = this.getRole(teams.A.length, i, step);

        if (curRole == role){
          name = teams.A[i];
          break;
        }
      }
    // the current player is from team B
    } else {
      for(let i = 0; i < teams.B.length; i++){
        let curRole = this.getRole(teams.B.length, i, step-teamASteps);

        if (curRole == role){
          name = teams.B[i];
          break;
        }
      }
    }


    console.log("[getVideoindexByRole] name = ", name);
    return name == null ? null : players.get(name).videoindex;
  }

  suppresAllVideo = (isVisible) =>{
    for(let i=0;i<6; i++){
        if(!document.querySelector('video#remotevideo'+i)) {continue;}
        document.querySelector('video#remotevideo'+i).muted= !isVisible;
        document.querySelector('video#remotevideo'+i).style.visibility= isVisible ? "visible":"hidden";
        document.querySelector('video#remotevideo'+i).style.width= isVisible ? "100%":"5%";
        document.querySelector('video#remotevideo'+i).style.height= isVisible ? "100%":"5%";
    }
  }

  playerObserverVideo = (step, id) =>{

    let playerIdx = this.getVideoindexByRole(step, "PLAY");
    let observerIdx = this.getVideoindexByRole(step, "OBSERVE");
    let readerIdx = this.getVideoindexByRole(step, "READ_TOPIC");
    let answererIdx = this.getVideoindexByRole(step, "ANSWER");

	for(let i=0;i<6; i++){
		if(!document.querySelector('video#remotevideo'+i)){ continue;}
		if(i == playerIdx || i == observerIdx || i == readerIdx || i == answererIdx){
			document.querySelector('video#remotevideo'+i).muted= false;
			document.querySelector('video#remotevideo'+i).style.visibility= "visible";
			document.querySelector('video#remotevideo'+i).style.width= "100%";
			document.querySelector('video#remotevideo'+i).style.height= "100%";
        }else{
			document.querySelector('video#remotevideo'+i).muted= true;
			document.querySelector('video#remotevideo'+i).style.visibility= "hidden";
			document.querySelector('video#remotevideo'+i).style.width= "5%";
			document.querySelector('video#remotevideo'+i).style.height= "5%"
        }
    }
	if(document.querySelector('video#remotevideo'+playerIdx)){
		document.querySelector('video#remotevideo'+playerIdx).muted= true;
    }
  }



  allcase = () =>{
    let currentStatus = this.state.step < 0 ? null : this.playbook[this.state.step];

    // game setting
    if (this.state.step == -1) {
        // show all videos
        this.suppresAllVideo(true);
        return(<div>  </div>);
    // wait
    } else if (currentStatus == "WAIT") {
        // hide all videos
        this.suppresAllVideo(false);
        return (
          <div className="App">
            <header className="jumbotron p2 App-header">
              <h1> Wait for {this.playbook.indexOf("OBSERVE") - this.state.step} people</h1>
              <p>Current Score: {scoreA}: {scoreB}</p>
              {this.Timer()}
            </header>
          </div>
        );
    // get topic round
    } else if (currentStatus == "READ_TOPIC") {
        // hide all videos
        this.suppresAllVideo(false);
        return (
          <div className="App">
            <header className="App-header p2">
              <h1>Please perform this topic only by body language: <b class="topic"> {this.state.question}</b> </h1>
              <p>Current Score: {scoreA}: {scoreB}</p>
              {this.Timer()}
            </header>
          </div>
        );
    // playing
    } else if (currentStatus == "PLAY") {

        this.playerObserverVideo(this.state.step, this.id)

        // be the publisher
        return (
          <div className="App">
            <header className="jumbotron App-header p2">
              <h1> It's time for you to perform.</h1>
              <p>Current Score: {scoreA}: {scoreB}</p>
              {this.Timer()}
            </header>
            {/* <h1>player</h1> */}
            {/* {this.Playing()} */}            
          </div>
        );
    // observing
    } else if (currentStatus === "OBSERVE") {

        this.playerObserverVideo(this.state.step, this.id);

        // be the subscriber
        return (
          <div className="App">
            <header className="jumbotron App-header p2">
            <h1> It's time for you to observe.</h1>
              <p>Current Score: {scoreA}: {scoreB}</p>
              {this.Timer()}
            </header>
            {/* <h1> observer</h1> */}
            {/* {this.Timer()} */}
            {/* <h3> {this.props.round} </h3>
            <h3> {this.props.question} </h3> */}
          </div>
        );
  
    // answering
    } else if (currentStatus === "ANSWER"){
         // hide all video
         this.suppresAllVideo(false);
         return (
           <div className="App">
             {/* {this.answerTimer()} */}
             <header className="jumbotron App-header p2">
               Do you know what the answer is ;)
               <p>Current Score: {scoreA}: {scoreB}</p>
               {this.Timer()}
             </header>
             <ul>
               <li>
                 <label for="answer"> Answer: </label>
               </li>
               <li>
                 <input type="text" id="answer" onKeyPress={this._handleKeyUp.bind(this)} placeholder="Type your Answer" />
               </li>
               <li>
                 <button id="submit" onClick={this.handleSubmit} className="button btn btn-link p2">
                     Submit
                 </button>
 
               </li>
             </ul>
           </div>
         );
    // audience
    } else {
        this.playerObserverVideo(this.state.step, this.id);
        var showTopic = this.state.step > 3 ? players.get(userName).team == 'A' : players.get(userName).team == 'B';
        return (
          <div className="App">
            <header className="jumbotron App-header p2">
              <h1>Audience {showTopic ? "Their Topic: "+theirQuestion: ""}</h1>
              <p>Current Score: {scoreA}: {scoreB}</p>
              {this.Timer()}
            </header>
          </div>
        );
    }
  }

  gameSetting(){
    if (this.state.step >= 0)
      return (<div></div>);
    else {
      return (
        <div className="App-header" id='header'>
          <p className="p2"> Online Guessture Game room, Name = {userName} , room ={myroom}</p>
          <Container class="teams" className="p2">
              <Row>
              <Col>
                  {" "}
                  <h1 className="p2"> Team A</h1>{" "}
              </Col>{" "}
              <Col>
                  {" "}
                  <h1 className="p2"> Team B</h1>
              </Col>
              </Row>
              <Row>
              <Col>
                  <button id="A" onClick={this.handleJoinClick} className="button btn btn-link p2">
                  {" "}
                  Join{" "}
                  </button>{" "}
              </Col>
              <Col>
                  <button id="B" onClick={this.handleJoinClick} className="button btn btn-link p2">
                  {" "}
                  Join{" "}
                  </button>{" "}
              </Col>
              </Row>
              <Row>
              <Col>
                  <p id="Ateam1">{teams.A.length > 0 ? teams.A[0]: ""}</p>
              </Col>
              <Col>
                  <p id="Bteam1">{teams.B.length > 0 ? teams.B[0]: ""}</p>
              </Col>
              </Row>
              <Row>
              <Col>
                  <p id="Ateam2">{teams.A.length > 1 ? teams.A[1]: ""}</p>
              </Col>
              <Col>
                  <p id="Bteam2">{teams.B.length > 1 ? teams.B[1]: ""}</p>
              </Col>
              </Row>
              <Row>
              <Col>
                  <p id="Ateam3">{teams.A.length > 2 ? teams.A[2]: ""}</p>
              </Col>
              <Col>
                  <p id="Bteam3">{teams.B.length > 2 ? teams.B[2]: ""}</p>
              </Col>
              </Row>

              <Row>
              <Col>
                  <button id="start" onClick={this.startGame} className="button button3 btn btn-link p2">
                  {" "}
                  Start{" "}
                  </button>{" "}
              </Col>
              </Row>            
          </Container>
        </div>

      );
    }
  }

  render() {
    return (
    <div className="App">
        {this.gameSetting()}
        <div>
            <p width="100%" height="100%">
                {this.teamtemplate2()}
                <this.allcase/>
            </p>
        </div>
        <div id="myvideo" className="container shorter">
            <video
            id="localvideo"
            className="rounded centered"
            width="5%"
            height="5%"
            autoPlay
            playsInline
            muted="muted"
            ></video>
        </div>
    </div>
    );

  }
}

export default Game;
