/*
    sample codes for getting the word and update the correct rate of the word
*/
import React, {Component} from "react";
import axios from "axios";

export default class Word extends Component{
    constructor() {
        super();
        this.state = {
            word: String,
            update_result: String
        }
    }

    // this method executes before the first rendering
    componentDidMount(){

        // get random word from db
        axios.get("https://www.seattle8520.xyz/api/getRandomWord").then(res =>{
            console.log(res);
            this.setState({
                // the generated word is stored in `res.data.item`
                word: res.data.item
            });
        });

        // update correct rate with input: word and correct (1 or 0)
        var word = "rose";
        var correct = 1;
        axios.put(`https://www.seattle8520.xyz/api/updateCorrectRate?word=${word}&correct=${correct}`).then(res=>{
            console.log(res);
            this.setState({
                update_result: res.data.message
            });
        });
    }

    render(){
    return (<div><p>Generated word: {this.state.word}</p><p>Udpate result: {this.state.update_result}</p></div>);
    }
}
