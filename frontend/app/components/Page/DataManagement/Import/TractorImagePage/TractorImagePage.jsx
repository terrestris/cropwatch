import React from 'react';
import PropTypes from 'prop-types';
import {translate} from 'react-i18next';
import { connect } from 'react-redux';
import {
  Select,
  Form,
  Input,
  DatePicker,
  Progress
} from 'antd';
const { Option } = Select;

import {
  SimpleButton,
  mappify
} from '@terrestris/react-geo';
import {
  get as _get
} from 'lodash';


import './TractorImagePage.less';
import { appConfig } from '../../../../../config/app.config';
import websocket from '../../../../../websocket';
import EventLogger from '../../../../../util/EventLogger';
import { MapUtils } from '../../../../../util/MapUtils';
import FileHandling from '../../../../../util/FileHandling';
import RemoteSelectField from '../../../../Selectfield/RemoteSelectField/RemoteSelectField.jsx';

const env = process.env.NODE_ENV;
const api = appConfig.api[env];

// callback that is called once a file upload has finished
let currentFileHandleCallback;
// callback that is called once a geoserver import has finished
let addImportLayer;
// callback that is called once a tractor raster has been uploaded and can be published as a layer
let tractorLayerDetectedCallback;

websocket.addEventListener('message', event => {
  const json = JSON.parse(event.data);
  // handles server message on finished upload
  if (json.handle && currentFileHandleCallback) {
    currentFileHandleCallback(json.handle);
  }
  // handles server message on finished import
  if (json.importDone) {
    addImportLayer(json.rasterFile);
  }
  if (json.tractorLayerDetected) {
    tractorLayerDetectedCallback(json.exampleProperties, json.rasterFileId, json.rasterFileName);
  }
});

@connect((store) => {
  return {
    user: store.app.user
  };
})
@translate()
@mappify
class TractorImagePage extends React.Component {
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

    addImportLayer = layer => {
      MapUtils.addImportLayer(layer, props.map);
    };

    tractorLayerDetectedCallback = (exampleProperties, rasterFileId, rasterFileName) => {
      this.setState({
        tractorLayerDetected: true,
        exampleProperties,
        rasterFileId,
        rasterFileName
      });
    };

