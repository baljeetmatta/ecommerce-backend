import React from "react";
import { Container, Row, Col, Table, Button } from "reactstrap";
import Link from "next/link";
import s from "./Cart.module.scss";
import close from "public/images/e-commerce/close.svg";
import { useSelector } from "react-redux";
import axios from "axios";
import Head from "next/head";
import { toast, ToastContainer } from "react-toastify";

const Index = () => {
  const currentUser = useSelector((store) => store.auth.currentUser);
  const [products, setProducts] = React.useState([]);
  const [totalPrice, setTotalPrice] = React.useState(0);

  React.useEffect(() => {
    if (currentUser) {
      axios.get(`/orders?user=${currentUser.id}&status=in+cart`).then((res) => {
        res.data.rows.map((item, index) => {
          axios.get(`/products/${item.product.id}`).then((res) => {
            const data = res.data;
            data.amount = item.amount;
            setProducts((prevState) => [...prevState, data]);
            setTotalPrice(0);
          });
        });
        return;
      });
    }
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("products") &&
      !currentUser
    ) {
      JSON.parse(localStorage.getItem("products")).map((item, index) => {
        if (item.product) {
          axios.get(`/products/${item.product}`).then((res) => {
            const data = res.data;
            data.amount = item.amount;
            setProducts((prevState) => [...prevState, data]);
            setTotalPrice(0);
          });
        } else {
          axios.get(`/products/${item.id}`).then((res) => {
            const data = res.data;
            data.amount = item.amount;
            setProducts((prevState) => [...prevState, data]);
            setTotalPrice(0);
          });
        }
      });
    }
  }, []);

  React.useEffect(() => {
    let total = 0;
    products.map((item) => {
      total += item.amount * item.price;
    });
    setTotalPrice((prevState) => total);
  }, [products]);

  const reduceQuantity = (index) => {
    if (currentUser) {
      const product = products[index];
      if (product.amount > 1) product.amount -= 1;
      setProducts((prevState) => {
        prevState[index] = product;
        return prevState;
      });
      axios
        .put(`/orders/${currentUser.id}`, {
          data: {
            product: product.id,
            amount: product.amount,
            status: "in cart",
            user: currentUser.id,
          },
          id: currentUser.id,
        })
        .then((res) => {
          console.log(1);
        });
    } else if (typeof window !== "undefined") {
      const product = products[index];
      if (product.amount > 1) product.amount -= 1;
      setProducts((prevState) => {
        prevState[index] = product;
        return prevState;
      });
      localStorage.setItem("products", JSON.stringify(products));
      setProducts(JSON.parse(localStorage.getItem("products")));
    }
  };

  const increaseQuantity = (index) => {
    if (currentUser) {
      const product = products[index];
      product.amount += 1;
      setProducts((prevState) => {
        prevState[index] = product;
        return prevState;
      });
      axios
        .put(`/orders/${currentUser.id}`, {
          data: {
            product: product.id,
            amount: product.amount,
            status: "in cart",
            user: currentUser.id,
          },
          id: currentUser.id,
        })
        .then((res) => {
          console.log(1);
        });
    } else if (typeof window !== "undefined") {
      const product = products[index];
      product.amount += 1;
      setProducts((prevState) => {
        prevState[index] = product;
        return prevState;
      });
      localStorage.setItem("products", JSON.stringify(products));
      setProducts(JSON.parse(localStorage.getItem("products")));
    }
  };

  const removeFromProducts = (id) => {
    if (currentUser) {
      axios.put(`/users/${currentUser.id}`, {
        id: currentUser.id,
        data: {
          ...currentUser,
          wishlist: [],
        },
      });
      setTest(true);
    } else if (typeof window !== "undefined") {
      let count = 0;
      // localStorage.removeItem("products")
      // const products = JSON.parse(localStorage.getItem("products"));
      // setProducts(products)
      const newProducts = products.filter((item) => {
        if (item.id === id) {
          if (count >= 1) return true;
          count += 1;
          return false;
        }
        return true;
      });
      localStorage.setItem("products", JSON.stringify(newProducts));
      setProducts(newProducts);
    }
  };

  return (
    <Container>
      <Head>
        <title>Cart</title>
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
      <Row className={"mb-5"} style={{ marginTop: 32 }}>
        <ToastContainer />
        <Col xs={12} lg={8}>
          <h2 className={"fw-bold mt-4 mb-5"}>Shopping Cart</h2>
          <Table borderless>
            <thead>
              <tr style={{ borderBottom: "1px solid #D9D9D9" }}>
                <th className={"bg-transparent text-dark px-0"}>Product</th>
                <th className={"bg-transparent text-dark px-0"}>Quantity</th>
                <th className={"bg-transparent text-dark px-0"}>Price</th>
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
                        <div className={"d-flex align-items-center"}>
                          <Button
                            className={`${s.quantityBtn} bg-transparent border-0 p-1 fw-bold mr-3`}
                            onClick={() => reduceQuantity(index)}
                          >
                            -
                          </Button>
                          <p className={"fw-bold mb-0"}>{item.amount}</p>
                          <Button
                            className={`${s.quantityBtn} bg-transparent border-0 p-1 fw-bold ml-3`}
                            onClick={() => increaseQuantity(index)}
                          >
                            +
                          </Button>
                        </div>
                      </td>
                      <td className={"px-0 pt-4"}>
                        <h6 className={"fw-bold mb-0"}>{item.price}$</h6>
                      </td>
                      <td className={"px-0 pt-4"}>
                        <Button
                          className={"bg-transparent border-0 p-0"}
                          onClick={() => {
                            removeFromProducts(item.id);
                            toast.info("product successfully removed");
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
        <Col xs={12} lg={4}>
          <section className={s.cartTotal}>
            <h2 className={"fw-bold mb-5"}>Cart Total</h2>
            <div className={"d-flex"}>
              <h6 className={"fw-bold mr-5 mb-0"}>Subtotal:</h6>
              <h6 className={"fw-bold mb-0"}>{totalPrice}$</h6>
            </div>
            <hr className={"my-4"} />
            <div className={"d-flex"}>
              <h6 className={"fw-bold mr-5 mb-0"}>Shipping:</h6>
              <div>
                <h6 className={"fw-bold mb-3"}>Free Shipping</h6>
                <p className={"mb-0"}>
                  Shipping options will be updated during checkout.
                </p>
              </div>
            </div>
            <hr className={"my-4"} />
            <div className={"d-flex"}>
              <h5 className={"fw-bold"} style={{ marginRight: 63 }}>
                Total:
              </h5>
              <h5 className={"fw-bold"}>{totalPrice}$</h5>
            </div>
            <Link href={"/billing"}>
              <Button
                color={"primary"}
                className={`${s.checkOutBtn} text-uppercase mt-auto fw-bold`}
              >
                Check out
              </Button>
            </Link>
          </section>
        </Col>
      </Row>
    </Container>
  );
};

export async function getServerSideProps(context) {
  // const res = await axios.get("/products");
  // const products = res.data.rows;

  return {
    props: {}, // will be passed to the page component as props
  };
}

export default Index;
