import React from 'react';
import PropTypes from 'prop-types';
import {translate} from 'react-i18next';

@translate()
class LandingPage extends React.Component {

  static propTypes = {
    t: PropTypes.func
  }

  render() {
    const { t } = this.props;
    return (
      <div className="page landing-page">
        <h2>{t('LandingPage.title')}</h2>
        <p>{t('LandingPage.description')}</p>
      </div>
    );
  }
}

export default LandingPage;
