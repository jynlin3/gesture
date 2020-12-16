
import React from 'react';
import {Link} from "react-router-dom";

class Entry extends React.Component {
    
    constructor(props) {
        super(props);
        // this.props = {...props};
        this.state = {...props};
        console.log(this.props)
        this.handleJoinRoom = this.handleJoinRoom.bind(this);
        // this.props.changeRoom(this.randomInt(1000000,10000000000));
        console.log(this.state);
    }

    
    handleJoinRoom() {
        this.props.history.push('/entry');
    }

    update(e){
        this.props.changeName(e.target.value);
    }


    _handleKeyUp =(e) =>{
        if(e.key==='Enter' || e.keyCode === 13){
            console.log("Hi")
            document.getElementById("CreateRoom").click();
        }
    }
    
    
    render(){
        this.state = {...this.props};
        console.log(this.state)
        return(
            <form>
                <label for="name"> Name: </label>
                <input type="text" onKeyPress={this._handleKeyUp.bind(this)} onChange={this.update.bind(this)}  placeholder="Type your Name" />
                <Link to={`/game/${this.props.room}`} name={this.state.name} room={this.state.room} id="CreateRoom" className="btn btn-link">create new room</Link>
            </form>
        )
    }


}
export default Entry;