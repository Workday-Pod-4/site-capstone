import * as React from "react";
import { Link } from "react-router-dom";
import LoginForm from "./LoginForm"
import "./LoginPage.css"

export default function LoginPage() {
  
  return (
    <div className="login-page">
      <div className="card">
        <h2>Login</h2>
        <LoginForm />
        <div className="footer">
          <p>
            Don't have an account? Sign up
            <Link to="/register"> here.</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
