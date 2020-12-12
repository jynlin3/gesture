import React from 'react';
import Janus from './Janus';
let server;

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
        // console.log('props is empty')
        console.log(this.props)
    };

    componentDidMount(){
        this.GameServerRoomStart();
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
                                console.log('hi Jyn, I;m in the server')
                                console.log(this.props)
                                gestureGameroom.attach({
                                    plugin: "janus.plugin.videoroom",
                                    success: function(){
                                        //todo
                                        console.log(typeof(gestureGameroom.getSessionId()))
                                        // this.props.sessionID = gestureGameroom.getSessionId();
                                        console.log('sessionID =' + gestureGameroom.getSessionId())
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
        return(
        <p> Wait a second, {this.props.name}</p>
        )
    }
}

export default Game;