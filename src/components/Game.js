import React, {useState} from 'react';
import Janus from './Janus';
import {withRouter} from 'react-router-dom';
import offline from "../images/offline.jpg";
import $ from 'jquery';
import {Container, Row, Col} from 'react-bootstrap'
let server;
let sessionID;

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
let peopleNum = 0;
let GlobalPeopleID = []
let myIndexInRoom=0;
let userName;
let teamA = [0,2,4]
let teamB = [1,3,5]
let arr1 = [0,1]
let arr2 = [2,3]
let arr3 = [4,5]
let arrayA = [null,null,null]
let arrayB = [null,null,null]
let res = null;
let listReq = null;


class Game extends React.Component{
    

    constructor(props){
        super(props);
        // this.props = props;
        this.state = {...props};

        console.log('opaqueID' + opaqueId);
        console.log(this.props)
        console.log(this.state)
        
        let url = window.location.href;
        let url_params = url.split('/');
        let roomID = url_params[url_params.length-1]
        if(roomID !=="" && Number.isInteger(parseInt(roomID))){
            myroom = parseInt(roomID)
            this.state.changeRoom(myroom);
        }else if(roomID === ""){
            alert("room ID should be an integer, instead of empty")
        }else{
            alert("room ID should be an integer" + {roomID})
        }
        if(this.state.name==="debo"){
            userName = prompt("Please enter your name")
            while(userName === ""){
                userName = prompt("Please enter your nam again, don't let it be empty")
            }
            this.state.changeName(userName);
        }else{
            userName =this.state.name;
        }
        this.changeTeam = this.changeTeam.bind(this);
        // this.askServer = this.askServer.bind(this);
        // console.log("My name is :" + this.props.name)
        // console.log(this.state)

    };



    // update(e){
    //     this.props.changeSessionID(e.target.value);
    // }

    componentDidMount(){
        // console.log("room ID = " + myroom)
        this.GameServerRoomStart();
        // this.state.changePlayers({...GlobalPeopleID})
        // console.log("how many people in the room?");
        // if(!feeds){
        //     console.log('no people in the room')
        // }else{
        //     for(let i = 0; i < feeds.length;i++){
        //         console.log('feed '+ i + ' id :' + feeds[i].id)
        //         console.log('feed '+ i + ' rfid :' + feeds[i].rfid)
        //     }
        // }
        // console.log(feeds);
        // this.forceUpdate();
        
        
    }

    // componentDidUpdate(){
    //     console.log('When will I come here')
    //     // this.state.changePlayers(GlobalPeopleID)
    //     // console.log(this.state.players)
    // }
    
    // setOrderderPeopleName(){
    //     for(let i = 0;i < 6; i++){
    //         this.state.orderedPeopleName[i] = GlobalPeopleID[i] ? GlobalPeopleID[i] : {id: null, name:"no participant"}
    //     }
    // }

    updatePlayers(){
        this.state.changePlayers(GlobalPeopleID);
        while(this.state.players.length < 6){
            this.state.players.push({id:null, id:"uknown"})
        }
        
    }

