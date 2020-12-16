import React from 'react';
import Janus from './Janus';
import {withRouter} from 'react-router-dom';
import offline from "../images/offline.jpg";
import $ from 'jquery';
import {Container, Row, Col} from 'react-bootstrap'
import { findAllByTestId } from '@testing-library/react';
import Countdown from 'react-countdown';
import { connect } from 'react-redux';

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


try{
    server = require('./config.json').janusServer;
}catch(err){
    console.log(err);
    // server = "http://localhost:8088/janus";
}
let gestureGameroom = null;
let vroomHandle = null;
let myroom;
let opaqueId = "videoroom-"+Janus.randomString(12);
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


// before loading
window.onload = function(){

    let q = document.getElementById("question");
    if (q !== null && q !== 'undefined'){
        let idx = Math.floor(Math.random() * questions.length);
        q.innerHTML = questions[idx];
        question = questions[idx];
    }
    scores.values = document.getElementById("scores");
    if (scores !== null && scores !== 'undefined'){
        scores.innerHTML = this.scores;
    }
    
}

class Game extends React.Component{
    constructor(props){
        super(props);
        this.state = {...props};
        let url = window.location.href;
        let url_params = url.split('/');
        let roomID = url_params[url_params.length-1]
        if(roomID !=="" && Number.isInteger(parseInt(roomID))){
            myroom = parseInt(roomID)
            this.props.changeRoom(myroom);
        }else if(roomID === ""){
            alert("room ID should be an integer, instead of empty")
        }else{
            
            alert("room ID should be an integer" + {roomID})
        }

        w = new Set();
        team1Competing = true;
        this.state = {
            waiting: new Set(),
            player: {},
            observer: {}, 
            question: question
        };
        this.splitTeams(userIds);
        this.scores = [0, 0];
        this.state.id = 1;
        this.addWaiting = this.addWaiting.bind(this);
        this.removeWaiting = this.removeWaiting.bind(this);
    }
    
    addWaiting(id){
        this.setState((waiting) => ({            
            waiting: new Set(waiting).add(id)
        }));
    }

    removeWaiting(id){
        this.setState(({waiting}) =>{
            const newWait = new Set(waiting);
            newWait.delete(id);
            return {
                waiting : newWait
            };
        });
    }

    update(e){
        this.props.changeSessionID(e.target.value);
    }

    componentDidMount(){
        this.GameServerRoomStart();        
    }
    
    splitTeams(userIds){
        let numMembers = userIds.length / 2;
        team1 = userIds.slice(0, numMembers);
        team2 = userIds.slice(numMembers);
        if (team1Competing){
            for (let i = 1; i < team1.length; ++i){
                this.state.waiting.add(team1[i]);
                // this.addWaiting(team1[i]);
            }
        }else{
            for (let i = 1; i < team2.length; ++i){
                // this.state.waiting.add(team2[i]);
                this.addWaiting(team2[i]);
            }
        }
    }

    updateRole(){
        // prevent starting round
        let numMembers = userIds.length / 2;
        if (this.state.waiting.size !== numMembers - 1){
            let newIndex = this.state.player.index + 1;
            let newPlayer = userIds[newIndex];
            this.state.player = {
                "id": newPlayer,
                "index": newIndex
            }
            let newObserIdx = newIndex + 1;
            this.state.observer = {
                "id": userIds[newObserIdx],
                "index": newObserIdx
            } 
            this.removeWaiting(userIds[newObserIdx])
        }else{
            // first round after waiting, update the player and observer
            if (team1Competing){
                this.state.player = {
                    "id": team1[0],
                    "index": 0
                };
                this.state.observer = {
                    "id": team1[1],
                    "index": 1
                };
            }else{
                this.state.player = {
                    "id": team2[0],
                    "index": numMembers
                };
                this.state.observer = {
                    "id": team2[1],
                    "index": numMembers
                };
            }
            this.removeWaiting(this.state.observer.id);
        }

    }

    AutoRefresh( t ) {
        setTimeout("location.reload(true);", t);
    }
    
