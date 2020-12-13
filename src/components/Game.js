import React from 'react';
import {withRouter} from 'react-router-dom';
import Janus from './Janus';
let server;
let sessionID;


try{
    server = require('./config.json').janusServer;
}catch(err){
    console.log(err);
    // server = "http://localhost:8088/janus";
}



class Game extends React.Component{

    
    constructor(props){
        super(props);
        this.props = props;
        this.state = {...props};
        
    };



    update(e){
        this.props.changeSessionID(e.target.value);
    }

    componentDidMount(){
        this.GameServerRoomStart();
        
        var check = ()=>{
            
            if( sessionID !== undefined){
                
                console.log("Fuck I got you")
                console.log(sessionID)
                this.state = {sessionID: sessionID};
                console.log(this.state.sessionID);
                this.props.history.push('/game/'+sessionID);
                
            }else{
                setTimeout(check, 1000);
            }
        }
        console.log('GIGIGIGIGIIGG')
        console.log(this.state.sessionID)
        
        check();
        
        // localStorage.removeItem("janusGame") 
        
    }
    
    GameServerRoomStart(){
        Janus.init(
            {
                debug: true,
                dependencies: Janus.UseDefaultDependencies(),
                callback: function(){
                    var gestureGameroom = new Janus(
                        {
                            server: server,
                            success: function(){
                                console.log("hi Jyn, I'm in the server");
                                
                                gestureGameroom.attach({
                                    plugin: "janus.plugin.videoroom",
                                    success: function(){
                                        //todo
                                        console.log(typeof(gestureGameroom.getSessionId()))
                                        console.log('sessionID =' + gestureGameroom.getSessionId())
                                        sessionID = gestureGameroom.getSessionId();
                                        
                                        
                                        
                                    },
                                    error : function(){
                                        //todo
                                    },
                                    consentDialog: function(){
                                        //todo
                                    },
                                    onmessage: function(){
                                        //todo
                                    },
                                    onlocalstream: function(){
                                        // top priority
                                    },
                                    onremotestream: function(){
                                        // second priority
                                    },
                                    oncleanup: function(){
                                        // todo
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
                                console.log('destroyed');
                            }
                        }
                    );
                }
            }
        );
        


    }


    render(){
        const {history} = this.props;

        return(
            (history.sessionID !== undefined ) ?
        <p> Wait a second, {this.props.name}, {sessionID}, {this.state.sessionID}</p>
        :
        <p>Just wait </p>
        )
    }
}

export default withRouter(Game);