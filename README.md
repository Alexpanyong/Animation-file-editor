# Animation File Editor - README

This is a Lottie animation editor built with React, Redux, TypeScript, and Tailwind CSS. It allows users to upload and edit Lottie JSON files, manipulate animation properties, manage layers, and collaborate with others in real-time.

## Features

- **Upload Lottie JSON Files:** Easily import Lottie animations for editing.
- **Edit Layer Properties:** Modify properties like opacity, position, scale, and rotation.
- **Timeline Scrubbing:** Preview the animation by dragging the scrubber on the timeline.
- **Layer Management:** Add, delete, and reorder layers in the animation.
- **Real-time Collaboration:** Multiple users can edit the same animation simultaneously using WebSockets.

## Project Structure

src/ \
├── components/ \
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── AnimationCanvas.tsx      &nbsp;&nbsp;&nbsp;// Renders the Lottie animation \
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── Editor.tsx               &nbsp;&nbsp;&nbsp;// Main editor component \
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── FileUpload.tsx           &nbsp;&nbsp;&nbsp;// Handles Lottie JSON file uploads \
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── PropertiesPanel.tsx      &nbsp;&nbsp;&nbsp;// Edits layer properties \
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── Timeline.tsx             &nbsp;&nbsp;&nbsp;// Displays and manages the timeline \
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── WebSocketProvider.tsx    &nbsp;&nbsp;&nbsp;// Provides WebSocket connection context \
├── server/                      &nbsp;&nbsp;&nbsp;// Backend WebSocket server \
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── server.js \
├── store/ \
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── animationSlice.ts        &nbsp;&nbsp;&nbsp;// Redux slice for animation state \
   &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── store.ts                 &nbsp;&nbsp;&nbsp;// Redux store configuration \
├── types.ts                     &nbsp;&nbsp;&nbsp;// TypeScript interfaces for data models \
├── App.css                      &nbsp;&nbsp;&nbsp;// Global styles \
├── App.tsx                      &nbsp;&nbsp;&nbsp;// Root component \
├── index.css                    &nbsp;&nbsp;&nbsp;// Index styles \
└── index.tsx                   &nbsp;&nbsp;&nbsp;// Entry point

## Technologies Used

- **Frontend:** React, Redux Toolkit, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, WebSocket (ws library)

## State Management

- **Redux Toolkit:** Manages the application state, including the current animation data, scrubber position, selected layer, and other relevant information.
- **Actions:** Define actions to update the state (e.g., `setAnimation`, `updateLayerProperty`, `removeLayer`).
- **Reducers:** Handle the actions and update the state accordingly.
- **Selectors:** Extract specific parts of the state for use in components.

## Real-Time Collaboration

- **WebSockets:** Enables real-time communication between multiple users editing the same animation.
- **Server (server.js):**
  - Handles WebSocket connections and messages.
  - Broadcasts changes to all connected clients.
- **Client (WebSocketProvider.tsx):**
  - Establishes a WebSocket connection.
  - Sends messages to the server when actions occur.
  - Receives messages from the server and updates the Redux store.

## Getting Started

1. **Clone the repository:** `git clone <repository-url>`
2. **Install dependencies:** `npm install`
3. **Start the frontend:** `npm start`
4. **Start the backend:** `node server/server.js` (in a separate terminal)

## Future Enhancements

- **More Property Controls:** Add support for editing more Lottie properties.
- **Interactive Properties:** Implement visual interactions for adjusting position, scale, etc.
- **Layer Visibility:** Allow toggling layer visibility.

## License

This project is licensed under the MIT License.
