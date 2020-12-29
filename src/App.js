import React, {useState} from 'react';
import './App.css';
import Room from './components/Room'; // remove room in the future
import Entry from './components/Entry';
import Home from './components/Home';
import Game from './components/Game';
import Word from './components/Word';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'
import logo from "../src/images/logo.png";
import logo_2 from "../src/images/logo_2.png";


class App extends React.Component {
  
  changeName = newName => this.setState({ name: newName });
  changeRoom = newRoom => this.setState( {room: newRoom})
  changePlayers = newPlayers => this.setState({ players: newPlayers})


  constructor(props) {
    super(props);
    this.state ={ name : "debo" , room: this.randomInt(1,8520), 
    players:[{id:null,name:'no participant'}, {id:null,name:'no participant'},{id:null,name:'no participant'},
              {id:null,name:'no participant'}, {id:null,name:'no participant'},{id:null,name:'no participant'}] };
    // this.changeRoom(this.randomInt(1000000,10000000000));
    console.log("roomID in App:" + this.state.room);
  }
  
  randomInt = (min, max) =>{
    return Math.floor(Math.random()* (max-min +1 )) + min;
  }


  render() {
    console.log(this.props)
    console.log(this.state)
    let room = this.state.room;
    return (
         <div>
          <Router>
            <div className="main-container">
              <React.Fragment>
                <Switch>
                  <Route exaxt path="/" exact component={Home} />
                  {/* <Route path="/room" component={Room} /> */}
                  <Route exact path="/entry" render={()=> <Entry name={this.state.name} room={this.state.room} changeName={this.changeName} changeRoom={this.changeRoom} />} />
                  <Route exact path="/game/:room" render={()=><Game name= {this.state.name} room={this.state.room}
                                                  changeRoom={this.changeRoom}  changeName={this.changeName}
                                                  players={this.state.players} changePlayers={this.changePlayers}/>} />
                  <Route exact path="/word" exact component={Word} />
                </Switch>
              </React.Fragment>
            </div>
          </Router>
         </div>
    )
  }
}

class Header extends React.Component {
   render() {
      return (
         <div>
            <h1>Header</h1>
         </div>
      );
   }
}
export default App;