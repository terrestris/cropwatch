import { connect } from 'react-redux';

import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import {Link, withRouter} from 'react-router-dom';
import {
  SimpleButton
} from '@terrestris/react-geo';
import HeaderLogo from '../HeaderLogo/HeaderLogo.jsx';
import ImprintButton from '../../Button/ImprintButton/ImprintButton.jsx';
import EventLogButton from '../../Button/EventLogButton/EventLogButton.jsx';
import {setUser} from '../../../actions/AppAction';

import './ApplicationHeader.less';
import { Authentication } from '../../../util/Authentication';
import {
  Menu
} from 'antd';
import LanguageSwitcher from '../../LanguageSwitcher/LanguageSwitcher.jsx';

@connect((store) => {
  return {
    app: store.app,
    user: store.app.user
  };
})
@translate()
@withRouter
class ApplicationHeader extends React.Component{
  static propTypes= {
    dispatch: PropTypes.func,
    t: PropTypes.func,
    className: PropTypes.string,
    appLanguage: PropTypes.string.isRequired,
    app: PropTypes.object,
    history: PropTypes.object.isRequired,
    user: PropTypes.object
  }

  static contextTypes = {
    router: PropTypes.object.isRequired
  }

  static defaultProps = {
    appLanguage: 'de'
  }

  logout = () => {
    const {
      dispatch,
      history
    } = this.props;
    dispatch(setUser(undefined));
    history.push('/');
    Authentication.logout();
  }

  handleNavigationClick = ({key}) => {
    const {
      history
    } = this.props;
    history.push(key);
  }

  render() {
    const {
      user,
      t
    } = this.props;

    const loggedIn = !!user;
    const logIn = loggedIn ? null
      : <Link to="/login">
        <SimpleButton
          className="headerbutton"
          type="primary"
        >
          {t('ApplicationHeader.login')}
        </SimpleButton>
      </Link>;
    const register = loggedIn ? null
      : <Link to="/registration">
        <SimpleButton
          className="headerbutton"
          type="primary"
        >
          {t('ApplicationHeader.register')}
        </SimpleButton>
      </Link>;
    const logOut = loggedIn
      ? <SimpleButton
        className="headerbutton"
        type="primary"
        onClick={this.logout}
      >
        {t('ApplicationHeader.logout', {
          user: user.username
        })}
      </SimpleButton> :null;

    return (
      <div className="application-header">
        <div className="left-items">
          <HeaderLogo/>
        </div>
        <div className="center-items">
          <Menu
            onClick={this.handleNavigationClick}
            mode="horizontal"
          >
            <Menu.SubMenu
              title={t('Routes.management')}
              onTitleClick={this.handleNavigationClick}
              key="/management"
            >
              <Menu.ItemGroup title= {t('Routes.management')}>
                <Menu.Item key="/management">{t('Routes.data')}</Menu.Item>
              </Menu.ItemGroup>
              <Menu.ItemGroup title="Import">
                <Menu.Item key="/import/measurements">{t('Routes.measurements')}</Menu.Item>
                <Menu.Item key="/import/aerial">{t('Routes.aerial')}</Menu.Item>
                <Menu.Item key="/import/tractor">{t('Routes.tractor')}</Menu.Item>
              </Menu.ItemGroup>
            </Menu.SubMenu>
            <Menu.SubMenu
              title={t('Routes.analysis')}
              onTitleClick={this.handleNavigationClick}
              key="/analysis"
            >
              <Menu.Item key="/analysis/grid">{t('Routes.grid')}</Menu.Item>
              <Menu.Item key="/analysis/chart">{t('Routes.chart')}</Menu.Item>
            </Menu.SubMenu>
            <Menu.Item key="/map">{t('Routes.map')}</Menu.Item>
          </Menu>
        </div>
        <div className="right-items">
          <LanguageSwitcher
            languages={['de', 'en']}
          />
          {logIn}
          {register}
          {logOut}
          <EventLogButton />
          <ImprintButton/>
        </div>
      </div>
    );
  }
}

export default ApplicationHeader;
