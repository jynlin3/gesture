# gesture videoroom React App Hack

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

**Important Note:**
It has been directly merged reusing most of the code from the Janus video room [demo](https://github.com/meetecho/janus-gateway/blob/master/html/videoroomtest.js), including jQuery!

Next step will be to refactor it to use React full potential, fix multiple bugs when connecting/reconnecting participants and get rid of jQuery.

## Available Scripts

In the project directory, you can run:

### `npm install`
Install dependencies for client.

### `npm run backend-install`
Install dependencies for backend server.

### `npm run dev`
Run the client & server with concurrently.

### `npm run backend`
Run the backend server only.

### `yarn start`

Runs the client only.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Connect to Janus server
### Local Janus server
1. Install docker and docker-compose. (If your machine is Windows and has WSL1, follow instructions [here](https://nickjanetakis.com/blog/setting-up-docker-for-windows-and-wsl-to-work-flawlessly)).
2. Clone the github repository of [Janus WebRTC Media Server Docker container](https://github.com/agonza1/Janus-webrtc-server-container).
3. Build the image

    `docker build -t janus-server .`
4. Run the container

    `docker-compose up`

### Remost Janus server
1. Put `config.json` under `src/components`.