    GameServerRoomStart(){
        function publishOwnFeed(useAudio) {
            // Publish our stream
            vroomHandle.createOffer(
                {
                    // media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true },	// Publishers are sendonly
                    media: { audioRecv: false, videoRecv: true, audioSend: useAudio, videoSend: true },
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
                            console.log('all people here')
                            console.log(GlobalPeopleID)
                            console.log(feeds)
                            // this.state.changePlayers();
                            // console.log(this.state);
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
                        // console.log("I'm in onlocal stream")
                    },
                    onremotestream: function(stream) {
                        console.log("Remote feed #" + remoteFeed.rfindex + ", stream:", stream);
                        let addButtons = false;
                        if($('#remotevideo'+remoteFeed.rfindex).length === 0) {
                            // No remote video yet
                            // $('#videoremote'+remoteFeed.rfindex).children('img').remove();
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
                                // $('#videoremote'+remoteFeed.rfindex).append(
                                //     '<img src="' + offline + '" id="img1" class="card-media-image" style="width:300px;height:250px"></img>');
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
                        // $('#videoremote'+remoteFeed.rfindex).append('<img src="' + offline + '" id="img1" class="card-media-image" style="width:300px;height:250px"></img>');
                    }
                });
        }

        console.log(this.state);
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
                                        let reg = userName;
                                        console.log("display name:"+ reg + ",type:"+ typeof(reg));
                                        const createRegister = { "request": "create", "room": myroom, "permanent": false,"is_private":false, "publishers":6 };
                                        vroomHandle.send({ "message": createRegister });
                                        const joinRegister = { "request": "join", "room": myroom, "ptype": "publisher", "display": reg };
                                        vroomHandle.send({ "message": joinRegister });

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
                                        // console.log(msg)
                                        // console.log(jsep)
                                        Janus.debug("Event: " + event);
                                        if (event != undefined && event != null) {
                                            
                                            
                                            if (event === "joined") {
                                                // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                                                myid = msg["id"];
                                                mypvtid = msg["private_id"];
                                                console.log("Successfully joined room " + msg["room"] + " with ID " + myid);
                                                GlobalPeopleID.unshift({id:myid, name:userName});
                                                publishOwnFeed(true);
                                                // console.log($('#callername0'));
                                                // console.log(userName);
                                                // $('#callername1').innerHTML = {userName}
                                                // $('#callername1').focus()
                                                // newRemoteFeed(myid, userName, )

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
                                                        GlobalPeopleID.unshift({id:id, name:display})
                                                        newRemoteFeed(id, display, audio, video);
                                                    }

                                                    console.log('all people here');
                                                    console.log(GlobalPeopleID);
                                                    console.log(feeds)
                                                    // this.state.changePlayers();
                                                    // console.log(this.state);
                                                    // this.state.changePlayers(GlobalPeopleID)
                                                    
                                                    
                                                    
                                                    
                                                }
                                            } else if (event === "destroyed") {
                                                // The room has been destroyed
                                                Janus.warn("The room has been destroyed!");
                                                console.error("The room has been destroyed");
                                            } else if (event === "event") {
                                                // Any new feed to attach to?
                                                
                                                if(!vroomHandle){
                                                    listReq = {"request" : "listparticipants", "room" :myroom}
                                                    res = vroomHandle.send({"message":listReq})
                                                    console.log("list all participants")
                                                    console.log(res);

                                                }


                                                if (msg["publishers"] !== undefined && msg["publishers"] !== null) {
                                                    console.log('new publishers!')
                                                    let list = msg["publishers"];
                                                    for(let f in list) {
                                                        let id = list[f]["id"];
                                                        let display = list[f]["display"];
                                                        let audio = list[f]["audio_codec"];
                                                        let video = list[f]["video_codec"];
                                                        console.log("  >> [" + id + "] " + display + " (audio: " + audio + ", video: " + video + ")");
                                                        GlobalPeopleID.push({id:id, name:display})
                                                        newRemoteFeed(id, display, audio, video);
                                                    }
                                                    console.log('all people here');
                                                    console.log(GlobalPeopleID);
                                                    console.log(feeds)



                                                    // this.updatePlayers();
                                                    // this.state.changePlayers();
                                                } else if (msg["leaving"] !== undefined && msg["leaving"] !== null) {
                                                    var leaving = msg["leaving"];
                                                    Janus.log("Publisher left: " + leaving);
                                                    var remoteFeed = null;
                                                    for(var i=1; i<6; i++) {
                                                        console.log('letme see the feeds')
                                                        console.log(feeds)
                                                        if(feeds[i] && feeds[i].rfid == leaving) {
                                                            remoteFeed = feeds[i];
                                                            break;
                                                        }
                                                    }
                                                    if(remoteFeed != null) {
                                                        Janus.debug("Feed " + remoteFeed.rfid + " (" + remoteFeed.rfdisplay + ") has left the room, detaching");
                                                        $('#remote'+remoteFeed.rfindex).empty().hide();
                                                        $('#videoremote'+remoteFeed.rfindex).empty();
                                                        feeds[remoteFeed.rfindex] = null;
                                                        remoteFeed.detach();
                                                    }
                                                    console.log('all people here');
                                                    console.log(GlobalPeopleID);
                                                    console.log(feeds)
                                                    let tmp = 0
                                                    for(let i=0; i< GlobalPeopleID.length; i++){
                                                        tmp = 0
                                                        for(let f in feeds){
                                                            if( (f!= null || f != undefined) && f.rfid == GlobalPeopleID[i].id){
                                                                tmp += 1;
                                                                break;
                                                            }
                                                        }
                                                        if(tmp == 0 && GlobalPeopleID[i].id != myid){
                                                            GlobalPeopleID.splice(i,1);
                                                        }
                                                        
                                                    }
                                                    console.log('all people here');
                                                    console.log(GlobalPeopleID);
                                                    console.log(feeds)

                                                    // this.state.changePlayers();
                                                    // console.log(this.state);

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
                                                // for(let i= 0; i<6;i++){
                                                //     console.log("I wanna know the caller")
                                                //     console.log(document.getElementById('#callername'+i).innerHTML)
                                                //     document.getElementById('#callername'+i).innerHTML = GlobalPeopleID[i] ? GlobalPeopleID[i].name : "participant"+i;
                                                //     document.getElementById('#callername'+i).focus();
                                                // }
                                                
                                            }
                                        }
                                        if (jsep !== undefined && jsep !== null) {
                                            Janus.debug("Got room event. Handling SDP as well...");
                                            Janus.debug(jsep);
                                            vroomHandle.handleRemoteJsep({jsep: jsep});
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
                                        console.log("my index in room : " + myIndexInRoom);
                                        const video = document.querySelector('video#localvideo');
                                        
                                        // $('#videoremote'+myIndexInRoom).children('img').remove();
                                        // $('#videoremote'+myIndexInRoom).append('<video class="rounded centered" id="waitingvideo' + myIndexInRoom + '" width="100%" height="100%" />');
                                        $('#videoremote'+myIndexInRoom).append('<video class="rounded centered relative hide" id="remotevideo' + myIndexInRoom + '" width="100%" height="100%" autoplay playsinline/>');
                                        Janus.attachMediaStream($('#remotevideo'+myIndexInRoom).get(0), stream);
                                        document.querySelector('#remotevideo'+myIndexInRoom).muted= true;
                                        // const video = document.querySelector('videoremote'+myIndexInRoom);
                                        const videoTracks = stream.getVideoTracks();
                                        console.log(`Using video device: ${videoTracks[0].label}`);
                                        console.log('videoremote'+myIndexInRoom)
                                        console.log(video)
                                        video.srcObject = stream;
                                        document.querySelector('video#localvideo').muted= true;
                                        document.querySelector('video#localvideo').style.visibility= "hidden";
                                        // if(!$('#caller0')){
                                        //     $('#videoremote0').append(<h3 id="caller0" >{userName}</h3>)
                                        // }
                                        // console.log($('#callername0'));
                                        // console.log(userName);
                                        // $('#callername0').innerHTML = {userName}
                                        // $('#callername0').focus()
                                        
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

    changeTeam = (e) => {
        // console.log('hi')
        // e.preventDefault();
        let teamId = e.target.id;
        console.log(e);
        console.log(e.target)
        console.log('are you in changeTeam')
        console.log(teamId)
        console.log(document.getElementById(teamId+'team'+1))
        let inTeam = 0;
        let tmp = "";
        for(let i = 1; i < 4;i++){
            console.log(teamId+'team'+i)
            console.log(document.getElementById(teamId+'team'+i)) 
            console.log('""')       
            if(document.getElementById(teamId+'team'+i) == null){
                break;
            }
            tmp = document.getElementById(teamId+'team'+i).innerHTML
            console.log(tmp);
            if(tmp === '""' || tmp == null){
                document.getElementById(teamId+'team'+i).innerHTML = userName;
                inTeam = inTeam +  1;
                break;
            }
        }
        console.log('inTeam : ' + inTeam)
        if(inTeam == 0){
            console.error("This Team is full")
        }else{
            if(teamId == "A"){
                teamId = "B";
            }else{
                teamId = "A";
            }
            for(let i = 1; i < 4;i++){
                tmp = document.getElementById(teamId+'team'+i).innerHTML
                console.log(tmp)
                if(tmp == userName){
                    document.getElementById(teamId+'team'+i).innerHTML = '""';
                    break;
                }
            }
        }
    }


    // askServer(){
    //     let listParticipantReq = {"request" : "listparticipants", "room" : myroom}
    //     let resList = vroomHandle.send({"message": listParticipantReq})
    //     Janus.debug(resList);
    // }

    teamtemplate2(){
        console.log(this.state)
        return (
        <Container>

            <Row>
                { arr1.map((value, index) => {
                    return(      
                        <Col>         
                            <div id={"videoremote"+(value)} className="container">
                                {/* <img src={offline} id="img1" className="card-media-image" style={{ width: "300px", height: "250px" }}></img> */}
                            </div>
                            <h3 id={"callername"+value}> {this.state.players[value] ? this.state.players[value].name : "no name"} </h3>
                        </Col> 
                    )
                })}
            </Row>
            <Row>
                { arr2.map((value, index) => {
                    return(      
                        <Col>         
                            <div id={"videoremote"+(value)} className="container">
                                {/* <img src={offline} id="img1" className="card-media-image" style={{ width: "300px", height: "250px" }}></img> */}
                            </div>
                            <h3 id={"callername"+value}> {this.state.players[value] ? this.state.players[value].name : "no name"}</h3>
                        </Col> 
                    )
                })}
            </Row>
            <Row>
                { arr3.map((value, index) => {
                    return(      
                        <Col>         
                            <div id={"videoremote"+(value)} className="container">
                                {/* <img src={offline} id="img1" className="card-media-image" style={{ width: "300px", height: "250px" }}></img> */}
                            </div>
                            <h3 id={"callername"+value}> {this.state.players[value] ? this.state.players[value].name : "no name"}</h3>
                        </Col> 
                    )
                })}
            </Row>

        </Container>
        )
    }

    teamtemplate(){
        return(
            <Container>
                <Col>
                    { teamA.map((value, index) => {
                        return(                
                        <Row>
                            <div id={"videoremote"+(value+1)} className="container">
                                {/* <img src={offline} id="img1" className="card-media-image" style={{ width: "300px", height: "250px" }}></img> */}
                            </div>
                            <h3 id="callername">{GlobalPeopleID[value].name ? GlobalPeopleID[value]  : 'participant'+{value}}</h3>
                        </Row>)
                    })}
                </Col>
                <Col>
                    { teamB.map((value, index) => {
                        return(                
                        <Row>
                            <div id={"videoremote"+(value+1)} className="container">
                                {/* <img src={offline} id="img1" className="card-media-image" style={{ width: "300px", height: "250px" }}></img> */}
                            </div>
                            <h3 id="callername">{GlobalPeopleID[value] ? GlobalPeopleID[value].name : 'participant'+{value}}</h3>
                        </Row>)
                    })}
                    
                </Col>
                
            </Container>
        )
    }
    


    render(){
        console.log('all people here');
        console.log(GlobalPeopleID);
        console.log(feeds)
        console.log('A team')
        console.log(arrayA)
        console.log('B team')
        console.log(arrayB)
        console.log($('#callername0'));
        console.log(userName);
        var test = this;
        // this.state.changePlayers(GlobalPeopleID)
        // $('#callername1').innerHTML = {userName}
        // $('#callername1').focus()
        // this.state = {...this.props};
        // console.log(this.state

        return(
        <div className="App">
        <header className="App-header">
        
            {/* <div>
                <button id="A"  onClick={this.changeTeam("A")} width="10%" margin-right="100px"> Join </button>
                <button id="B"  onClick={this.changeTeam("B")} width="10%"> Join </button> 
            </div> */}

            <Container class="teams">
                <Row>
                    <Col>  <h1> Team A</h1> </Col> <Col>  <h1> Team B</h1></Col>
                </Row>
                
                <Row>

                    <Col><button id="A"  onClick={this.changeTeam}> Join </button> </Col>
                    <Col><button id="B"  onClick={this.changeTeam}> Join </button> </Col>

                </Row>
                <Row>
                    <Col><p id="Ateam1">""</p></Col>
                    <Col><p id="Bteam1">""</p></Col>
                </Row>
                <Row>
                    <Col><p id="Ateam2">""</p></Col>
                    <Col><p id="Bteam2">""</p></Col>
                </Row>
                <Row>
                    <Col><p id="Ateam3">""</p></Col>
                    <Col><p id="Bteam3">""</p></Col>
                </Row>
            </Container>
            <div id="myvideo" className="container shorter">
                <video id="localvideo" className="rounded centered" width="5%" height="5%" autoPlay playsInline muted="muted"></video>
            </div>
        </header>
            <p width="100%" height="100%">
                <code>guessture</code> video room, Name = {this.state.name} , room = {this.state.room}
            </p>
                {this.teamtemplate2()}

        </div>

        )
    }
}

export default Game;