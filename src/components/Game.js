import React from 'react';
import Janus from './Janus';
let server;

try{
    server = require('./config.json').janusServer;
}catch(err){
    server = "http://localhost:8088/janus";
}


class Game extends React.Component{

    // constructor(props){
    //     super(props);
    // };

    componentDidMount(){
        this.GameServerRoomStart();
    }
    
    GameServerRoomStart(){
        Janus.init(
            {
                debug: true,
                success: function(){
                    // todo
                },
                error: function(){
                    // todo
                },
                destroyed:function(){
                    // todo
                }
            }
        );


    }
    // Janus.init({
    //     debug : "all",
    //     dependencies: Janus.useDefaultDependencies(), 
    //     callback: function() {
    //         var janus = new Janus(
    //             {
    //                 server : sever,
    //                 success: function(){
    //                     //todo
    //                 },
    //                 error: function(err){
    //                     //todo
    //                 },
    //                 destroyed: function(){

    //                 }
    //             });  
    //         //end of janus object
    //     };
    // })








    // state = {source:"http://35.233.252.164/janusbase/janus/game"}

    // componentDidMount(){
    //     navigator.mediaDevices.getUserMedia({ video: true, audio: true})
    //     .then(this.handleVideo)
    //     .catch(this.videoError)
    // }

    // handleVideo = (stream) =>{
    //     this.setState({
    //         source : window.URL.createObjectURL(stream)
    //     })
    // }

    // videoError = (err)=>{
    //     alert(err.name)
    //     console.log(err);
    // }

    render(){
        return(
            <p> Wait a second</p>
            // <video id="game" src={this.state.source} autoPlay ={true}> </video>
        )
    }
}

export default Game;