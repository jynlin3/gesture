import React from 'react';

import './App.css';
import Room from './components/Room'; // remove room in the future
import Game from './components/Game';
import Home from './components/Home';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom'

class App extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
        <Router>
          <div className="main-container">
            <React.Fragment>
              <Switch>
                <Route path="/" exact component={Home} />
                <Route path="/room" component={Room} />
                <Route path="/game" component={Game} />
              </Switch>
            </React.Fragment>
          </div>
        </Router>)
  }
}

export default App;