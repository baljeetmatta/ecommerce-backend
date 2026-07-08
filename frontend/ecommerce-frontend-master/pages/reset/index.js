import React from "react";
import PropTypes from "prop-types";
import {withRouter} from 'next/router'
import Link from 'next/link'
import { connect } from "react-redux";
import { Alert, Button, Container } from "reactstrap";
import Widget from "components/admin/Widget";
import { authError, resetPassword } from "redux/actions/auth";
import Head from 'next/head';

class Index extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      password: "",
      confirmPassword: "",
    };

    this.changePassword = this.changePassword.bind(this);
    this.changeConfirmPassword = this.changeConfirmPassword.bind(this);
    this.checkPassword = this.checkPassword.bind(this);
    this.isPasswordValid = this.isPasswordValid.bind(this);
    this.doReset = this.doReset.bind(this);
  }

  changePassword(event) {
    this.setState({ password: event.target.value });
  }

  changeConfirmPassword(event) {
    this.setState({ confirmPassword: event.target.value });
  }

  checkPassword() {
    if (!this.isPasswordValid()) {
      if (!this.state.password) {
        this.props.dispatch(authError("Password field is empty"));
      } else {
        this.props.dispatch(authError("Passwords are not equal"));
      }
      setTimeout(() => {
        this.props.dispatch(authError());
      }, 3 * 1000);
    }
  }

  isPasswordValid() {
    return (
      this.state.password && this.state.password === this.state.confirmPassword
    );
  }

  doReset(e) {
    e.preventDefault();
    const search = typeof window !== 'undefined' && window.location.search;
    const params = new URLSearchParams(search);
    const token = params.get("token");
    if (!token) {
      authError("There are no token");
    }

    if (!this.isPasswordValid()) {
      this.checkPassword();
    } else {
      this.props.dispatch(resetPassword(token, this.state.password));
    }
  }

  render() {
    return (
      <>
      <Head>
        <title>Register | Ecommerce</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />

        <meta name="description" content={'Beautifully designed web application template built with React and Bootstrap to create modern apps and speed up development'}  />
        <meta name="keywords" content={"flatlogic, react templates"} />
        <meta name="author" content={"Flatlogic LLC."} />
        <meta charSet="utf-8" />


        <meta property="og:title" content={"Flatlogic - React, Vue, Angular and Bootstrap Templates and Admin Dashboard Themes"} />
        <meta property="og:type" content="website"/>
        <meta property="og:url" content={"https://flatlogic-ecommerce.herokuapp.com/"} />
        <meta property="og:image" content={"https://flatlogic-ecommerce-backend.herokuapp.com/images/blogs/content_image_six.jpg"} />
        <meta property="og:description" content={'Beautifully designed web application template built with React and Bootstrap to create modern apps and speed up development'} />
        <meta name="twitter:card" content="summary_large_image" />

        <meta property="fb:app_id" content={"712557339116053"} />

        <meta property="og:site_name" content={"Flatlogic"} />
        <meta name="twitter:site" content={"@flatlogic"} />
      </Head>
      <div className="auth-page">
        <Container>
          <h5 className="auth-logo">
            <i className="la la-circle text-gray" />
            Flatlogic Ecommerce
            <i className="la la-circle text-warning" />
          </h5>
          <Widget
            className="widget-auth mx-auto text-center"
            title={<h3 className="mt-0">Reset password</h3>}
          >
            <p className="widget-auth-info">Please fill all fields below</p>
            <form className="mt" onSubmit={this.doReset}>
              {this.props.errorMessage && (
                <Alert className="alert-sm" color="danger">
                  {this.props.errorMessage}
                </Alert>
              )}
              <div className="form-group">
                <input
                  className="form-control no-border"
                  value={this.state.password}
                  onChange={this.changePassword}
                  type="password"
                  required
                  name="password"
                  placeholder="Password"
                />
              </div>
              <div className="form-group">
                <input
                  className="form-control no-border"
                  value={this.state.confirmPassword}
                  onChange={this.changeConfirmPassword}
                  onBlur={this.checkPassword}
                  type="password"
                  required
                  name="confirmPassword"
                  placeholder="Confirm"
                />
              </div>
              <Button
                type="submit"
                color={"primary"}
                className="auth-btn mb-3"
                size="sm"
              >
                {this.props.isFetching ? "Loading..." : "Index"}
              </Button>
            </form>
            <p className="widget-auth-info mt-5">or</p>
            <Link href="/login">
              <a className="d-block text-center">
                Enter the account
              </a>
            </Link>
          </Widget>
        </Container>
        <footer className="auth-footer">
          {new Date().getFullYear()} &copy; React Ecommerce.
        </footer>
      </div>
      </>
    );
  }
}

export async function getServerSideProps(context) {
  // const res = await axios.get("/products");
  // const products = res.data.rows;

  return {
    props: {  }, // will be passed to the page component as props
  };
}

function mapStateToProps(state) {
  return {
    isFetching: state.auth.isFetching,
    errorMessage: state.auth.errorMessage,
  };
}

export default withRouter(connect(mapStateToProps)(Index));
