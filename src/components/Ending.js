import React from 'react';

class Ending extends React.Component{
    constructor(props){
        this.state ={...props};
    }
    render(){
        if (this.state.score[0] > this.state.score[1]){
            return (
                <div>
                    <h1>
                        Team 1 wins!
                    </h1>
                </div>
            )
        }else if (this.state.score[0] < this.state.score[1]){
            return (
                <div>
                    <h1>
                        Team 2 wins!
                    </h1>
                </div>
            )
        }else{
            return(
                <div>
                    <h1>
                        Tie!!!!
                    </h1>
                </div>
            )
        }
    }
}

export default Ending;