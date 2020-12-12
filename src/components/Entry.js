
import React from 'react';
import {Link} from "react-router-dom";

class Entry extends React.Component {

    constructor(props) {
        super(props);
        this.handleJoinRoom = this.handleJoinRoom.bind(this);

    }

    handleJoinRoom() {
        this.props.history.push('/entry');
    }

    getUserMedia(stream){
        
        var video = document.querySelector('video');
        video.srcObject = stream;
        

    }


    createRoom(e){

        // e.preventDefault();

        // console.log(this.id);
        // this.props.history.push('/game');
        return (
            <div>
              <Link to="/game" className="btn btn-primary">hello</Link>
           </div>
         ); 
    }

    render(){
        return(
            <form>
                <label for="name"> Name: </label>
                <input type="text" id="name" name="name"/><br></br>
                <Link to="/game" className="btn btn-link">create new room</Link>
            </form>
        )
    }


}
export default Entry;