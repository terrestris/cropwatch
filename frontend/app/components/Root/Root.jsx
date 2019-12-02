import React from 'react';
import PropTypes from 'prop-types';
import {
  Route,
  withRouter
} from 'react-router-dom';
import {connect} from 'react-redux';
import { translate } from 'react-i18next';

import DataAnalysisPage from '../Page/DataAnalysisPage/DataAnalysisPage.jsx';
import EntityManagementPage from '../Page/DataManagement/EntityManagementPage/EntityManagementPage.jsx';
import MapPage from '../Page/MapPage/MapPage.jsx';
import LoginPage from '../Page/LoginPage/LoginPage.jsx';
import LandingPage from '../Page/LandingPage/LandingPage.jsx';
import RegistrationPage from '../Page/RegistrationPage/RegistrationPage.jsx';
import TimeseriesChartPage from '../Page/DataAnalysisPage/TimeseriesChartPage/TimeseriesChartPage.jsx';

import {appConfig} from '../../config/app.config.js';

import ApplicationHeader from '../Heading/ApplicationHeader/ApplicationHeader.jsx';
import { setUser, toggleEventLog } from '../../actions/AppAction.js';
import { setAllTraits } from '../../actions/MeasurementsAction.js';
import { Authentication } from '../../util/Authentication';

import {
  SimpleButton,
  Window
} from '@terrestris/react-geo';
import EventLog from '../EventLog/EventLog.jsx';
import { EventLogger } from '../../util/EventLogger';
import BreadcrumbNavigation from '../BreadcrumbNavigation/BreadcrumbNavigation.jsx';

import './Root.less';
import MeasurementsPage from '../Page/DataManagement/Import/MeasurementsPage/MeasurementsPage.jsx';
import TractorImagePage from '../Page/DataManagement/Import/TractorImagePage/TractorImagePage.jsx';
import AerialImagePage from '../Page/DataManagement/Import/AerialImagePage/AerialImagePage.jsx';
import ImportPage from '../Page/DataManagement/Import/ImportPage.jsx';
import AnalysisGrid from '../Grid/AnalysisGrid/AnalysisGrid.jsx';
import ImprintDialog from '../Dialog/ImprintDialog/ImprintDialog.jsx';

@connect(store => {
  return {
    language: store.app.language,
    eventLogVisible: store.app.eventLogVisible,
    imprintVisible: store.app.imprintVisible,
    measurements: store.measurements
  };
})
@translate()
class Root extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    mapView: PropTypes.object,
    language: PropTypes.string,
    history: PropTypes.object,
    children: PropTypes.object,
    eventLogVisible: PropTypes.bool,
    imprintVisible: PropTypes.bool,
    t: PropTypes.func
  };

  constructor() {
    super();
    document.title = appConfig.header.title;
  }

  componentDidMount() {
    this.mounted = true;
    const env = process.env.NODE_ENV;
    const api = appConfig.api[env];
    const jwt = localStorage.getItem('cropwatch_jwt');

    if (jwt) {
      Authentication.getUserByToken(jwt)
        .catch(err => {
          this.props.history.push('/login');
          EventLogger.log(`Get User By Token Failed: ${err}`, 'error', 'Authentication');
        })
        .then(user => {
          this.props.dispatch(setUser(user));
        });
    } else {
      this.props.history.push('/login');
    }

    fetch(`${api}/Trait/get`)
      .then(response => response.json())
      .then(allTraits => this.props.dispatch(setAllTraits(allTraits)));
  }

  getEventLogPosition() {
    const logButton = document.getElementById('event-log-button');
    if (!logButton) {
      return [0,0];
    }
    const logButtonRect = logButton.getBoundingClientRect();
    const x = logButtonRect.x + logButtonRect.width - 300;
    const y = logButtonRect.y + logButtonRect.height;
    return [x, y];
  }

  render() {
    const {
      language,
      eventLogVisible,
      imprintVisible,
      t
    } = this.props;

    return (
      <div className="container-fluid">
        <ApplicationHeader appLanguage={language} />
        <BreadcrumbNavigation />
        <Route exact path="/" component={LandingPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/registration" component={RegistrationPage} />
        <Route path="/management" component={EntityManagementPage} />
        <Route exact path="/import" component={ImportPage} />
        <Route path="/import/measurements" component={MeasurementsPage} />
        <Route path="/import/tractor" component={TractorImagePage} />
        <Route path="/import/aerial" component={AerialImagePage} />
        <Route path="/analysis" component={DataAnalysisPage} />
        <Route path="/analysis/grid" component={AnalysisGrid} />
        <Route path="/analysis/chart" component={TimeseriesChartPage} />
        <Route path="/map" component={MapPage} />
        {
          !eventLogVisible ? null :
            <Window
              className="event-log-window"
              title={t('EventLog.eventLog')}
              width={300}
              height={150}
              x={this.getEventLogPosition()[0] / 2}
              y={this.getEventLogPosition()[1] / 2}
              tools={[
                <SimpleButton
                  key="closeButton"
                  icon="close"
                  size="small"
                  tooltip="Close"
                  onClick={() => this.props.dispatch(toggleEventLog())}
                />
              ]}
            >
              <EventLog />
            </Window>
        }
        {
          !imprintVisible ? null : <ImprintDialog/>
        }
      </div>
    );
  }
}

export default withRouter(Root);
