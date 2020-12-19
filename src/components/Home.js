import logo from "../images/logo.png";
import logo_2 from "../images/logo_2.png";
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
								
								<footer id="footer">
									<img src={logo_2} className="school-logo" alt="logo" style={{float : 'left', paddingRight : '1px'}}/>
									<p className="p3">
									Author:
									Fang-Chun Lin
									Yao-Chung Liang 
									Chia-Ning Lee
										
									</p>
								</footer>
						</div>
				)
		}
}

export default Home;