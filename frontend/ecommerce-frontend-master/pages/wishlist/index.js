import React from "react";
import { Container, Row, Col, Table, Button } from "reactstrap";
import close from "public/images/e-commerce/close.svg";

import InstagramWidget from 'components/e-commerce/Instagram';
import {useDispatch, useSelector} from "react-redux";
import axios from "axios";
import s1 from "./Wishlist.module.scss";
import Head from "next/head";
import {toast, ToastContainer} from "react-toastify";
import productsListActions from "../../redux/actions/products/productsListActions";
import InfoBlock from "components/e-commerce/InfoBlock";

const Cart = () => {
  const [test, setTest] = React.useState(false);
  const [products, setProducts] = React.useState([]);
  const currentUser = useSelector((store) => store.auth.currentUser);
  const dispatchStore = useDispatch()
  React.useEffect(() => {
    if (currentUser) {
      axios.get(`/users/${currentUser.id}`).then((res) => {
        res.data.wishlist.map((item) => {
          axios.get(`/products/${item.id}`).then((res) => {
            setProducts((prevState) => [...prevState, res.data]);
          });
        });
      });
    }
    if (localStorage.getItem("wishlist") && !currentUser) {
      JSON.parse(localStorage.getItem("wishlist")).map((item, index) => {
        axios.get(`/products/${item.product}`).then((res) => {
          setProducts((prevState) => [...prevState, res.data]);
        });
      });
    }
  }, [test]);

  const removeFromWishlist = (id) => {
    if (currentUser) {
      axios.put(`/users/${currentUser.id}`, {
        id: currentUser.id,
        data: {
          ...currentUser,
          wishlist: [],
        },
      });
      setTest(true);
    } else {
      typeof window !== 'undefined' && localStorage.removeItem("wishlist")
      setProducts([])
    }
  };

  const addToCart = (id) => {
    if (currentUser) {
      axios.post(`/orders/`, {
        data: {
          amount: 1,
          order_date: new Date(),
          product: id,
          status: "in cart",
          user: currentUser.id,
        },
      });
      return;
    }
    const localProducts =
        (typeof window !== "undefined" &&
            JSON.parse(localStorage.getItem("products"))) ||
        [];
    localProducts.push({
      amount: 1,
      order_date: new Date(),
      product: id,
      status: "in cart",
    });
    typeof window !== "undefined" &&
    localStorage.setItem("products", JSON.stringify(localProducts));
    dispatchStore(productsListActions.doAdd(localProducts))
    localStorage.removeItem("wishlist");
    setProducts([])
  };

  return (
    <>
      <Head>
        <title>Wishlist</title>
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
      <Container>
        <ToastContainer />
        <Row className={"mb-5"} style={{ marginTop: 32 }}>
          <Col xs={12} style={{ overflow: 'auto' }}>
            <h2 className={"fw-bold mt-4 mb-4"}>Wishlist</h2>
            <Table className={s1.wishListTable} borderless>
              <thead>
                <tr style={{ borderBottom: "1px solid #D9D9D9" }}>
                  <th className={"bg-transparent text-dark px-0"}>Product</th>
                  <th className={"bg-transparent text-dark px-0"}>Price</th>
                  <th className={"bg-transparent text-dark px-0"}>
                    Stock status
                  </th>
                  <th className={"bg-transparent text-dark px-0"} />
                  <th className={"bg-transparent text-dark px-0"} />
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <h5 className={"fw-bold mt-3"}>No items</h5>
                ) : (
                  <>
                    {products.map((item, index) => (
                      <tr className={"mt-2"}>
                        <td className={"px-0 pt-4"}>
                          <div className={"d-flex align-items-center"}>
                            <img
                              src={item.image[0].publicUrl}
                              width={100}
                              className={"mr-4"}
                            />
                            <div>
                              <h6 className={"text-muted"}>
                                {item.categories[0].title[0].toUpperCase() +
                                  item.categories[0].title.slice(1)}
                              </h6>
                              <h5 className={"fw-bold"}>{item.title}</h5>
                            </div>
                          </div>
                        </td>
                        <td className={"px-0 pt-4"}>
                          <h6 className={"fw-bold mb-0"}>${item.price}</h6>
                        </td>
                        <td className={"px-0 pt-4"}>
                          <h6
                            className={`fw-bold mb-0 text-uppercase ${
                              item.status === "out of stock" && "text-muted"
                            }`}
                          >
                            {item.status}
                          </h6>
                        </td>
                        <td className={"px-0 pt-4"}>
                          {item.status === "out of stock" ? null : (
                            <Button
                              color={"primary"}
                              outline
                              className={`text-uppercase d-flex align-items-center ${s1.addToCartBtn}`}
                              size={"sm"}
                              onClick={() => {
                                addToCart(item.id)
                                toast.info(
                                    "product successfully added to your cart"
                                );
                              }}
                            >
                              <div className={`mr-2 ${s1.addToCart}`} />
                              add to cart
                            </Button>
                          )}
                        </td>
                        <td className={"px-0 pt-4"}>
                          <Button
                            className={"bg-transparent border-0 p-0"}
                            onClick={() => {
                              removeFromWishlist(item.id)
                              toast.info(
                                  "product successfully removed"
                              );
                            }}
                          >
                            <img src={close} alt={"close"} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </Table>
          </Col>
        </Row>
      </Container>
      <InfoBlock />
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

export default Cart;
