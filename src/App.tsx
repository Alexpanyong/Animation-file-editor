import React from 'react';
import { Provider } from "react-redux";
import store from "./store/store";
import Editor from './components/Editor';
import './App.scss';

function App() {
  return (
    <Provider store={store}>
      <>
        <div className="app-title px-4 mb-4 text-3xl font-bold">Lottie animation editor</div>
        <div className="app-container">
          <Editor />
        </div>
      </>
    </Provider>
  );
}

export default App;