    this.state = {
      experiment: null,
      date: null,
      sensor: 'RGB',
      format: 'JPG',
      product: 'project',
      file: null,
      uploadProgress: 0,
      tractorLayerDetected: false,
      exampleProperties: null,
      fileNameAttribute: null,
      displayNameAttribute: null,
      rasterFileId: null,
      rasterFileName: null,
      validations: {}
    };
  }

  /**
   * Actually starts the upload by opening a new websocket for binary data
   * transfer and signaling the server that a file is coming.
   */
  startImport = () => {
    const {
      experiment,
      date,
      sensor,
      format
    } = this.state;
    const iso = date.toISOString();
    const {t} = this.props;
    const me = this;

    if (websocket.readyState !== websocket.OPEN) {
      EventLogger.log(t('TractorImagePage.websocketNotReady'), 'error', 'TractorImagePage');
      return;
    }

    currentFileHandleCallback = currentFileHandle => {
      const worker = new Worker('UploadWorker.js');
      worker.postMessage([
        `${appConfig.upload[process.env.NODE_ENV]}/${currentFileHandle}`,
        this.state.file
      ]);
      worker.onmessage = event => {
        if (event.data.finishedUpload) {
          websocket.send(JSON.stringify({
            jwt: localStorage.getItem('cropwatch_jwt'),
            message: 'endfile',
            handle: currentFileHandle
          }));
        } else {
          me.setState({uploadProgress: event.data});
        }
      };
    };

    websocket.send(JSON.stringify({
      message: 'startfile',
      jwt: localStorage.getItem('cropwatch_jwt'),
      experiment,
      category: 'PhotosTractor',
      date: iso,
      sensor,
      format,
      addAsLayer: true
    }));
  }

  /**
   * Creates the option values for the tractor layer attribute selection.
   */
  generateAttributeDropdown = () => {
    const values = this.state.exampleProperties;
    return Object.entries(values).map((values, idx) => <Option key={idx} value={values[0]}>{values[0] + ` (Beispiel: ${values[1]})`}</Option>);
  }

  /**
   * Starts the tractor layer import after uploading it by sending the appropriate websocket message.
   */
  startTractorLayerImport = () => {
    websocket.send(JSON.stringify({
      jwt: localStorage.getItem('cropwatch_jwt'),
      message: 'importtractorlayer',
      rasterFileId: this.state.rasterFileId,
      fileNameAttribute: this.state.fileNameAttribute,
      displayNameAttribute: this.state.displayNameAttribute,
      rasterFileName: this.state.rasterFileName
    }));
  }

  onFileInputChange = event => {
    const file = event.target.files[0];
    this.setState({
      file
    }, this.validateFile);
  }

  onFormatChange = format => {
    this.setState({
      format
    }, this.validateFile);
  }

  validateFile = async () => {
    const { t } = this.props;
    const {
      file,
      format
    } = this.state;

    if (!file || !format) {
      return;
    }

    this.setState({
      validations: {
        ...this.state.validations,
        fileInput: {
          validStatus: 'validating',
          help: t('TractorImagePage.validating')
        }
      }
    });
    const validationStatus = await FileHandling.validateImportFile(file, format);
    this.setState({
      validations: {
        ...this.state.validations,
        fileInput: {
          validStatus: validationStatus.valid ? 'success': 'error',
          help: validationStatus.message
        }
      }
    });
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
      date,
      sensor,
      format,
      file,
      uploadProgress,
      tractorLayerDetected,
      fileNameAttribute,
      displayNameAttribute,
      validations
    } = this.state;

    const uploadEnabled = experiment && date && sensor && format && file;
    return (
      <div className="page import-page">
        <h2>{t('TractorImagePage.title')}</h2>
        <p>{t('TractorImagePage.description')}</p>
        <p>{t('TractorImagePage.zipDescription')}</p>
        <Form layout="inline">
          <Form.Item
            label={t('TractorImagePage.uploadZip')}
            validateStatus={_get(validations, 'fileInput.validStatus')}
            help={_get(validations, 'fileInput.help')}
          >
            <Input
              type="file"
              onChange={this.onFileInputChange}
            />
          </Form.Item>
          <Form.Item
            label={t('TractorImagePage.format')}
            validateStatus={_get(validations, 'fileInput.validStatus')}
            help={_get(validations, 'fileInput.help')}
          >
            <Select
              style={{ width: 120 }}
              onChange={this.onFormatChange}
              value={format}
            >
              <Option value="JPG">JPG</Option>
            </Select>
          </Form.Item>
          <Form.Item label={t('TractorImagePage.sensor')}>
            <Select
              style={{ width: 120 }}
              onChange={sensor => this.setState({sensor})}
              value={sensor}
            >
              <Option value="RGB">RGB</Option>
              <Option value="NIR">NIR</Option>
            </Select>
          </Form.Item>
          <Form.Item label={t('Entities.experiment')}>
            <RemoteSelectField
              url={`${api}/Experiment/get`}
              placeholder={t('TractorImagePage.pleaseChoose')}
              sortKey="name"
              renderFunction={(tuple) => {
                return tuple.title;
              }}
              value={_get(experiment, 'id')}
              onChange={experiment => this.setState({experiment})}
            />
          </Form.Item>
          <Form.Item label={t('General.date')}>
            <DatePicker
              onChange={value => {
                // date only
                const date = value.startOf('day');
                this.setState({date});
              }}
              value={date}
            />
          </Form.Item>
          { uploadProgress > 0 ?
            <div>
              <Form.Item label={t('TractorImagePage.uploadStatus')}>
                <Progress
                  percent={uploadProgress}
                />
              </Form.Item>
              { tractorLayerDetected ?
                <div>
                  <Form.Item label={t('TractorImagePage.tractorImageFileName')}>
                    <Select
                      style={{ width: 300 }}
                      onChange={fileNameAttribute => this.setState({fileNameAttribute})}
                      value={fileNameAttribute}
                    >
                      {this.generateAttributeDropdown()}
                    </Select>
                  </Form.Item>
                  <Form.Item label={t('TractorImagePage.tractorImageDisplayName')}>
                    <Select
                      style={{ width: 300 }}
                      onChange={displayNameAttribute => this.setState({displayNameAttribute})}
                      value={displayNameAttribute}
                    >
                      {this.generateAttributeDropdown()}
                    </Select>
                  </Form.Item>
                  <SimpleButton
                    type="primary"
                    onClick={this.startTractorLayerImport}
                  >
                    {t('TractorImagePage.startLayerImport')}
                  </SimpleButton>
                </div>
                : null
              }
            </div> :
            <SimpleButton
              disabled={!uploadEnabled}
              type="primary"
              onClick={this.startImport}
            >
              {t('TractorImagePage.startImport')}
            </SimpleButton>
          }
        </Form>
      </div>
    );
  }
}

export default TractorImagePage;
