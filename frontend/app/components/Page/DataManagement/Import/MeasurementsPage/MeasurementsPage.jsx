import React from 'react';
import PropTypes from 'prop-types';
import {translate} from 'react-i18next';
import { connect } from 'react-redux';

import {
} from '@terrestris/react-geo';
import {
  get as _get
} from 'lodash';

import {
  appConfig
} from '../../../../../config/app.config.js';

import './MeasurementsPage.less';
import RemoteSelectField from '../../../../Selectfield/RemoteSelectField/RemoteSelectField.jsx';
import ImportGrid from '../../../../Grid/ImportGrid/ImportGrid.jsx';
import { Form } from 'antd';

const env = process.env.NODE_ENV;
const api = appConfig.api[env];

@connect((store) => {
  return {
    user: store.app.user
  };
})
@translate()
class MeasurementsPage extends React.Component {
  static propTypes = {
    appState: PropTypes.object,
    map: PropTypes.object,
    t: PropTypes.func
  };

  /**
   * Constructs the import page.
   * @param {Object} props the initial props
   */
  constructor(props) {
    super(props);

    this.state = {
      experiment: null,
      traitCollection: null,
      traits: []
    };
  }

  onTraitCollectionChange = value => {
    this.setState({
      traitCollection: value,
      traits: value.Traits
    });
  }

  onTraitsChange = (traits) => {
    this.setState({traits});
  }

  onExperimentChange = (experiment) => {
    this.setState({experiment});
  }

  /**
   * Standard render function. Import button is enabled once all fields have
   * been set.
   * @return {Object} the render tree
   */
  render() {
    const {
      t
    } = this.props;
    const {
      experiment,
      traitCollection,
      traits
    } = this.state;

    return (
      <div className="page measurements-page">
        <h2>{t('MeasurementsPage.title')}</h2>
        <p>{t('MeasurementsPage.description')}</p>
        <Form>
          <Form.Item
            label={t('Entities.experiment')}
          >
            <RemoteSelectField
              allowClear
              className="Experiment-selectfield"
              url={`${api}/Experiment/get?include=all`}
              placeholder={t('MeasurementsPage.pleaseChoose')}
              sortKey="expcode"
              renderFunction={(tuple) => {
                return tuple.expcode;
              }}
              value={_get(experiment, 'id')}
              onChange={this.onExperimentChange}
            />
          </Form.Item>
          <Form.Item
            label={t('Entities.traitcollection')}
          >
            <RemoteSelectField
              allowClear
              className="traitcollection-selectfield"
              disabled={!experiment}
              url={`${api}/TraitCollection/get?include=all`}
              placeholder={t('MeasurementsPage.pleaseChoose')}
              sortKey="title"
              renderFunction={(tuple) => {
                return tuple.title;
              }}
              value={_get(traitCollection, 'id')}
              onChange={this.onTraitCollectionChange}
            />
          </Form.Item>
          <Form.Item
            label={t('Entities.traits')}
          >
            <RemoteSelectField
              allowClear
              className="trait-selectfield"
              url={`${api}/Trait/get`}
              placeholder={t('MeasurementsPage.pleaseChoose')}
              sortKey="name"
              disabled={!experiment}
              renderFunction={(tuple) => {
                return tuple.german;
              }}
              mode="multiple"
              value={traits.map(trait => trait.id)}
              onChange={this.onTraitsChange}
            />
          </Form.Item>
        </Form>
        {
          traits.length <= 0 ? null :
            <ImportGrid traits={traits} experiment={experiment} />
        }
      </div>
    );
  }
}

export default MeasurementsPage;
