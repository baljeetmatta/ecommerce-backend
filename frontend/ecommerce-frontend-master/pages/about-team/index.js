import React from "react";
import { Container, Row, Col } from "reactstrap";
import person1 from "public/images/e-commerce/team/person1.jpg";
import person2 from "public/images/e-commerce/team/person2.jpg";
import person3 from "public/images/e-commerce/team/person3.jpg";
import person4 from "public/images/e-commerce/team/person4.jpg";
import person5 from "public/images/e-commerce/team/person5.jpg";
import person6 from "public/images/e-commerce/team/person6.jpg";
import person7 from "public/images/e-commerce/team/person7.jpg";
import person8 from "public/images/e-commerce/team/person8.jpg";
import googleImg from "public/images/e-commerce/team/google.svg";
import facebookImg from "public/images/e-commerce/team/facebook.svg";
import behanceImg from "public/images/e-commerce/team/behance.svg";
import InstagramWidget from 'components/e-commerce/Instagram';
import s from './Team.module.scss';

import Head from "next/head";

const Index = () => {
  return (
    <>
      <Head>
        <title>About Team</title>
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
      <Container className={"mb-5"} style={{ marginTop: 32 }}>
        <Row>
          <Col xs={12}>
            <h3 className={"fw-bold"}>
              Meet the team who dares to create differently.
            </h3>
          </Col>
        </Row>
        <Row className={"mt-5"}>
          <Col lg={3} md={4} sm={6} xs={12}>
            <img className={s.img} src={person1} />
            <h6 className={"fw-bold text-center mt-3"}>Andreas Walter</h6>
            <p className={"text-muted text-center"}>
            CEO / Art & Creative Manager
            </p>
            <div
              className={"d-flex justify-content-center"}
              style={{ marginBottom: 33 }}
            >
              <img src={googleImg} className={"mr-4"} />
              <img src={facebookImg} className={"mr-4"} />
              <img src={behanceImg} />
            </div>
          </Col>
          <Col lg={3} md={4} sm={6} xs={12}>
            <img className={s.img} src={person2} />
            <h6 className={"fw-bold text-center mt-3"}>Phoenix Houston</h6>
            <p className={"text-muted text-center"}>
            Founder / World Traveler
            </p>
            <div
              className={"d-flex justify-content-center"}
              style={{ marginBottom: 33 }}
            >
              <img src={googleImg} className={"mr-4"} />
              <img src={facebookImg} className={"mr-4"} />
              <img src={behanceImg} />
            </div>
          </Col>
          <Col lg={3} md={4} sm={6} xs={12}>
            <img className={s.img} src={person3} />
            <h6 className={"fw-bold text-center mt-3"}>Maria Lennon </h6>
            <p className={"text-muted text-center"}>
            Design Consultant
            </p>
            <div
              className={"d-flex justify-content-center"}
              style={{ marginBottom: 33 }}
            >
              <img src={googleImg} className={"mr-4"} />
              <img src={facebookImg} className={"mr-4"} />
              <img src={behanceImg} />
            </div>
          </Col>
          <Col lg={3} md={4} sm={6} xs={12}>
            <img className={s.img} src={person4} />
            <h6 className={"fw-bold text-center mt-3"}>John-James Mosley</h6>
            <p className={"text-muted text-center"}>
            Digital Marketing Guru
            </p>
            <div
              className={"d-flex justify-content-center"}
              style={{ marginBottom: 33 }}
            >
              <img src={googleImg} className={"mr-4"} />
              <img src={facebookImg} className={"mr-4"} />
              <img src={behanceImg} />
            </div>
          </Col>
          <Col lg={3} md={4} sm={6} xs={12}>
            <img className={s.img} src={person5} />
            <h6 className={"fw-bold text-center mt-3"}>Daryl Peters </h6>
            <p className={"text-muted text-center"}>
            Director of Operations
            </p>
            <div
              className={"d-flex justify-content-center"}
              style={{ marginBottom: 33 }}
            >
              <img src={googleImg} className={"mr-4"} />
              <img src={facebookImg} className={"mr-4"} />
              <img src={behanceImg} />
            </div>
          </Col>
          <Col lg={3} md={4} sm={6} xs={12}>
            <img className={s.img} src={person6} />
            <h6 className={"fw-bold text-center mt-3"}>Arianne Savage</h6>
            <p className={"text-muted text-center"}>
            Project Manager / Technical Lead
            </p>
            <div
              className={"d-flex justify-content-center"}
              style={{ marginBottom: 33 }}
            >
              <img src={googleImg} className={"mr-4"} />
              <img src={facebookImg} className={"mr-4"} />
              <img src={behanceImg} />
            </div>
          </Col>
          <Col lg={3} md={4} sm={6} xs={12}>
            <img className={s.img} src={person7} />
            <h6 className={"fw-bold text-center mt-3"}>Anisa Devine</h6>
            <p className={"text-muted text-center"}>
            Director of Showroom Design
            </p>
            <div
              className={"d-flex justify-content-center"}
              style={{ marginBottom: 33 }}
            >
              <img src={googleImg} className={"mr-4"} />
              <img src={facebookImg} className={"mr-4"} />
              <img src={behanceImg} />
            </div>
          </Col>
          <Col lg={3} md={4} sm={6} xs={12}>
            <img className={s.img} src={person8} />
            <h6 className={"fw-bold text-center mt-3"}>Ashwin Chaney</h6>
            <p className={"text-muted text-center"}>
            Customer Service Manager
            </p>
            <div
              className={"d-flex justify-content-center"}
              style={{ marginBottom: 33 }}
            >
              <img src={googleImg} className={"mr-4"} />
              <img src={facebookImg} className={"mr-4"} />
              <img src={behanceImg} />
            </div>
          </Col>
        </Row>
      </Container>
      <InstagramWidget />
    </>
  );
};

export async function getServerSideProps(context) {
  // const res = await axios.get("/products");
  // const products = res.data.rows;

  return {
    props: {  }, // will be passed to the page component as props
  };
}

export default Index;
