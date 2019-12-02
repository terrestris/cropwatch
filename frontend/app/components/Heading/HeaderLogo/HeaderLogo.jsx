import React from 'react';
import { appConfig } from '../../../config/app.config.js';
import HeaderLogoImg from '../../../resources/img/BMEL_Logo.svg';

import './HeaderLogo.less';

class HeaderLogo extends React.Component {

  render() {
    return (
      <div className="header-logo">
        <a href="https://www.ble.de" target="_blank" rel="noopener noreferrer">
          <img
            src={HeaderLogoImg}
            alt="Logo">
          </img>
        </a>
        <a href="/#">
          {appConfig.header.title}
        </a>
      </div>
    );
  }
}

export default HeaderLogo;
