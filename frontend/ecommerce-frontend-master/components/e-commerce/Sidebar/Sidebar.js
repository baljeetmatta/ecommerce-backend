import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { withRouter } from "next/router";
import Link from "next/link";
import s from "./Sidebar.module.scss";
import LinksGroup from "./LinksGroup";
import {
  closeSidebar,
  changeActiveSidebarItem,
} from "redux/actions/navigation";
import { logoutUser } from "redux/actions/auth";

class Sidebar extends React.Component {
  static propTypes = {
    sidebarOpened: PropTypes.bool,
    dispatch: PropTypes.func.isRequired,
    activeItem: PropTypes.string,
    location: PropTypes.shape({
      pathname: PropTypes.string,
    }),
  };

  static defaultProps = {
    sidebarOpened: true,
    activeItem: "",
  };

  constructor(props) {
    super(props);
    this.wrapperRef = React.createRef();
    this.doLogout = this.doLogout.bind(this);
  }

  doLogout() {
    this.props.dispatch(logoutUser());
  }

  handleClickOutside = (event) => {
    if (this.wrapperRef && !this.wrapperRef.current.contains(event.target) && this.props.sidebarOpened) {
      this.props.dispatch(closeSidebar());
      this.props.dispatch(changeActiveSidebarItem(null));
    }
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  componentWillUnmount() {
      document.removeEventListener('mousedown', this.handleClickOutside);
  }

  render() {
    return (
        <div ref={this.wrapperRef}
            className={`${
                !this.props.sidebarOpened && !this.props.sidebarStatic
                    ? s.sidebarClose
                    : ""
            } ${s.sidebarWrapper}`}
        >
          <nav className={s.root}>
            <header className={s.logo}>
            <span className={`${s.logoStyle} mx-1`}>
              Flatlogic<i>.</i>
            </span>
            </header>
            <ul className={s.nav}>
              <LinksGroup
                  onActiveSidebarItemChange={activeItem => this.props.dispatch(changeActiveSidebarItem(activeItem))}
                  activeItem={this.props.activeItem}
                  header="Home"
                  link="/"
                  isHeader
              />
              <LinksGroup
                  onActiveSidebarItemChange={(activeItem) =>
                      this.props.dispatch(changeActiveSidebarItem(activeItem))
                  }
                  activeItem={this.props.activeItem}
                  header="Pages"
                  link="/pages"
                  index="pages"
                  isHeader
                  exact={false}
                  childrenLinks={[
                    {
                      header: 'About Us', link: '/about',
                    },
                    {
                      header: 'About Team', link: '/about-team',
                    },
                    {
                      header: 'Contact Us', link: '/contact',
                    },
                    {
                      header: 'FAQ', link: '/faq',
                    },
                    {
                      header: '404', link: '/error',
                    },
                    {
                      header: 'Wishlist', link: '/wishlist',
                    },
                    {
                      header: 'Login', link: '/login',
                    },
                  ]}
              />
              <LinksGroup
                  onActiveSidebarItemChange={(activeItem) =>
                      this.props.dispatch(changeActiveSidebarItem(activeItem))
                  }
                  activeItem={this.props.activeItem}
                  header="Shop"
                  link="/shop"
                  index="shop"
                  isHeader
                  exact={false}
                  childrenLinks={[
                    {
                      header: 'Shop', link: '/shop',
                    },
                    {
                      header: 'Categories', link: '/categories',
                    },
                    {
                      header: 'Account', link: '/account',
                    },
                  ]}
              />
              <LinksGroup
                  onActiveSidebarItemChange={(activeItem) =>
                      this.props.dispatch(changeActiveSidebarItem(activeItem))
                  }
                  activeItem={this.props.activeItem}
                  header="Blog"
                  link="/blog"
                  index="blog"
                  isHeader
                  exact={false}
                  childrenLinks={[
                    {
                      header: 'Blog', link: '/blog',
                    },
                    {
                      header: 'Article', link: '/blog/article',
                    },
                  ]}
              />
            </ul>
            <div className={s.accountBtn}>
              <Link href={"/account  "}>
                My Account
              </Link>
            </div>
          </nav>
        </div>
    );
  }
}

function mapStateToProps(store) {
  return {
    sidebarOpened: store.navigation.sidebarOpened,
    activeItem: store.navigation.activeItem,
    currentUser: store.auth.currentUser,
  };
}

export default withRouter(connect(mapStateToProps)(Sidebar));
