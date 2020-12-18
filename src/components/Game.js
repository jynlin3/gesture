import React, { useState } from "react";
// import ReactDOM from "react-dom";
import Janus from "./Janus";
// import { withRouter } from "react-router-dom";
// import offline from "../images/offline.jpg";
import $ from "jquery";
import { Container, Row, Col, ThemeProvider } from "react-bootstrap";
// import { findAllByTestId } from "@testing-library/react";
import Countdown from "react-countdown";
// import { connect } from "react-redux";
// import { Word } from "./Word";
import axios from "axios";

let server;
/**
 * have a set of ids arrays
 * randomly divide into two parts
 *
 * take one as the
 * 1st 30 sec to look the questions
 * 1st->2nd : show gussture to the next one. 30 sec to perform
 * 2nd->3rd : show guessture to the next one
 * ...
 * last: 30 sec to answer
 *
 * input has the question
 * output: right or wrong to Jyn
 *
 */

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
let myusername = null;
let feeds = [];
let myid = null;
let mystream = null;
let userIds = [1, 2, 3, 4, 5, 6];
let team1 = [];
let team2 = [];
let questions = ["Birthday", "JavaScript", "Sucks"];
// let team1Competing;
// let w;
// question from datachannel
let question = "";
let theirQuestion = "";

let GlobalPeopleID = [];
let myIndexInRoom = 0;
let userName = "";
let teamA = [0, 2, 4];
let teamB = [1, 3, 5];
let arr1 = [0, 1];
let arr2 = [2, 3];
let arr3 = [4, 5];
let res = null;
let listReq = null;
let frequency = 5000;
let scoreA = 0;
let scoreB = 0;

// only form team usage, date structure would be {username => {id: id, team: team}}
let players = new Map();

// only start game usage
let remoteStart = false; 

// // before loading
// window.onload = function () {
//   let q = document.getElementById("question");
//   if (q !== null && q !== "undefined") {
//     let idx = Math.floor(Math.random() * questions.length);
//     q.innerHTML = questions[idx];
//     question = questions[idx];
//   }
//   scores.values = document.getElementById("scores");
//   if (scores !== null && scores !== "undefined") {
//     scores.innerHTML = this.scores;
//   }
// };

