import * as dataFormat from "./UsersDataFormatters";

import actions from "redux/actions/users/usersListActions";
import React, { Component } from "react";
import Link from 'next/link'
import { withRouter } from "next/router"
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

class UsersListTable extends Component {
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
          onClick={() => this.props.router.push(`/admin/users/${cell}`)}
        >
          View
        </Button>
        &nbsp;&nbsp;
        <Button
          color="info"
          size="xs"
          onClick={() => this.props.router.push(`/admin/users/edit/${cell}`)}
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
    console.log(this.props)
    const { dispatch } = this.props;
    dispatch(actions.doFetch({}));
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
        <Widget title={<h4>Users</h4>} collapse close>
          <Link href="/admin/users/new">
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
            <TableHeaderColumn dataField="firstName" dataSort>
              <span className="fs-sm">First Name</span>
            </TableHeaderColumn>

            <TableHeaderColumn dataField="lastName" dataSort>
              <span className="fs-sm">Last Name</span>
            </TableHeaderColumn>

            <TableHeaderColumn dataField="emailVerified" dataSort>
              <span className="fs-sm">Email Verified</span>
            </TableHeaderColumn>

            <TableHeaderColumn dataField="email" dataSort>
              <span className="fs-sm">E-mail</span>
            </TableHeaderColumn>

            <TableHeaderColumn dataField="role" dataSort>
              <span className="fs-sm">Role</span>
            </TableHeaderColumn>

            <TableHeaderColumn
              dataField="disabled"
              dataSort
              dataFormat={dataFormat.booleanFormatter}
            >
              <span className="fs-sm">Disabled</span>
            </TableHeaderColumn>

            <TableHeaderColumn
              dataField="avatar"
              dataSort
              dataFormat={dataFormat.imageFormatter}
            >
              <span className="fs-sm">Avatar</span>
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
    loading: store.users.list.loading,
    rows: store.users.list.rows,
    modalOpen: store.users.list.modalOpen,
    idToDelete: store.users.list.idToDelete,
  };
}

export async function getServerSideProps(context) {
  // const res = await axios.get("/products");
  // const products = res.data.rows;

  return {
    props: {  }, // will be passed to the page component as props
  };
}

export default connect(mapStateToProps)(withRouter(UsersListTable));
