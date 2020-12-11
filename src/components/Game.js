
import React from 'react';
class Game extends React.Component {
    constructor(props) {
            super(props);
            this.handleJoinRoom = this.handleJoinRoom.bind(this);
    }

    handleJoinRoom() {
        this.props.history.push('/game');
    }

    getUserMedia(stream){
        var video = document.querySelector('video');
        video.srcObject = stream;

    }

    createRoom(){
        var wait = null;
    }

    render(){
        return(
            <form>
                <label for="name"> Name: </label>
                <input type="text" id="name" name="name"/><br></br>
                <button onclick={this.createRoom}> Create New Room </button>
            </form>
        )
    }
}
export default Game;