import React from "react";
import PropTypes from "prop-types";
import {withRouter} from 'next/router'
import Link from 'next/link'
import { connect } from "react-redux";
import { Alert, Button, Container } from "reactstrap";
import Widget from "components/admin/Widget";
import Head from 'next/head';
import { sendPasswordResetEmail } from "redux/actions/auth";

class Index extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      email: "",
    };

    this.changeEmail = this.changeEmail.bind(this);
    this.doSendResetEmail = this.doSendResetEmail.bind(this);
  }

  changeEmail(event) {
    this.setState({ email: event.target.value });
  }

  doSendResetEmail(e) {
    e.preventDefault();
    this.props.dispatch(sendPasswordResetEmail(this.state.email));
  }

  render() {
    return (
      <>
        <Head>
          <title>Forgot password | Ecommerce</title>
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
              title={<h3 className="mt-0">Forgot password?</h3>}
            >
              <p className="widget-auth-info">Please fill your email below</p>
              <form className="mt" onSubmit={this.doSendResetEmail}>
                {this.props.errorMessage && (
                  <Alert className="alert-sm" color="danger">
                    {this.props.errorMessage}
                  </Alert>
                )}
                <div className="form-group">
                  <input
                    className="form-control no-border"
                    value={this.state.email}
                    onChange={this.changeEmail}
                    type="email"
                    required
                    name="email"
                    placeholder="Email"
                  />
                </div>
                <Button
                  type="submit"
                  color={"primary"}
                  className="auth-btn mb-3"
                  size="sm"
                >
                  {this.props.isFetching ? "Loading..." : "Send"}
                </Button>
              </form>
              <p className="widget-auth-info mt-5">Need to Login?</p>
              <Link className="d-block text-center" href="/login">
                Enter the account
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

function mapStateToProps(state) {
  return {
    isFetching: state.auth.isFetching,
    errorMessage: state.auth.errorMessage,
  };
}

export async function getServerSideProps(context) {
  // const res = await axios.get("/products");
  // const products = res.data.rows;

  return {
    props: {  }, // will be passed to the page component as props
  };
}

export default withRouter(connect(mapStateToProps)(Index));
