import React, { Component } from "react";
import ChangePasswordForm from "./ChangePasswordForm";
import actions from "redux/actions/password";
import { withRouter } from 'next/router';
import { connect } from "react-redux";
import Head from 'next/head';

class Index extends Component {
  state = {
    dispatched: false,
  };

  doSubmit = (data) => {
    const { dispatch } = this.props;
    dispatch(actions.doChangePassword(data));
  };

  render() {
    return (
      <React.Fragment>
        <Head>
          <title>Edit Password</title>
          <meta name="viewport" content="initial-scale=1.0, width=device-width" />

          <meta name="description" content="Beautifully designed web application template built with React and Bootstrap to create modern apps and speed up development" />
          <meta name="keywords" content="flatlogic, react templates" />
          <meta name="author" content="Flatlogic LLC." />
          <meta charSet="utf-8" />


          <meta property="og:title" content="Flatlogic - React, Vue, Angular and Bootstrap Templates and Admin Dashboard Themes"/>
          <meta property="og:type" content="website"/>
          <meta property="og:url" content="https://flatlogic-ecommerce.herokuapp.com/"/>
          <meta property="og:image" content="https://flatlogic-ecommerce-backend.herokuapp.com/images/blogs/content_image_six.jpg"/>
          <meta property="og:description" content="Beautifully designed web application template built with React and Bootstrap to create modern apps and speed up development"/>
          <meta name="twitter:card" content="summary_large_image" />

          <meta property="fb:app_id" content="712557339116053" />

          <meta property="og:site_name" content="Flatlogic"/>
          <meta name="twitter:site" content="@flatlogic" />
        </Head>
        <ChangePasswordForm
          saveLoading={this.props.saveLoading}
          findLoading={this.props.findLoading}
          onSubmit={this.doSubmit}
          onCancel={() => this.props.router.push("/app/dashboard")}
        />
      </React.Fragment>
    );
  }
}

function mapStateToProps(store) {
  return {
    findLoading: store.users.form.findLoading,
    saveLoading: store.users.form.saveLoading,
  };
}

export async function getServerSideProps(context) {
  // const res = await axios.get("/products");
  // const products = res.data.rows;

  return {
    props: {  }, // will be passed to the page component as props
  };
}

export default connect(mapStateToProps)(withRouter(Index));