    GameServerRoomStart(){


        function publishOwnFeed(useAudio) {
            // Publish our stream
            vroomHandle.createOffer(
                {
                    media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true },	// Publishers are sendonly
                    success: function(jsep) {
                        Janus.debug("Got publisher SDP!");
                        Janus.debug(jsep);
                        const publish = { "request": "configure", "audio": useAudio, "video": true };
                        vroomHandle.send({"message": publish, "jsep": jsep});
                    },
                    error: function(error) {
                        Janus.error("WebRTC error:", error);
                        if (useAudio) {
                            publishOwnFeed(false);
                        }
                    }
                });
        }
        function newRemoteFeed(id, display, audio, video) {
            // A new feed has been published, create a new plugin handle and attach to it as a subscriber
            let remoteFeed = null;
            gestureGameroom.attach(
                {
                    plugin: "janus.plugin.videoroom",
                    opaqueId: opaqueId,
                    success: function(pluginHandle) {
                        remoteFeed = pluginHandle;
                        console.log("Plugin attached! (" + remoteFeed.getPlugin() + ", id=" + remoteFeed.getId() + ")");
                        console.log("  -- This is a subscriber");
                        // We wait for the plugin to send us an offer
                        console.log("this is my room :" + myroom);
                        let subscribe = {
                            request: "join",
                            room: myroom,
                            ptype: "subscriber",
                            feed: id,
                            private_id: mypvtid
                        };
                        remoteFeed.videoCodec = video;
                        remoteFeed.send({ message: subscribe });
                    },
                    error: function(error) {
                        Janus.error("  -- Error attaching plugin...", error);
                    },
                    onmessage: function(msg, jsep) {
                        Janus.debug(" ::: Got a message (subscriber) :::", msg);
                        let event = msg["videoroom"];
                        console.log("Event: " + event);
                        if(event) {
                            if(event === "attached") {
                                console.log(`subscriber created and attached!`);
                                // Subscriber created and attached
                                for(let i=1;i<6;i++) {
                                    if(!feeds[i]) {
                                        feeds[i] = remoteFeed;
                                        remoteFeed.rfindex = i;
                                        break;
                                    }
                                }
                                remoteFeed.rfid = msg["id"];
                                remoteFeed.rfdisplay = msg["display"];
                                console.log(`attached`, remoteFeed)
                                Janus.log("Successfully attached to feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") in room " + msg["room"]);
                                $('#remote'+remoteFeed.rfindex).removeClass('hide').html(remoteFeed.rfdisplay).show();
                            }
                        }
                        if(jsep) {
                            Janus.debug("Handling SDP as well...", jsep);
                            // Answer and attach
                            remoteFeed.createAnswer(
                                {
                                    jsep: jsep,
                                    // Add data:true here if you want to subscribe to datachannels as well
                                    // (obviously only works if the publisher offered them in the first place)
                                    media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
                                    success: function(jsep) {
                                        console.log("Got SDP!", jsep);
                                        let body = { request: "start", room: myroom };
                                        remoteFeed.send({ message: body, jsep: jsep });
                                    },
                                    error: function(error) {
                                        console.error("WebRTC error:", error);
                                    }
                                });
                        }
                    },
                    iceState: function(state) {
                        Janus.log("ICE state of this WebRTC PeerConnection (feed #" + remoteFeed.rfindex + ") changed to " + state);
                    },
                    webrtcState: function(on) {
                        Janus.log("Janus says this WebRTC PeerConnection (feed #" + remoteFeed.rfindex + ") is " + (on ? "up" : "down") + " now");
                    },
                    onlocalstream: function(stream) {
                        // The subscriber stream is recvonly, we don't expect anything here
                        console.log("I'm in onlocal stream")
                    },
                    onremotestream: function(stream) {
                        console.log("Remote feed #" + remoteFeed.rfindex + ", stream:", stream);
                        let addButtons = false;
                        if($('#remotevideo'+remoteFeed.rfindex).length === 0) {
                            // No remote video yet
                            $('#videoremote'+remoteFeed.rfindex).children('img').remove();
                            $('#videoremote'+remoteFeed.rfindex).append('<video class="rounded centered" id="waitingvideo' + remoteFeed.rfindex + '" width="100%" height="100%" />');
                            $('#videoremote'+remoteFeed.rfindex).append('<video class="rounded centered relative hide" id="remotevideo' + remoteFeed.rfindex + '" width="100%" height="100%" autoplay playsinline/>');
                            // Show the video, hide the spinner and show the resolution when we get a playing event
                            $("#remotevideo"+remoteFeed.rfindex).bind("playing", function () {
                                if(remoteFeed.spinner)
                                    remoteFeed.spinner.stop();
                                remoteFeed.spinner = null;
                                $('#waitingvideo'+remoteFeed.rfindex).remove();
                                if(this.videoWidth)
                                    $('#remotevideo'+remoteFeed.rfindex).removeClass('hide').show();
                                if(Janus.webRTCAdapter.browserDetails.browser === "firefox") {
                                    // Firefox Stable has a bug: width and height are not immediately available after a playing
                                    setTimeout(function() {
                                        let width = $("#remotevideo"+remoteFeed.rfindex).get(0).videoWidth;
                                        let height = $("#remotevideo"+remoteFeed.rfindex).get(0).videoHeight;
                                        $('#curres'+remoteFeed.rfindex).removeClass('hide').text(width+'x'+height).show();
                                    }, 2000);
                                }
                            });
                        }
                        Janus.attachMediaStream($('#remotevideo'+remoteFeed.rfindex).get(0), stream);
                        let videoTracks = stream.getVideoTracks();

                        if(!videoTracks || videoTracks.length === 0) {
                            // No remote video
                            $('#remotevideo'+remoteFeed.rfindex).hide();
                            if($('#videoremote'+remoteFeed.rfindex + ' .no-video-container').length === 0) {
                                $('#videoremote'+remoteFeed.rfindex).append(
                                    '<img src="' + offline + '" id="img1" class="card-media-image" style="width:300px;height:250px"></img>');
                            }
                        } else {
                            $('#videoremote'+remoteFeed.rfindex+ ' .no-video-container').remove();
                            $('#remotevideo'+remoteFeed.rfindex).removeClass('hide').show();
                        }
                    },
                    oncleanup: function() {
                        Janus.log(" ::: Got a cleanup notification (remote feed " + id + ") :::");
                        if(remoteFeed.spinner)
                            remoteFeed.spinner.stop();
                        $('#remotevideo'+remoteFeed.rfindex).remove();
                        $('#videoremote'+remoteFeed.rfindex).append('<img src="' + offline + '" id="img1" class="card-media-image" style="width:300px;height:250px"></img>');
                    }
                });
        }

