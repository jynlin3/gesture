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
                dependencies: Janus.UseDefaultDependencies(),
                callback: function(){
                    var gestureGameroom = new Janus(
                        {
                            server: server,
                            success: function(){
                                console.log('hi Jyn, I;m in the server')
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
            <p> Wait a second</p>

        )
    }
}

export default Game;