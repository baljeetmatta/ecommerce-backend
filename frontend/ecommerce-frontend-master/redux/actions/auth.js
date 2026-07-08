import axios from "axios";
import config from "constants/config";
import jwt from "jsonwebtoken";
import { toast } from "react-toastify";
import Errors from "components/admin/FormItems/error/errors";
import Router from 'next/router';

export const AUTH_FAILURE = "AUTH_FAILURE";
export const LOGIN_REQUEST = "LOGIN_REQUEST";
export const LOGIN_SUCCESS = "LOGIN_SUCCESS";
export const LOGOUT_REQUEST = "LOGOUT_REQUEST";
export const LOGOUT_SUCCESS = "LOGOUT_SUCCESS";
export const RESET_REQUEST = "RESET_REQUEST";
export const RESET_SUCCESS = "RESET_SUCCESS";
export const PASSWORD_RESET_EMAIL_REQUEST = "PASSWORD_RESET_EMAIL_REQUEST";
export const PASSWORD_RESET_EMAIL_SUCCESS = "PASSWORD_RESET_EMAIL_SUCCESS";
export const AUTH_INIT_SUCCESS = "AUTH_INIT_SUCCESS";
export const AUTH_INIT_ERROR = "AUTH_INIT_ERROR";
export const REGISTER_REQUEST = "REGISTER_REQUEST";
export const REGISTER_SUCCESS = "REGISTER_SUCCESS";

async function findMe() {
  const response = await axios.get("/auth/me");
  return response.data;
}

export function authError(payload) {
  return {
    type: AUTH_FAILURE,
    payload,
  };
}

export function doInit() {
  return async (dispatch) => {
    try {
      let currentUser = null;
      let token = typeof window !== 'undefined' && localStorage.getItem("token");
      if (token) {
        currentUser = await findMe();
      }
      dispatch({
        type: AUTH_INIT_SUCCESS,
        payload: {
          currentUser,
        },
      });
    } catch (error) {
      Errors.handle(error);

      dispatch({
        type: AUTH_INIT_ERROR,
        payload: error,
      });
    }
  };
}

export function logoutUser() {
  return (dispatch) => {
    dispatch({
      type: LOGOUT_REQUEST,
    });
    typeof window !== 'undefined' && localStorage.removeItem("token");
    typeof window !== 'undefined' && localStorage.removeItem("user");
    axios.defaults.headers.common["Authorization"] = "";
    dispatch({
      type: LOGOUT_SUCCESS,
    });
  };
}

export function receiveToken(token) {
  return (dispatch) => {
    let user = jwt.decode(token);

    typeof window !== 'undefined' && localStorage.setItem("token", token);
    typeof window !== 'undefined' && localStorage.setItem("user", JSON.stringify(user));
    axios.defaults.headers.common["Authorization"] = "Bearer " + token;
    dispatch({
      type: LOGIN_SUCCESS,
    });
    if (typeof window !== 'undefined') { window.location.href = "/admin/dashboard" } 
  };
}

export function loginUser(creds) {
  return (dispatch) => {
    dispatch({
      type: LOGIN_REQUEST,
    });
    if (creds.social) {
      window.location.href = config.baseURLApi + "/auth/signin/" + creds.social;
    } else if (creds.email.length > 0 && creds.password.length > 0) {
      axios
        .post("/auth/signin/local", creds)
        .then((res) => {
          const token = res.data;
          dispatch(receiveToken(token));
          dispatch(doInit());
          if (typeof window !== 'undefined') { window.location.href = "/admin/dashboard" } 
        })
        .catch((err) => {
          console.log(err.response);
          dispatch(authError(err.response));
        });
    } else {
      dispatch(authError("Something was wrong. Try again"));
    }
  };
}

export function verifyEmail(token) {
  return (dispatch) => {
    console.log(token, 'TIOKEN')
    axios
      .put("/auth/verify-email", { token })
      .then((verified) => {
        if (verified) {
          toast.success("Your email was verified");
        }
      })
      .catch((err) => {
        toast.error(err.response.data);
      })
      .finally(() => {
         if (typeof window !== 'undefined') { window.location.href = "/login" }
      });
  };
}

export function resetPassword(token, password) {
  return (dispatch) => {
    dispatch({
      type: RESET_REQUEST,
    });
    axios
      .put("/auth/password-reset", { token, password })
      .then((res) => {
        dispatch({
          type: RESET_SUCCESS,
        });
        toast.success("Password has been updated");
         if (typeof window !== 'undefined') { window.location.href = "/login" }
      })
      .catch((err) => {
        dispatch(authError(err.response.data));
      });
  };
}

export function sendPasswordResetEmail(email) {
  return (dispatch) => {
    dispatch({
      type: PASSWORD_RESET_EMAIL_REQUEST,
    });
    axios
      .post("/auth/send-password-reset-email", { email })
      .then((res) => {
        dispatch({
          type: PASSWORD_RESET_EMAIL_SUCCESS,
        });
        toast.success("Email with resetting instructions has been sent");
         if (typeof window !== 'undefined') { window.location.href = "/login" }
      })
      .catch((err) => {
        dispatch(authError(err.response.data));
      });
  };
}

export function registerUser(creds) {
  return (dispatch) => {
    dispatch({
      type: REGISTER_REQUEST,
    });
    console.log('sdf')
    if (creds.email.length > 0 && creds.password.length > 0) {
      axios
        .post("/auth/signup", creds)
        .then((res) => {
          dispatch({
            type: REGISTER_SUCCESS,
          });
          toast.success(
            "You've been registered successfully. Please check your email for verification link"
          );
           if (typeof window !== 'undefined') { window.location.href = "/login" }
        })
        .catch((err) => {
          dispatch(authError(err.response.data));
        });
    } else {
      dispatch(authError("Something was wrong. Try again"));
    }
  };
}