        Janus.init(
            {
                debug: true,
                dependencies: Janus.UseDefaultDependencies(),
                callback: function(){
                    gestureGameroom = new Janus(
                        {
                            server: server,
                            success: function(){
                                gestureGameroom.attach({
                                    plugin: "janus.plugin.videoroom",
                                    success: function(pluginHandle){
                                        vroomHandle = pluginHandle;
                                        Janus.log("Plugin attached! (" + vroomHandle.getPlugin() + ", id=" + vroomHandle.getId() + ")");
                                        Janus.log("  -- This is a publisher/manager");
                                        // console.log(typeof(gestureGameroom.getSessionId()))
                                        // // this.props.sessionID = gestureGameroom.getSessionId();
                                        // console.log('sessionID =' + gestureGameroom.getSessionId())
                                        let reg = Janus.randomString(12);
                                        const register = { "request": "join", "room": myroom, "ptype": "publisher", "display": reg };
                                        // myusername = reg;
                                        vroomHandle.send({ "message": register });
                                    },
                                    error : function(err){
                                        Janus.error("  -- Error attaching plugin...", err);
                                    },
                                    consentDialog: function(on){
                                        Janus.debug("Consent dialog should be " + (on ? "on" : "off") + " now");
                                    },
                                    mediaState: function (medium, on) {
                                        Janus.log("Janus " + (on ? "started" : "stopped") + " receiving our " + medium);
                                    },
                                    webrtcState: function (on) {
                                        Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
                                    },
                                    onmessage: function(msg,jsep){
                                        Janus.debug(" ::: Got a message (publisher) :::");
                                        Janus.debug(msg);
                                        let event = msg["videoroom"];
                                        Janus.debug("Event: " + event);
                                        if (event != undefined && event != null) {
                                            if (event === "joined") {
                                                // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                                                myid = msg["id"];
                                                mypvtid = msg["private_id"];
                                                console.log("Successfully joined room " + msg["room"] + " with ID " + myid);
                                                publishOwnFeed(true);
                                                // Any new feed to attach to?
                                                if (msg["publishers"] !== undefined && msg["publishers"] !== null) {
                                                    let list = msg["publishers"];
                                                    console.log("Got a list of available publishers/feeds:");
                                                    console.log(list);
                                                    for (let f in list) {
                                                        let id = list[f]["id"];
                                                        let display = list[f]["display"];
                                                        let audio = list[f]["audio_codec"];
                                                        let video = list[f]["video_codec"];
                                                        console.log("  >> [" + id + "] " + display + " (audio: " + audio + ", video: " + video + ")");
                                                        console.log('somebody in the same room : ' + {id} )
                                                        newRemoteFeed(id, display, audio, video);
                                                    }
                                                    
                                                }
                                            } else if (event === "destroyed") {
                                                // The room has been destroyed
                                                Janus.warn("The room has been destroyed!");
                                                console.error("The room has been destroyed");
                                            } else if (event === "event") {
                                                // Any new feed to attach to?
                                                console.log("when will I got this event")
                                                console.log(msg["publishers"])
                                                setTimeout(() => {  console.log("World!"); }, 2000);
                                                if (msg["publishers"] !== undefined && msg["publishers"] !== null) {
                                                    console.log('new publishers!')
                                                    let list = msg["publishers"];
                                                    for(let f in list) {
                                                        let id = list[f]["id"];
                                                        let display = list[f]["display"];
                                                        let audio = list[f]["audio_codec"];
                                                        let video = list[f]["video_codec"];
                                                        console.log("  >> [" + id + "] " + display + " (audio: " + audio + ", video: " + video + ")");
                                                        newRemoteFeed(id, display, audio, video);
                                                    }
                                                } else if (msg["leaving"] !== undefined && msg["leaving"] !== null) {
                                                    // One of the publishers has gone away?
                                                    // let leaving = msg["leaving"]
                                                    // Janus.log("Publisher left:"+ leaving)
                                                    // let remoteFeed = null;
                                                    // for(let i=1; i<6 ; i++){
                                                    //     if (feeds[i] && feeds[i].rfid == leaving){
                                                    //         remoteFeed = feeds[i];
                                                    //         break;
                                                    //     } 
                                                    // }
                                                    // if(remoteFeed != null){
                                                    //     feeds[remoteFeed.rfid] = null;
                                                    //     remoteFeed.detach();
                                                    // }
                                                } else if (msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
                                                    // One of the publishers has unpublished?
                                                    if (msg["unpublished"] === 'ok') {
                                                        vroomHandle.hangup();
                                                        return;
                                                    }
                                                } else if (msg["error"] !== undefined && msg["error"] !== null) {
                                                    if (msg["error_code"] === 426) {
                                                        // This is a "no such room" error: give a more meaningful description
                                                    } else {
                                                        alert(msg["error"]);
                                                    }
                                                }
                                            }
                                        }
                                        console.log("wait my message isnt sent")
                                        console.log(jsep)
                                        if (jsep !== undefined && jsep !== null) {
                                            Janus.debug("Got room event. Handling SDP as well...");
                                            Janus.debug(jsep);
                                            vroomHandle.handleRemoteJsep({jsep: jsep});
                                            console.log("hope I can get some publishers here")
                                            console.log(msg["publishers"])
                                            // Check if any of the media we wanted to publish has
                                            // been rejected (e.g., wrong or unsupported codec)
                                            let audio = msg["audio_codec"];
                                            if (mystream && mystream.getAudioTracks() && mystream.getAudioTracks().length > 0 && !audio) {
                                                // Audio has been rejected
                                                alert("Our audio stream has been rejected, viewers won't hear us");
                                            }
                                            let video = msg["video_codec"];
                                            if (mystream && mystream.getVideoTracks() && mystream.getVideoTracks().length > 0 && !video) {
                                                // Video has been rejected
                                                alert("Our video stream has been rejected, viewers won't see us");
                                                // Hide the webcam video
                                                $('#myvideo').hide();
                                                $('#videolocal').append(
                                                    '<div class="no-video-container">' +
                                                    '<i class="fa fa-video-camera fa-5 no-video-icon" style="height: 100%;"></i>' +
                                                    '<span class="no-video-text" style="font-size: 16px;">Video rejected, no webcam</span>' +
                                                    '</div>');
                                            }
                                        }
                                    },
                                    onlocalstream: function(stream){
                                        // top priority
                                        console.log(" ::: Got a local stream :::", stream);
                                        mystream = stream;
                                        const video = document.querySelector('video#localvideo');
                                        const videoTracks = stream.getVideoTracks();
                                        console.log(`Using video device: ${videoTracks[0].label}`);
                                        video.srcObject = stream;
                                    },
                                    onremotestream: function(){
                                        // second priority
                                    },
                                    oncleanup: function(){
                                        Janus.log(" ::: Got a cleanup notification: we are unpublished now :::");
                                        mystream = null;
                                    },
                                    detached: function(){

                                    }

                                })
                            },
                            error: function(err){
                                // todo
                                alert(err);
                            },
                            destroyed:function(){
                                // todo
                                console.log()
                                console.log('destroyed');
                                window.location.reload();
                            }
                        }
                    );
                }
            }
        );        
    }

    // conditional rendering`
    Question(){
        return (
            <div className="App">
                <h2 id="question"></h2>
                {this.Timer()}
            </div>
        )
    }

    Competing(){
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
                            <div id="myvideo" className="container">
                                <video id="localvideo" className="rounded centered" width="100%" height="100%" autoPlay playsInline muted="muted"></video>
                            </div>
                        </Col>
                        <Col>
                            <div id="videoremote1" className="container">
                                <img src={offline} id="img1" className="card-media-image" style={{ width: "300px", height: "250px" }}></img>
                            </div>
                            <h3 id="callername">{'Participant 1'}</h3>
                        </Col>
                    </Row>
                </Container>
            </div>
        )
    }

    // Renderer callback with condition
    renderer = ({ seconds, completed }) => {
        if (completed) {
            // Render a completed state
            this.updateRole();
            this.props.timeUp();
            return <span> You are good to go! </span>;
        } else {
            // Render a countdown
            return <span>{seconds} seconds</span>;
        }
    }

    Timer(){
        return (
            <div>
                <Countdown
                    date={Date.now() + 5000}
                    renderer={this.renderer}
                />,
            </div>
        )
    }

    waitForPeople(){
        let idx = document.createElement("wait");
        for (let i = 0; i < userIds.length; ++i){
            if (userIds[i] === this.state.id){
                if (Object.keys(this.state.player).length === 0){
                    idx.innerHTML = i;
                }else{
                    idx.innerHTML = this.state.player.index - i;
                }
                break;
            }
        }
    }


    render(){
        if (this.props.round === userIds.length / 2 + 1){
            return(
            <div>
                <label for="answer"> Answer: </label>
                <input type="text" id="answer" name="answer"></input>
                <input type="submit" value="Submit"></input>
                {this.Timer()}
            </div>
            )
        }else if (this.state.waiting.has(this.state.id)){
            this.waitForPeople();
            return (
                <div className="App">                    
                    <h1> WAIT.....</h1>
                    <h2> Wait for <span id="wait"> </span> people</h2>
                    {this.Timer()}
                </div>
            )     
        }else if ((userIds.length / 2) - 1 === this.state.waiting.size){
            return (
                <div className="App">
                    <h1>Please perform this topic only by body language:</h1> 
                    {this.Question()}
                    <button onClick={this.props.timeUp}> Give up?</button>
                    <h3> {this.props.round} </h3>
                    <h3> {this.props.question} </h3>
                </div>                
            )
        }else if (this.state.player.id === this.state.id){
            // be the publisher
            return(
                <div>
                    <h1>player</h1>
                    {this.Timer()}
                </div>
            )
        }else if (this.state.observer.id === this.state.id){
            // be the subscriber
            return(
                <div>
                    <h1> observer</h1>
                    {this.Timer()}
                    <h3> {this.props.round} </h3>
                    <h3> {this.props.question} </h3>
                </div>
            )

        }else{
            return (                
                <div className="App">
                    <h1>Watch those fools ;)</h1> 
                    {this.Competing()}

                </div>
            )
        }
    }
}

const mapStateProps = state => {
    return {
        round: state.round,
        question: state.question
    }
}

const mapDispatchtoProps = dispatch => {
    return {
        timeUp: () => dispatch({type: "Next round"}),
    };
}
export default connect(mapStateProps, mapDispatchtoProps)(Game);