import React from 'react';
import PlantTracker from './components/PlantTracker';
import './App.css';

// Your backend URL - change this to your teammate's Cloud Run URL once deployed
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

function App() {
  return <PlantTracker />;
}

export default App;
