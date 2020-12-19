import logo from "../images/logo.png";
import school_logo from "../images/school_logo.png";
import React from 'react';

class Home extends React.Component {
		constructor(props) {
				super(props);
				console.log(props)
				this.handleJoinRoom = this.handleJoinRoom.bind(this);
		}
		componentDidMount() {
		}

		handleJoinRoom() {
				this.props.history.push('/entry');
		}

		render() {
				return (
						<div className="App">
								<header className="App-header">
										<img src={logo} className="App-logo" alt="logo" />
										<p className="p2">
												Welcome to Online Guessture Game video room (powered by Janus).
										</p>
								</header>
								<button onClick={this.handleJoinRoom} className="button btn btn-link p2"> Join Room </button>
						</div>
				)
		}
}

export default Home;