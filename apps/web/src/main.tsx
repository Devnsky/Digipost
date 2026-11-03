import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { AuthProvider } from "./lib/auth-context";
import { FeedbackProvider } from "./lib/feedback-context";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </AuthProvider>
  </React.StrictMode>,
);
