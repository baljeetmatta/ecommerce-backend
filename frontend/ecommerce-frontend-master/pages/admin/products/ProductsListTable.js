import * as dataFormat from "./ProductsDataFormatters";

import * as categoriesDataFormat from "../categories/CategoriesDataFormatters";
import { withRouter } from "next/router"
import actions from "redux/actions/products/productsListActions";
import React, { Component } from "react";
import Link from 'next/link'
import { connect } from "react-redux";

import {
  Dropdown,
  DropdownMenu,
  DropdownToggle,
  DropdownItem,
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "reactstrap";

import { BootstrapTable, TableHeaderColumn } from "react-bootstrap-table";

import Widget from "components/admin/Widget";

class ProductsListTable extends Component {
  state = {
    modalOpen: false,
    idToDelete: null,
  };

  handleDelete() {
    const id = this.props.idToDelete;
    this.props.dispatch(actions.doDelete(id));
  }

  openModal(cell) {
    const id = cell;
    this.props.dispatch(actions.doOpenConfirm(id));
  }

  closeModal() {
    this.props.dispatch(actions.doCloseConfirm());
  }

  actionFormatter(cell) {
    return (
      <div>
        <Button
          color="default"
          size="xs"
          onClick={() => this.props.router.push(`/admin/products/${cell}`)}
        >
          View
        </Button>
        &nbsp;&nbsp;
        <Button
          color="info"
          size="xs"
          onClick={() =>
            this.props.router.push(`/admin/products/edit/${cell}`)
          }
        >
          Edit
        </Button>
        &nbsp;&nbsp;
        <Button color="danger" size="xs" onClick={() => this.openModal(cell)}>
          Delete
        </Button>
      </div>
    );
  }

  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(actions.doFetch({}));
    console.log(this.props)
  }

  renderSizePerPageDropDown = (props) => {
    const limits = [];
    props.sizePerPageList.forEach((limit) => {
      limits.push(
        <DropdownItem
          key={limit}
          onClick={() => props.changeSizePerPage(limit)}
        >
          {limit}
        </DropdownItem>
      );
    });

    return (
      <Dropdown isOpen={props.open} toggle={props.toggleDropDown}>
        <DropdownToggle color="default" caret>
          {props.currSizePerPage}
        </DropdownToggle>
        <DropdownMenu>{limits}</DropdownMenu>
      </Dropdown>
    );
  };

  render() {
    const { rows } = this.props;
    const options = {
      sizePerPage: 10,
      paginationSize: 5,
      sizePerPageDropDown: this.renderSizePerPageDropDown,
    };

    return (
      <div>
        <Widget title={<h4>Products</h4>} collapse close>
          <Link href="/admin/products/new">
            <button className="btn btn-primary" type="button">
              New
            </button>
          </Link>
          <BootstrapTable
            bordered={false}
            data={rows}
            version="4"
            pagination
            options={options}
            search
            tableContainerClass={`table-responsive table-striped table-hover`}
          >
            <TableHeaderColumn
              dataField="image"
              dataSort
              dataFormat={dataFormat.imageFormatter}
            >
              <span className="fs-sm">Image</span>
            </TableHeaderColumn>

            <TableHeaderColumn dataField="title" dataSort>
              <span className="fs-sm">Title</span>
            </TableHeaderColumn>

            <TableHeaderColumn dataField="price" dataSort>
              <span className="fs-sm">Price</span>
            </TableHeaderColumn>

            <TableHeaderColumn
              dataField="categories"
              dataSort
              dataFormat={categoriesDataFormat.listFormatter}
            >
              <span className="fs-sm">Categories</span>
            </TableHeaderColumn>

            <TableHeaderColumn dataField="rating" dataSort>
              <span className="fs-sm">Rating</span>
            </TableHeaderColumn>

            <TableHeaderColumn dataField="status" dataSort>
              <span className="fs-sm">Status</span>
            </TableHeaderColumn>

            <TableHeaderColumn
              isKey
              dataField="id"
              dataFormat={this.actionFormatter.bind(this)}
            >
              <span className="fs-sm">Actions</span>
            </TableHeaderColumn>
          </BootstrapTable>
        </Widget>

        <Modal
          size="sm"
          isOpen={this.props.modalOpen}
          toggle={() => this.closeModal()}
        >
          <ModalHeader toggle={() => this.closeModal()}>
            Confirm delete
          </ModalHeader>
          <ModalBody className="bg-white">
            Are you sure you want to delete this item?
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => this.closeModal()}>
              Cancel
            </Button>
            <Button color="primary" onClick={() => this.handleDelete()}>
              Delete
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  }
}

function mapStateToProps(store) {
  return {
    loading: store.products.list.loading,
    rows: store.products.list.rows,
    modalOpen: store.products.list.modalOpen,
    idToDelete: store.products.list.idToDelete,
  };
}

export async function getServerSideProps(context) {
  // const res = await axios.get("/products");
  // const products = res.data.rows;

  return {
    props: {  }, // will be passed to the page component as props
  };
}

export default connect(mapStateToProps)(withRouter(ProductsListTable));
