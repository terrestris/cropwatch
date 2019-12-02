import React from 'react';
import PropTypes from 'prop-types';
import {translate} from 'react-i18next';
import {Link, withRouter} from 'react-router-dom';
import { Card } from 'antd';

import './ImportPage.less';

@translate()
@withRouter
class ImportPage extends React.Component {

  static propTypes = {
    t: PropTypes.func
  }

  render() {
    const { t } = this.props;
    return (
      <div className="page import-page">
        <h2>{t('ImportPage.title')}</h2>
        <p>{t('ImportPage.description')}</p>
        <div className="categories">
          <Link to="/import/measurements">
            <Card title={t('Routes.measurements')}>
              <p>{t('MeasurementsPage.description')}</p>
            </Card>
          </Link>
          <Link to="/import/aerial">
            <Card title={t('Routes.aerial')}>
              <p>{t('AerialImagePage.description')}</p>
            </Card>
          </Link>
          <Link to="/import/tractor">
            <Card title={t('Routes.tractor')}>
              <p>{t('TractorImagePage.description')}</p>
            </Card>
          </Link>
        </div>
      </div>
    );
  }
}

export default ImportPage;
