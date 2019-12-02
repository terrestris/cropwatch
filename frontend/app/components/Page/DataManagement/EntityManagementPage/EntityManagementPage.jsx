import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';
import { Select, Form } from 'antd';
import ManagementGrid from '../../../Grid/ManagementGrid/ManagementGrid.jsx';
const { Option, OptGroup } = Select;

import './EntityManagementPage.less';

@translate()
class EntityManagementPage extends React.Component {
  static propTypes = {
    t: PropTypes.func
  };

  constructor(props) {
    super(props);

    this.state = {
      model: null
    };
  }

  onEntityChange = (model) => {
    this.setState({model});
  }

  render() {
    const {t} = this.props;
    const {
      model
    } = this.state;

    return (
      <div className="page entity-management-page">
        <h2>{t('EntityManagementPage.title')}</h2>
        <p>{t('EntityManagementPage.description')}</p>
        <Form layout="inline">
          <Form.Item label={t('EntityManagementPage.selectLabel')}>
            <Select
              className="entity-select-field"
              onChange={this.onEntityChange}
              placeholder={t('General.pleaseChoose')}
            >
              <OptGroup label={t('EntityManagementPage.structuralData')}>
                <Option value="Farm">{t('Entities.farms')}</Option>
                <Option value="Field">{t('Entities.fields')}</Option>
                <Option value="Experiment">{t('Entities.experiments')}</Option>
                <Option value="Plot">{t('Entities.plots')}</Option>
                <Option value="WeatherStation">{t('Entities.weatherstations')}</Option>
                <Option value="Manager">{t('Entities.managers')}</Option>
              </OptGroup>
              <OptGroup label={t('EntityManagementPage.measurementData')}>
                <Option value="Trait">{t('Entities.traits')}</Option>
                <Option value="TraitCollection">{t('Entities.traitcollections')}</Option>
                <Option value="ExperimentalFactor">{t('Entities.experimentalfactors')}</Option>
              </OptGroup>
              <OptGroup label={t('EntityManagementPage.metaData')}>
                <Option value="Crop">{t('Entities.crops')}</Option>
                <Option value="Sort">{t('Entities.sorts')}</Option>
              </OptGroup>
              <OptGroup label={t('EntityManagementPage.rasterImportData')}>
                <Option value="RasterFile">{t('Entities.rasterfile')}</Option>
              </OptGroup>
            </Select>
          </Form.Item>
        </Form>
        {
          model ?
            <ManagementGrid
              modelName={model}
              autoLoad={true}
            />
            : null
        }
      </div>
    );
  }
}

export default EntityManagementPage;