function updateTeamStatus() {
  // clear the team status
  for (let i = 1; i < 4; i++) {
    document.getElementById("Ateam" + i).innerHTML = "";
    document.getElementById("Bteam" + i).innerHTML = "";
  }

  // create a variable to count # players in team A
  // create a variable to count # players in team B
  let playerCntA = 0;
  let playerCntB = 0;

  // itreate over the players
  for (const [key, value] of players.entries()) {
    // console.log(key, value);
    // let team = value.team;
    if (value.team === "A") {
      playerCntA += 1;
      document.getElementById("Ateam" + playerCntA).innerHTML = key;
    } else if (value.team === "B") {
      playerCntB += 1;
      document.getElementById("Bteam" + playerCntB).innerHTML = key;
    }
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
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    // this.askServer = this.askServer.bind(this);
    // console.log("My name is :" + this.props.name)
    // console.log(this.state)
    // this.pickQuestion();
    // w = new Set();
    // team1Competing = true;

    // member variables
    this.state = {
      // player: {},
      // observer: {},

      // question from database
      question: question,
      GlobalPeopleID: [],
      // round: 1,
      // userIds: [1, 2, 3, 4, 5, 6],
      score: [0, 0],
      // totalGameRound: 1,
      // isCorrect: false,

      // timer usage only,
      completions: 0,
      // game logic
      step: -1,
      answer: null
    };
    // this.splitTeams(userIds);
    this.scores = [0, 0];
    this.id = 1;

    // this.state.id = 3;

    // this.startGame = this.startGame.bind(this);

    // only form team usage
    players.set(userName, {});

    this.state.startGame = 0;
    this.state.allVideos = [1, 1, 1, 1, 1, 1];
    this.state.generalVideoSwitch = this.generalVideoSwitch.bind(this);


    // this.state.video1 = 1;
    // this.switchVideo1 = this.switchVideo1.bind(this);
    // this.state.video0 = 1;
    // this.switchVideo0 = this.switchVideo0.bind(this);
    this.playbook = null;

  }

  pickQuestion() {
    axios.get("https://www.seattle8520.xyz/api/getRandomWord").then((res) => {
      console.log(res);
      question = res.data.item;
      this.setState({
        // the generated word is stored in `res.data.item`
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

  // addWaiting(id) {
  //   this.setState((waiting) => ({
  //     waiting: new Set(waiting).add(id),
  //   }));
  // }

  // removeWaiting(id) {
  //   this.setState(({ waiting }) => {
  //     const newWait = new Set(waiting);
  //     newWait.delete(id);
  //     return {
  //       waiting: newWait,
  //     };
  //   });
  // }

  componentDidMount() {
    this.GameServerRoomStart();
    // this.interval = setInterval(
    //   () => this.setState({ time: Date.now() }),
    //   frequency + 500
    // );
  }

  componentWillUnmount() {
    // clearInterval(this.interval);
  }

  // splitTeams(userIds) {
  //   let numMembers = userIds.length / 2;
  //   team1 = userIds.slice(0, numMembers);
  //   team2 = userIds.slice(numMembers);
  //   if (team1Competing) {
  //     for (let i = 1; i < team1.length; ++i) {
  //       this.state.waiting.add(team1[i]);
  //       // this.addWaiting(team1[i]);
  //     }
  //   } else {
  //     for (let i = 1; i < team2.length; ++i) {
  //       this.state.waiting.add(team2[i]);
  //       // this.addWaiting(team2[i]);
  //     }
  //   }
  // }

  updateRole() {
    console.log("[Game] update role");
    let newStep = this.state.step + 1
    this.setState({
      step: newStep > 7 ? -1 : newStep
    });
    // let numMembers = userIds.length / 2;
    // // prevent starting round
    // const newWait = new Set(this.state.waiting);
    // if (this.state.round === 2){
    //     this.deleteObj(this.state.observer);
    //     this.deleteObj(this.state.player);
    //     return;
    // }
    // if (this.state.waiting.size !== numMembers - 1) {
    //   let newIndex = this.state.observer.index;
    //   let newPlayer = userIds[newIndex];
    //   let newObserIdx = newIndex + 1;
    //   //   console.log();
    //   this.setState({
    //     player: {
    //       id: newPlayer,
    //       index: newIndex,
    //     },
    //     observer: {
    //       id: userIds[newObserIdx],
    //       index: newObserIdx,
    //     },
    //     waiting: new Set(),
    //     round: this.state.round + 1,
    //   });
    // } else {
    //   // first round after waiting, update the player and observer
    //   if (team1Competing) {
    //     console.log("first round");
    //     newWait.delete(team1[1]);
    //     this.setState({
    //       player: {
    //         id: team1[0],
    //         index: 0,
    //       },
    //       observer: {
    //         id: team1[1],
    //         index: 1,
    //       },
    //       waiting: newWait,
    //       round: this.state.round + 1,
    //     });
    //   } else {
    //     newWait.delete(team2[1]);
    //     this.setState({
    //       player: {
    //         id: team1[0],
    //         index: 0,
    //       },
    //       observer: {
    //         id: team1[1],
    //         index: 1,
    //       },
    //       waiting: newWait,
    //       round: this.state.round + 1,
    //     });
    //   }
    // }
  }

  updatePlayers() {
    this.state.changePlayers(this.state.GlobalPeopleID);
    while (this.state.players.length < 6) {
      this.state.players.push({ id: null, id: "uknown" });
    }
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
            // console.log(GlobalPeopleID)
            console.log(feeds);
            // console.log(this.state)
            // this.state.changePlayers();
            // console.log(this.state);
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
          console.log(
            "Remote feed #" + remoteFeed.rfindex + ", stream:",
            stream
          );
          let addButtons = false;
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
          console.log("[Jyn] The DataChannel is available", data);
        },
        ondata: function (data) {
          Janus.debug("We got data from the DataChannel! ", data);
          console.log("[Jyn] Attach ondata:", data);
          var json = JSON.parse(data);
          if (json["textroom"] === "jointeam") {
            players.get(json["username"]).team = json["team"];
            updateTeamStatus();
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
                    GlobalPeopleID.unshift({ id: myid, name: userName });
                    publishOwnFeed(true);

                    // only form team usage
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
                        GlobalPeopleID.unshift({ id: id, name: display });

                        // only form team usage
                        players.set(display, { id: id });

                        newRemoteFeed(id, display, audio, video);
                      }
                    }
                    console.log(
                      "[Jyn] get already joined event, players ",
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
                        GlobalPeopleID.push({ id: id, name: display });

                        // only form team usage
                        players.set(display, { id: id });

                        newRemoteFeed(id, display, audio, video);
                      }
                      console.log(
                        "[Jyn] get new joined event, players ",
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
                      // console.log(GlobalPeopleID);
                      console.log(feeds);

                      let tmp = 0;
                      for (let i = 0; i < GlobalPeopleID.length; i++) {
                        tmp = 0;
                        for (let f in feeds) {
                          if (
                            (f != null || f != undefined) &&
                            f.rfid == GlobalPeopleID[i].id
                          ) {
                            tmp += 1;
                            break;
                          }
                        }
                        if (tmp == 0 && GlobalPeopleID[i].id != myid) {
                          GlobalPeopleID.splice(i, 1);
                        }
                      }
                      console.log("all people here");
                      console.log(GlobalPeopleID);
                      console.log(feeds);

                      // this.state.changePlayers();
                      // console.log(this.state);
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
                console.log("[Jyn] The DataChannel is available", data);
              },
              ondata: function (data) {
                Janus.debug("We got data from the DataChannel! ", data);
                console.log("[Jyn] Attach ondata:", data);
                var json = JSON.parse(data);
                if (json["textroom"] === "jointeam") {
                  players.get(json["username"]).team = json["team"];
                  updateTeamStatus();
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

  // conditional rendering`
  // Question() {
  //   return (
  //     <div className="App">
        
  //       {JSON.stringify(this.state.question)}
  //       {this.Timer()}
        
  //     </div>
  //   );
  // }

  Competing() {
    return (
      <div className="App">
        {this.Timer()};
        <header className="jumbotron">
          <p>Current Score: {scoreA}: {scoreB}</p>
        </header>
        <Container>
          <Row>
            <Col>
              <h3> Player video </h3>
            </Col>
            <Col>
              <h3> Observer video </h3>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  // Renderer callback with condition
  renderer = ({ seconds, completed }) => {
    if (completed) {
      // Render a completed state
      this.updateRole();
      // this.props.timeUp();
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
    players.get(userName).team = teamId;
    updateTeamStatus();

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
        console.log("[Jyn] sendData success");
      },
    });
  };

  teamtemplate2() {
    console.log(this.state);
    return (
      <Container>
        <Row>
          {arr1.map((value, index) => {
            return (
              <Col>
                <div id={"videoremote" + value} className="container">
                  {/* <img src={offline} id="img1" className="card-media-image" style={{ width: "300px", height: "250px" }}></img> */}
                </div>
                <h3 id={"callername" + value}> no name </h3>
              </Col>
            );
          })}
        </Row>
        <Row>
          {arr2.map((value, index) => {
            return (
              <Col>
                <div id={"videoremote" + value} className="container">
                  {/* <img src={offline} id="img1" className="card-media-image" style={{ width: "300px", height: "250px" }}></img> */}
                </div>
                <h3 id={"callername" + value}> no name </h3>
              </Col>
            );
          })}
        </Row>
        <Row>
          {arr3.map((value, index) => {
            return (
              <Col>
                <div id={"videoremote" + value} className="container">
                  {/* <img src={offline} id="img1" className="card-media-image" style={{ width: "300px", height: "250px" }}></img> */}
                </div>
                <h3 id={"callername" + value}> no name</h3>
              </Col>
            );
          })}
        </Row>
      </Container>
    );
  }

  // waitForPeople() {
  //   let idx = document.createElement("wait");
  //   for (let i = 0; i < userIds.length; ++i) {
  //     if (userIds[i] === this.state.id) {
  //       if (Object.keys(this.state.player).length === 0) {
  //         idx.innerHTML = i;
  //       } else {
  //         idx.innerHTML = this.state.player.index - i;
  //       }
  //       break;
  //     }
  //   }
  // }

  // Playing() {
  //   return <h1> </h1>;
  // }

  startGame = () => {
    if(!remoteStart){
      // notify remote players
      var message = {
        textroom: "startgame",
        room: myroom,
      };
      this.sendData(message);
    }

    // use adding order as id and form team
    for (var i = 0; i < GlobalPeopleID.length; i++){
      if(GlobalPeopleID[i].name == userName){
        this.id = i + 1;
        console.log("[Jyn] id = ", this.id);
      }
    }
    players.get(userName).team = this.id > 3 ? "B" : "A";

    // TODO: auto generate playbooks
    var playbooks = [
      ["READ_TOPIC",  "PLAY",     "AUDIENCE", "AUDIENCE", "AUDIENCE",   "AUDIENCE", "AUDIENCE", "AUDIENCE"],
      ["WAIT",        "OBSERVE",  "PLAY",     "AUDIENCE", "AUDIENCE",   "AUDIENCE", "AUDIENCE", "AUDIENCE"],
      ["WAIT",        "WAIT",     "OBSERVE",  "ANSWER",   "AUDIENCE",   "AUDIENCE", "AUDIENCE", "AUDIENCE"],
      ["AUDIENCE",    "AUDIENCE", "AUDIENCE", "AUDIENCE", "READ_TOPIC", "PLAY",     "AUDIENCE", "AUDIENCE"],
      ["AUDIENCE",    "AUDIENCE", "AUDIENCE", "AUDIENCE", "WAIT",       "OBSERVE",  "PLAY",     "AUDIENCE"],
      ["AUDIENCE",    "AUDIENCE", "AUDIENCE", "AUDIENCE", "WAIT",       "WAIT",     "OBSERVE",  "ANSWER"]
    ];

    // generate playbook
    this.playbook = playbooks[this.id - 1];
    if(this.playbook.includes("READ_TOPIC"))
      this.pickQuestion();

    // update state
    this.setState({
      // round: 0,
      startGame: 1,
      GlobalPeopleID: GlobalPeopleID,
      step: 0
    });

    // this.render();
  };

  answerRenderer = ({ seconds, completed }) => {
    if (completed) {
      // Render a completed state
      // this.switchTeam();
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

  // deleteObj(obj) {
  //   for (var member in obj) {
  //     delete obj[member];
  //   }
  // }

  // switchTeam() {
  //   team1Competing = !team1Competing;
  //   this.splitTeams(userIds);
  //   this.deleteObj(this.state.player);
  //   this.deleteObj(this.state.observer);
  //   this.setState({
  //     player: {},
  //     observer: {},
  //     totalGameRound: this.state.totalGameRound + 1,
  //     round: 1,
  //   });
  //   if (this.state.totalGameRound === 6) {
  //     // render to another page
  //   }
  // }

  handleSubmit(event) {
    let word = question;
    let correct = question === this.state.answer;
    axios
      .put(
        `https://www.seattle8520.xyz/api/updateCorrectRate?word=${word}&correct=${correct}`
      )
      .then((state) => {
        console.log(state);
        // this.setState({
        //   update_result: state.data.message,
        // });
      });
    if (correct) {
      // let newScore = players.get(userName).team == 'A'
      //   ? this.state.score[0] + 1
      //   : this.state.score[1] + 1;
      // this.setState({
      //   score: newScore,
      // });
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
    // this.switchTeam();
    // event.preventDefault();
  }

  handleChange(event) {
    this.setState({ answer: event.target.value });
  }

  // lookForidx(id) {
  //   let idx;
  //   for (let i = 0; i < team1.length; ++i) {
  //     if (team1[i] === id) {
  //       idx = i;
  //       break;
  //     }
  //   }

  //   for (let i = 0; i < team2.length; ++i) {
  //     if (team2[i] === id) {
  //       idx = i;
  //       break;
  //     }
  //   }
  //   return idx;
  // }

  // yourTeamCompeting() {
  //   let currentId = this.state.id;
  //   for (let i = 0; i < team1.length; ++i) {
  //     // in team1
  //     if (team1[i] === currentId) {
  //       return team1Competing;
  //     }
  //   }
  //   // id in team2
  //   return !team1Competing;
  // }

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

  mapping = (stateId) =>{
    // need to mapping 1-index player state id to video 0-indexing
    return stateId-1;
  }

  localToGlobal = (id) =>{
    // since everyone in his own room would require an index to be 0 locally,
    // I need to compare with globalPeppleId to identify my index globally
    // e.g. If I am the third one into this room,
    // then my video rendering would be 2 1 0 4 5 6 in this order, 
    // so locally, I will be the video 0, and the first guy in the room would be in my video 2
    // but those people that come later than me will be in the right order locally
    // args: 
    //       id : local id, already convert to 0-indexing
    let globalOrder = -1
    let orderArr = []
    for(let i = 0; i< GlobalPeopleID.length;i++){
        if(GlobalPeopleID[i] && GlobalPeopleID[i].id == myid){
            globalOrder = i;
            break
        }
    }  
    if(globalOrder == -1){
        alert(" I'm not in my room ")
        return;
    }
    for(let i = globalOrder; i > -1;i--){
        orderArr.push(i)
    }
    for(let i = globalOrder+1; i< GlobalPeopleID.length;i ++){
        orderArr.push(i)
    }
    return orderArr;

  }

  suppresAllVideo = () =>{
    if(document.getElementById('header')){
        document.getElementById('header').style.display = 'none'
    }
    for(let i=0;i<GlobalPeopleID.length; i++){
        if(!document.querySelector('video#remotevideo'+i)) {continue;}
        document.querySelector('video#remotevideo'+i).muted= true;
        document.querySelector('video#remotevideo'+i).style.visibility= "hidden";
        document.querySelector('video#remotevideo'+i).style.width= "5%";
        document.querySelector('video#remotevideo'+i).style.height= "5%"
    }
  }

  playerObserverVideo = (id) =>{
    id = this.mapping(id)
    let orderArr = this.localToGlobal(id)
    console.log('debugging observer and player start')
    console.log('Order Arr')
    console.log(orderArr)
    console.log('my global index in the room (0-indexing) : ' + id)
    if(document.getElementById('header')){
        document.getElementById('header').style.display = 'none'
    }
    let i;
    let next_id = this.playbook[this.state.step] == "PLAY" ? id+1 : id-1
    if(this.playbook[this.state.step] == "PLAY"){
        console.log(i + ' is playing, ' + next_id + ' is observing' )
    }else if(this.playbook[this.state.step] == "OBSERVE"){
        console.log(i + ' is obsering, ' + next_id + ' is playing' )
    }else{
        console.log('In playerObserver, Logic is wrong, I think')
    }
    for(let k=0;k<GlobalPeopleID.length; k++){
        i = orderArr[k]
        if(!document.querySelector('video#remotevideo'+i)){
            console.log('No so remote video ' + i)
            continue;
        }
        // if(this.playbook[this.state.step] == "PLAY" || this.playbook[this.state.step] == "OBSERVE" ){
        if(i == id || i==next_id){
            console.log('observer and player : '+ i);
            document.querySelector('video#remotevideo'+i).muted= false;
            document.querySelector('video#remotevideo'+i).style.visibility= "visible";
            document.querySelector('video#remotevideo'+i).style.width= "100%";
            document.querySelector('video#remotevideo'+i).style.height= "100%"
        }else{
            console.log('should be muted (not player or not observer): ' + i)
            document.querySelector('video#remotevideo'+i).muted= true;
            document.querySelector('video#remotevideo'+i).style.visibility= "hidden";
            document.querySelector('video#remotevideo'+i).style.width= "5%";
            document.querySelector('video#remotevideo'+i).style.height= "5%"
        }
    }
    console.log('debugging observer and player end')
    if(document.querySelector('video#remotevideo'+id)){
        document.querySelector('video#remotevideo'+id).muted= true;
    }
  }


  allcase = () =>{
    const currentId = this.id;
    // const idx = this.lookForidx(currentId);
    // const flag = this.yourTeamCompeting();
    // console.log("round: ", this.state.round);
    // console.log("flag: ", flag);
    // console.log("idx: ", idx);
    // console.log("Current id: ", currentId);
    // console.log("player: ", this.state.player);
    // console.log("observer: ", this.state.observer);
    // console.log("waiting: ", this.state.waiting);
    let currentStatus = this.state.step < 0 ? null : this.playbook[this.state.step];

    if (this.state.step == -1) {
        return(<p> End </p>);
    // // waiting
    // } else if (!flag) {
    //     // supress all
    //     this.suppresAllVideo();
    //     if (this.state.round === 1) {
    //       return (
    //         <div>
    //           <h1>Wait other team's first player is reading the question!!</h1>
    //           {this.Timer()}
    //         </div>
    //       );
    //     } else {
    //       return (
    //         <div>
    //           <div>{this.Competing()}</div>
    //           {this.Timer()}
    //         </div>
    //       );
    //     }
      } else if (currentStatus == "WAIT") {
        // supress all
        // this.suppresAllVideo();
        // this.waitForPeople();
        return (
          <div className="App">
            {this.Timer()}
            <header className="jumbotron">
              <p>Current Score: {scoreA}: {scoreB}</p>
            </header>
            <h1> WAIT.....</h1>
            <h2>
              {" "}
              Wait for <span id="wait">{this.id <= 3 ? this.id - this.state.step - 1 : this.id - this.state.step + 1}</span> people
            </h2>
          </div>
        );
         // get topic round
      } else if (currentStatus == "READ_TOPIC") {
        // supress all
        // this.suppresAllVideo();
        return (
          <div className="App">
            {this.Timer()}
            <header className="jumbotron">
              <p>Current Score: {scoreA}: {scoreB}</p>
            </header>
            <h1>Please perform this topic only by body language:</h1>
            {/* {this.Question()} */}
            {JSON.stringify(this.state.question)}
          </div>
        );
        // playing
      } else if (currentStatus == "PLAY") {
        // be the publisher
        // look i and i+1
        console.log(this.id + ' is playing')
        this.playerObserverVideo(currentId)
        // be the publisher
        return (
          <div className="App">
            {this.Timer()}
            <header className="jumbotron">
              <p>Current Score: {scoreA}: {scoreB}</p>
            </header>
            <h1>player</h1>
            {/* {this.Playing()} */}            
          </div>
        );
      // observing
    } else if (currentStatus === "OBSERVE") {
        //look i-1  and i
        console.log( this.id-1 + 'is observing')
        this.playerObserverVideo(currentId)
        // be the subscriber
        return (
          <div className="App">
            {this.Timer()}
            <header className="jumbotron">
              <p>Current Score: {scoreA}: {scoreB}</p>
            </header>
            <h1> observer</h1>
            {/* {this.Timer()} */}
            {/* <h3> {this.props.round} </h3>
            <h3> {this.props.question} </h3> */}
          </div>
        );
  
        // audience
      } else if (currentStatus === "AUDIENCE") {
        // video : playerid and observer id
        console.log("I'm an audience, how do I get the player and oberver index? ")
        this.playerObserverVideo(currentId)
        var showTopic = this.state.step > 3 ? players.get(userName).team == 'A' : players.get(userName).team == 'B';
        return (
          <div className="App">
            <h1>Guess what? {showTopic ? "Their Topic: "+theirQuestion: ""}</h1>
            {this.Competing()}
          </div>
        );
      //   // waiting for answer
      // } else if (currentStatus === "ANSWER") {
      //     // supress all video
      //   this.suppresAllVideo();
      //   return (
      //     <div>
      //       <h1>Waiting for the last person to answer the question!</h1>
      //       {this.answerTimer()}
      //     </div>
      //   );
        // answering 
      } else {
          // supress all video
        //   this.suppresAllVideo()
        return (
          <div>
            {/* <form onSubmit={this.handleSubmit}>
              <label>
                Answer:
                <input
                  type="text"
                  value={this.state.value}
                  onChange={this.handleChange}
                />
              </label>
              <input type="submit" value="Submit" />
            </form>
            {this.answerTimer()} */}
            <label for="answer"> Answer: </label>
            <input type="text" onKeyPress={this._handleKeyUp.bind(this)} onChange={this.handleChange}  placeholder="Type your Answer" />
            <button id="submit" onClick={this.handleSubmit}>
                Submit
            </button>
            {this.Timer()}
          </div>
        );
      }
  }


  render() {
    // const currentId = this.state.id;
    // const idx = this.lookForidx(currentId);
    // const flag = this.yourTeamCompeting();
    // console.log("round: ", this.state.round);
    // console.log("flag: ", flag);
    // console.log("idx: ", idx);
    // console.log("Current id: ", currentId);
    // console.log("player: ", this.state.player);
    // console.log("observer: ", this.state.observer);
    // console.log("waiting: ", this.state.waiting);
    // game setting
    return (
    <div className="App">
        <header className="App-header" id='header'>
        <Container class="teams">
            <Row>
            <Col>
                {" "}
                <h1> Team A</h1>{" "}
            </Col>{" "}
            <Col>
                {" "}
                <h1> Team B</h1>
            </Col>
            </Row>
            <Row>
            <Col>
                <button id="A" onClick={this.handleJoinClick}>
                {" "}
                Join{" "}
                </button>{" "}
            </Col>
            <Col>
                <button id="B" onClick={this.handleJoinClick}>
                {" "}
                Join{" "}
                </button>{" "}
            </Col>
            </Row>
            <Row>
            <Col>
                <p id="Ateam1"></p>
            </Col>
            <Col>
                <p id="Bteam1"></p>
            </Col>
            </Row>
            <Row>
            <Col>
                <p id="Ateam2"></p>
            </Col>
            <Col>
                <p id="Bteam2"></p>
            </Col>
            </Row>
            <Row>
            <Col>
                <p id="Ateam3"></p>
            </Col>
            <Col>
                <p id="Bteam3"></p>
            </Col>
            </Row>

            <Row>
            <Col>
                <button id="start" onClick={this.startGame}>
                {" "}
                Start{" "}
                </button>{" "}
            </Col>
            </Row>
            <Row>
            <Col>
                <button id="0" onClick={this.generalVideoSwitch}>
                {" "}
                switch video 0
                </button>
            </Col>
            <Col>
                <button id="1" onClick={this.generalVideoSwitch}>
                {" "}
                switch video 1
                </button>
            </Col>
            <Col>
                <button id="2" onClick={this.generalVideoSwitch}>
                {" "}
                switch video 2
                </button>
            </Col>
            <Col>
                <button id="3" onClick={this.generalVideoSwitch}>
                {" "}
                switch video 3
                </button>
            </Col>
            <Col>
                <button id="4" onClick={this.generalVideoSwitch}>
                {" "}
                switch video 4
                </button>
            </Col>
            <Col>
                <button id="5" onClick={this.generalVideoSwitch}>
                {" "}
                switch video 5
                </button>
            </Col>
            </Row>
        </Container>
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
        </header>
        <div>
        <p width="100%" height="100%">
            <code>guessture</code> video room, Name = {userName} , room ={" "}
            {myroom}
            {this.teamtemplate2()}
            <this.allcase/>
        </p>
        </div>
    </div>
    );

  }
}

export default Game;
