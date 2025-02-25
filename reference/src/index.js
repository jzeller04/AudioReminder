import React from "react"; // Use React to build the page
import ReactDOM from "react-dom/client"; // Get React's way to add things to the page
import "./index.css"; // Link the CSS for styling
import App from "./App"; // Get the App component from another file

const root = ReactDOM.createRoot(document.getElementById("root")); // Find the element with the id "root"
root.render(<App />); // Put the App inside the "root" element
