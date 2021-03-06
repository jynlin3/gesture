const initialState = {
    round: 1,
    question: "Birthday"
};

const reducer = (state = initialState, action) => {
    const newState = {...state};

    if (action.type === 'Next round'){  
        newState.round = newState.round + 1;
        newState.question = newState.question;
    }
    return newState;
}

export default reducer;
