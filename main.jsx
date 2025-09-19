import React from 'react'
import ReactDOM from 'react-dom/client'
// Korrektur: 'App' wird jetzt als Standard-Export importiert
import App from './App.jsx' 
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

