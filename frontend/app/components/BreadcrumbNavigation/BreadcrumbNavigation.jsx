import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import {
  Link,
  withRouter
} from 'react-router-dom';
import { Breadcrumb, Icon } from 'antd';

@withRouter
@translate()
class BreadcrumbNavigation extends React.Component {
  static propTypes = {
    location: PropTypes.object,
    t: PropTypes.func
  };

  static defaultProps = {
  };

  getBreadcrumbs = () => {
    const {
      location,
      t
    } = this.props;
    const pathSnippets = location.pathname.split('/').filter(i => i);
    const breadcrumbItems = [
      <Breadcrumb.Item key={'home'}>
        <Link to={'/'}><Icon type="home" /></Link>
      </Breadcrumb.Item>
    ];
    pathSnippets.forEach((snippet, index, snippets) => {
      const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
      const text = t(`Routes.${snippet}`);
      const breadcrumpContent = index === snippets.length - 1
        ? text
        : <Link to={url}>{text}</Link>;
      breadcrumbItems.push(
        <Breadcrumb.Item key={snippet}>
          {breadcrumpContent}
        </Breadcrumb.Item>
      );
    });
    return breadcrumbItems;
  }

  render() {
    return (
      <Breadcrumb>
        {this.getBreadcrumbs()}
      </Breadcrumb>
    );
  }
}

export default BreadcrumbNavigation;
