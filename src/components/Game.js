import React, { useState } from "react";
import ReactDOM from "react-dom";
import Janus from "./Janus";
import { withRouter } from "react-router-dom";
import offline from "../images/offline.jpg";
import $ from "jquery";
import { Container, Row, Col } from "react-bootstrap";
import { findAllByTestId } from "@testing-library/react";
import Countdown from "react-countdown";
import { connect } from "react-redux";
import { Word } from "./Word";
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
let team1Competing;
let w;
let scores = [];
// idx, player id
let player = {};
// idx, player id
let observer = {};
let question;

let GlobalPeopleID = [];
let myIndexInRoom = 0;
let userName = "";
let teamA = [0, 2, 4];
let teamB = [1, 3, 5];
let arr1 = [0, 1];
let arr2 = [2, 3];
let arr3 = [4, 5];
let arrayA = [null, null, null];
let arrayB = [null, null, null];
let res = null;
let listReq = null;
let frequency = 5000;

// only form team usage, date structure would be {username => {id: id, team: team}}
let players = new Map();

// before loading
window.onload = function () {
  let q = document.getElementById("question");
  if (q !== null && q !== "undefined") {
    let idx = Math.floor(Math.random() * questions.length);
    q.innerHTML = questions[idx];
    question = questions[idx];
  }
  scores.values = document.getElementById("scores");
  if (scores !== null && scores !== "undefined") {
    scores.innerHTML = this.scores;
  }
};

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
    this.pickQuestion();
    w = new Set();
    team1Competing = true;

    // member variables
    this.state = {
      waiting: new Set(),
      player: {},
      observer: {},
      question: question,
      GlobalPeopleID: [],
      round: 1,
      userIds: [1, 2, 3, 4, 5, 6],
      score: [0, 0],
      totalGameRound: 1,
      isCorrect: false,
      // timer usage only,
      completions: 0
    };
    this.splitTeams(userIds);
    this.scores = [0, 0];
    this.state.id = 4;

    this.addWaiting = this.addWaiting.bind(this);
    this.removeWaiting = this.removeWaiting.bind(this);
    this.startGame = this.startGame.bind(this);

    // only form team usage
    players.set(userName, {});

    this.state.startGame = 0;
    this.state.allVideos = [1, 1, 1, 1, 1, 1];
    this.state.generalVideoSwitch = this.generalVideoSwitch.bind(this);

    this.state.video1 = 1;
    this.switchVideo1 = this.switchVideo1.bind(this);
    this.state.video0 = 1;
    this.switchVideo0 = this.switchVideo0.bind(this);
  }

  pickQuestion() {
    axios.get("https://www.seattle8520.xyz/api/getRandomWord").then((state) => {
      console.log(state);
      this.setState({
        // the generated word is stored in `res.data.item`
        question: state.data.item,
      });
    });
  }

  addWaiting(id) {
    this.setState((waiting) => ({
      waiting: new Set(waiting).add(id),
    }));
  }

  removeWaiting(id) {
    this.setState(({ waiting }) => {
      const newWait = new Set(waiting);
      newWait.delete(id);
      return {
        waiting: newWait,
      };
    });
  }

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

  splitTeams(userIds) {
    let numMembers = userIds.length / 2;
    team1 = userIds.slice(0, numMembers);
    team2 = userIds.slice(numMembers);
    if (team1Competing) {
      for (let i = 1; i < team1.length; ++i) {
        this.state.waiting.add(team1[i]);
        // this.addWaiting(team1[i]);
      }
    } else {
      for (let i = 1; i < team2.length; ++i) {
        this.state.waiting.add(team2[i]);
        // this.addWaiting(team2[i]);
      }
    }
  }

  updateRole() {
    console.log("update role");
    let numMembers = userIds.length / 2;
    // prevent starting round
    const newWait = new Set(this.state.waiting);
    if (this.state.round === 2){
        this.deleteObj(this.state.observer);
        this.deleteObj(this.state.player);
        return;
    }
    if (this.state.waiting.size !== numMembers - 1) {
        let newIndex = this.state.observer.index;
        let newPlayer = team1Competing ? team1[newIndex] :  team2[newIndex];
        let newObserIdx = newIndex + 1;
        let newObser = team1Competing ? team1[newObserIdx] : team2[newObserIdx];
        this.setState({
            player: {
                id: newPlayer,
                index: newIndex,
            },
            observer: {
                id: newObser,
                index: newObserIdx,
            },
            waiting: new Set(),
            round: this.state.round + 1,
        });
    } else {
        // first round after waiting, update the player and observer
        if (team1Competing) {
            console.log("first round");
            newWait.delete(team1[1]);
            this.setState({
                player: {
                    id: team1[0],
                    index: 0,
                },
                observer: {
                    id: team1[1],
                    index: 1,
                },
                waiting: newWait,
                round: this.state.round + 1,
            });
        } else {
            newWait.delete(team2[1]);
            this.setState({
                player: {
                    id: team2[0],
                    index: 0,
                },
                observer: {
                    id: team2[1],
                    index: 1,
                },
                waiting: newWait,
                round: this.state.round + 1,
            });
        }
    }
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

                    // console.log($('#callername0'));
                    // console.log(userName);
                    // $('#callername1').innerHTML = {userName}
                    // $('#callername1').focus()
                    // newRemoteFeed(myid, userName, )

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
                    // for(let i= 0; i<6;i++){
                    //     console.log("I wanna know the caller")
                    //     console.log(document.getElementById('#callername'+i).innerHTML)
                    //     document.getElementById('#callername'+i).innerHTML = this.state.GlobalPeopleID[i] ? this.state.GlobalPeopleID[i].name : "participant"+i;
                    //     document.getElementById('#callername'+i).focus();
                    // }
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
                // if(!$('#caller0')){
                //     $('#videoremote0').append(<h3 id="caller0" >{userName}</h3>)
                // }
                // console.log($('#callername0'));
                // console.log(userName);
                // $('#callername0').innerHTML = {userName}
                // $('#callername0').focus()
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
  Question() {
    return (
      <div className="App">
        {JSON.stringify(this.state.question)}
        {this.Timer()}
      </div>
    );
  }

  Competing() {
    return (
      <div className="App">
        {this.Timer()};
        <header className="App-header">
          <p>
            Current Score: <span id="scores">0 : 0</span>
          </p>
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
    //   if (this.state.round === 3){
    //       this.switchTeam();
    //   }
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

  waitForPeople() {
    let idx = document.createElement("wait");
    for (let i = 0; i < userIds.length; ++i) {
      if (userIds[i] === this.state.id) {
        if (Object.keys(this.state.player).length === 0) {
          idx.innerHTML = i;
        } else {
          idx.innerHTML = this.state.player.index - i;
        }
        break;
      }
    }
  }

  Playing() {
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
      </Container>
      // <div id="myvideo" className="container shorter">
      //     <video id="localvideo" className="rounded centered" width="5%" height="5%" autoPlay playsInline muted="muted"></video>
      // </div>
    );
  }

  startGame = () => {
    this.setState({
      round: 0,
      startGame: 1,
      GlobalPeopleID: GlobalPeopleID,
    });
    // this.render();
  };



  switchVideo1 = () => {
    if (document.querySelector("video#remotevideo1") == null) {
      alert("No such video1 item yet");
      return;
    }
    if (this.state.video1 == 1) {
      document.querySelector("video#remotevideo1").muted = true;
      document.querySelector("video#remotevideo1").style.visibility = "hidden";
      this.state.video1 = 0;
    } else {
      document.querySelector("video#remotevideo1").muted = false;
      document.querySelector("video#remotevideo1").style.visibility = "visible";
      this.state.video1 = 1;
    }
  };

  switchVideo0 = () => {
    if (document.querySelector("video#remotevideo0") == null) {
      alert("No such video0 item yet");
      return;
    }
    if (this.state.video0 == 1) {
      document.querySelector("video#remotevideo0").muted = true;
      document.querySelector("video#remotevideo0").style.visibility = "hidden";
      this.state.video0 = 0;
    } else {
      document.querySelector("video#remotevideo0").muted = true;
      document.querySelector("video#remotevideo0").style.visibility = "visible";
      this.state.video0 = 1;
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

  answerRenderer = ({ seconds, completed }) => {
    if (completed) {
      // Render a completed state
      console.log('answer render');
      this.switchTeam();
      return <span>Time's up</span>
    } else {
      // Render a countdown
      return <span>{seconds} seconds</span>;
    }
  };

  answerTimer() {
    return (
      <div>
        <Countdown key={this.state.completions} date={Date.now() + frequency} renderer={this.answerRenderer} onComplete={this.onComplete} />,
      </div>
    );
  }

  deleteObj(obj){
      for (var member in obj){
          delete obj[member];
      }
  }

  switchTeam() {
    console.log('switch team');
    if (this.state.waiting.size === 2){
        return;
    }
    team1Competing = !team1Competing;
    this.splitTeams(userIds);
    const newObj = Object.create(null);
    this.setState({
      player: newObj,
      observer: newObj,
      totalGameRound: this.state.totalGameRound + 1,
      round: 0,
    });
    this.pickQuestion();
    if (this.state.totalGameRound === 6) {
      // render to another page
    }
  }

  handleSubmit(event) {
    let word = this.state.value;
    let correct = this.state.question === word;
    axios
      .put(
        `https://www.seattle8520.xyz/api/updateCorrectRate?word=${word}&correct=${correct}`
      )
      .then((state) => {
        this.setState({
          update_result: state.data.message,
        });
      });
    if (correct) {
      let newScore = team1Competing
        ? this.state.score[0] + 1
        : this.state.score[1] + 1;
      this.setState({
        score: newScore,
      });
      alert("Good job! You save your team");
    } else {
      alert("BOOM!!! Wrong answer");
    }
    event.preventDefault();
  }

  handleChange(event) {
    this.setState({ value: event.target.value });
  }

  lookForidx(id) {
    let idx;
    for (let i = 0; i < team1.length; ++i) {
      if (team1[i] === id) {
        idx = i;
        break;
      }
    }

    for (let i = 0; i < team2.length; ++i) {
      if (team2[i] === id) {
        idx = i;
        break;
      }
    }
    return idx;
  }

  yourTeamCompeting() {
    let currentId = this.state.id;
    for (let i = 0; i < team1.length; ++i) {
      // in team1
      if (team1[i] === currentId) {
        return team1Competing;
      }
    }
    // id in team2
    return !team1Competing; 
  }
  
  onComplete = () => {
    this.setState({
      completions: this.state.completions + 1
    },
    () => console.log('completions', this.state.completions)
    )
  }

  timeToSwitchTeam(){
      return ((this.state.completions - 3) % 4 === 0 && this.state.completions !== 0);
  }

  render() {
    const currentId = this.state.id;
    const idx = this.lookForidx(currentId);
    const yourTeamCompeting = this.yourTeamCompeting();
    const switchTeam = this.timeToSwitchTeam();
    console.log("round: ", this.state.round);
    console.log("flag: ", yourTeamCompeting);
    console.log("idx: ", idx);
    console.log("Current id: ", currentId);
    console.log("player: ", this.state.player);
    console.log("observer: ", this.state.observer);
    console.log("waiting: ", this.state.waiting);
    // game setting
    if (this.state.startGame === 0) {
      return (
        <div className="App">
          <header className="App-header">
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
                  <p id="Ateam1">""</p>
                </Col>
                <Col>
                  <p id="Bteam1">""</p>
                </Col>
              </Row>
              <Row>
                <Col>
                  <p id="Ateam2">""</p>
                </Col>
                <Col>
                  <p id="Bteam2">""</p>
                </Col>
              </Row>
              <Row>
                <Col>
                  <p id="Ateam3">""</p>
                </Col>
                <Col>
                  <p id="Bteam3">""</p>
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
            </p>
          </div>
        </div>
      );
      // waiting
    } else if(!yourTeamCompeting && switchTeam){
        return (
            <div>
                <h1>
                    Other team's last player is struggling.
                </h1>
                {this.answerTimer()}
            </div>
        )
    }else if (!yourTeamCompeting) {
      if (this.state.round === 0) {
        return (
          <div>
            <h1>Wait other team's first player is reading the question!!</h1>
            {this.Timer()}
          </div>
        );
      } else {
        return (
          <div>
            <div>{this.Competing()}</div>
            {this.Timer()}
          </div>
        );
      }
    } else if (this.state.waiting.has(currentId)) {
      this.waitForPeople();
      return (
        <div className="App">
          <h1> WAIT.....</h1>
          <h2>
            {" "}
            Wait for <span id="wait"> </span> people
          </h2>
          {this.Timer()}
          {this.teamtemplate2()}
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
      // starting round
    } else if (userIds.length / 2 - 1 === this.state.waiting.size) {
      return (
        <div className="App">
          <h1>Please perform this topic only by body language:</h1>
          {this.Question()}
        </div>
      );
      // playing
    } else if (this.state.player.id === currentId) {
      // be the publisher
      return (
        <div>
          <h1>player</h1>
          {this.Playing()}
          {this.Timer()}
          {this.teamtemplate2()}
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
      // observing
    } else if (this.state.observer.id === currentId) {
      // be the subscriber
      return (
        <div>
          <h1> observer</h1>
          {this.Timer()}
          <h3> {this.props.round} </h3>
          <h3> {this.props.question} </h3>
          {this.teamtemplate2()}
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

      // audience
    } else if (
      this.state.player.id !== currentId &&
      this.state.observer.id !== currentId &&
      this.state.observer.index < team1.length
    ) {
      return (
        <div className="App">
          <h1>Guess what?</h1>
          {this.Competing()}
        </div>
      );
      // answering
    } else if (
      idx < team1.length - 1 && yourTeamCompeting
    ) {
      return (
        <div>
          <h1>Waiting for the last person to answer the question!</h1>
          {this.answerTimer()}
        </div>
      );
    } else {
      return (
        <div>
          <form onSubmit={this.handleSubmit}>
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
          {this.answerTimer()}
        </div>
      );
    }
  }
}

export default Game;
