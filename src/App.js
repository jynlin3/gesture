import React, {useState} from 'react';
import './App.css';
import Room from './components/Room'; // remove room in the future
import Entry from './components/Entry';
import Home from './components/Home';
import Game from './components/Game';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'

class App extends React.Component {
  
  changeName = newName => this.setState({ name: newName });
  changeSessionID = newSessionID => this.setSession({sessionID: newSessionID});


  constructor(props) {
    super(props);
    this.state ={ name : "debo" , sessionID: undefined };
  }

  render() {
    return (
        <Router>
          <div className="main-container">
            <React.Fragment>
              <Switch>
                <Route path="/" exact component={Home} />
                <Route path="/room" component={Room} />
                <Route path="/entry" render={()=> <Entry name={this.state.name} changeName={this.changeName} />} />
                <Route path="/game" render={()=><Game name= {this.state.name} changeSessionID={this.changeSessionID} />} />
              </Switch>
            </React.Fragment>
          </div>
        </Router>)
  }
}

export default App;