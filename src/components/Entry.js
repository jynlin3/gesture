
import React from 'react';
import {Link} from "react-router-dom";

class Entry extends React.Component {
    
    constructor(props) {
        super(props);
        // this.props = {...props};
        console.log(this.props)
        this.handleJoinRoom = this.handleJoinRoom.bind(this);
        // this.props.changeRoom(this.randomInt(1000000,10000000000));
        console.log(this.props);
    }
    
    // componentDidMount(){
    //     const {room} = this.props.match.params;
    // }

    // changeName = newName => this.setState({name: newName})
    

    
    handleJoinRoom() {
        this.props.history.push('/entry');
    }

    update(e){
        this.props.changeName(e.target.value);
    }
    createRoom(e){

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
                <input type="text" onChange={this.update.bind(this)} placeholder="Type your Name" />
                <Link to={`/game/${this.props.room}`} className="btn btn-link">create new room</Link>
            </form>
        )
    }


}
export default Entry;