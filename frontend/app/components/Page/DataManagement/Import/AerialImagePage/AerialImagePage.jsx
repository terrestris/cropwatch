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

import './AerialImagePage.less';
import { appConfig } from '../../../../../config/app.config';
import websocket from '../../../../../websocket';
import { MapUtils } from '../../../../../util/MapUtils';
import EventLogger from '../../../../../util/EventLogger';
import FileHandling from '../../../../../util/FileHandling';
import RemoteSelectField from '../../../../Selectfield/RemoteSelectField/RemoteSelectField.jsx';
import Api from '../../../../../util/Api';

const env = process.env.NODE_ENV;
const api = appConfig.api[env];

// callback that is called once a file upload has finished
let currentFileHandleCallback;
// callback that is called once a geoserver import has finished
let addImportLayer;

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
});

@connect((store) => {
  return {
    user: store.app.user
  };
})
@translate()
@mappify
class AerialImagePage extends React.Component {
  static propTypes = {
    appState: PropTypes.object,
    map: PropTypes.object,
    t: PropTypes.func
  };

  _existingRasterFiles = [];

  /**
   * Constructs the import page.
   * @param {Object} props the initial props
   */
  constructor(props) {
    super(props);

    addImportLayer = layer => {
      MapUtils.addImportLayer(layer, props.map);
    };

    Api.getAllEntities('RasterFile')
      .then(rasterFiles => this._existingRasterFiles = rasterFiles)
      .catch(() => {
        EventLogger.log(`Couldn't get all entities of RasterFile.`, 'warning');
      });

    this.state = {
      experiment: null,
      date: null,
      sensor: 'RGB',
      format: 'TIFF',
      file: null,
      uploadProgress: 0,
      exampleProperties: null,
      rasterFileId: null,
      rasterFileName: null,
      validations: {},
      importStage: null,
      importStageMessage: null
    };

    websocket.addEventListener('message', event => {
      const json = JSON.parse(event.data);
      if (json.importStage) {
        this.setState({
          importStage: json.importStage,
          importStageMessage: json.message
        });
      }
    });
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
      EventLogger.log(t('AerialImagePage.websocketNotReady'), 'error', 'AerialImagePage');
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
      category: 'PhotosCopter',
      date: iso,
      sensor,
      format,
      addAsLayer: true
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
          help: t('AerialImagePage.validating')
        }
      }
    });
    const validationStatus = await FileHandling.validateImportFile(file, format, 'copter');
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

  validateExperimentAndDate = () => {
    const { t } = this.props;
    const {
      date,
      experiment
    } = this.state;
    let validStatus = 'success';
    let help;
    const existingRasterFile = this._existingRasterFiles.find(rasterFile => {
      const experimentMatch = experiment && experiment.id === rasterFile.ExperimentID;
      const timestampMatch = date && date.toISOString() === rasterFile.timestamp;
      return experimentMatch && timestampMatch;
    });
    if (existingRasterFile) {
      validStatus = 'error';
      help = t('AerialImagePage.existingData');
    }
    this.setState({
      validations: {
        ...this.state.validations,
        experiment: {
          validStatus,
          help
        }
      }
    });
  }

  onDateChange = value => {
    // date only
    const date = !value ? null : value.startOf('day');
    this.setState({date}, this.validateExperimentAndDate);
  }

  onExperimentChange = experiment => {
    this.setState({experiment}, this.validateExperimentAndDate);
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
      validations,
      importStage,
      importStageMessage
    } = this.state;

    const validFile = _get(validations, 'fileInput.validStatus') !== 'error';
    const validExperiment = _get(validations, 'experiment.validStatus') !== 'error';

    const uploadEnabled = experiment &&
      date &&
      sensor &&
      format &&
      file &&
      validFile &&
      validExperiment;

    return (
      <div className="page import-page">
        <h2>{t('AerialImagePage.title')}</h2>
        <p>{t('AerialImagePage.description')}</p>
        <p>{t('AerialImagePage.zipDescription')}</p>
        <Form layout="inline">
          <Form.Item
            label={t('AerialImagePage.uploadZip')}
            validateStatus={_get(validations, 'fileInput.validStatus')}
            help={_get(validations, 'fileInput.help')}
          >
            <Input
              type="file"
              onChange={this.onFileInputChange}
            />
          </Form.Item>
          <Form.Item
            label={t('AerialImagePage.format')}
            validateStatus={_get(validations, 'fileInput.validStatus')}
            help={_get(validations, 'fileInput.help')}
          >
            <Select
              style={{ width: 120 }}
              onChange={this.onFormatChange}
              value={format}
            >
              <Option value="TIFF">TIFF</Option>
            </Select>
          </Form.Item>
          <Form.Item label={t('AerialImagePage.sensor')}>
            <Select
              style={{ width: 120 }}
              onChange={sensor => this.setState({sensor})}
              value={sensor}
            >
              <Option value="RGB">RGB</Option>
              <Option value="NIR">NIR</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label={t('Entities.experiment')}
            validateStatus={_get(validations, 'experiment.validStatus')}
            help={_get(validations, 'experiment.help')}
          >
            <RemoteSelectField
              url={`${api}/Experiment/get`}
              placeholder={t('AerialImagePage.pleaseChoose')}
              sortKey="name"
              renderFunction={(tuple) => {
                return tuple.title;
              }}
              value={_get(experiment, 'id')}
              onChange={this.onExperimentChange}
            />
          </Form.Item>
          <Form.Item
            label={t('General.date')}
            validateStatus={_get(validations, 'experiment.validStatus')}
            help={_get(validations, 'experiment.help')}
          >
            <DatePicker
              onChange={this.onDateChange}
              value={date}
            />
          </Form.Item>
          { uploadProgress > 0 ?
            <div>
              <Form.Item label={t('AerialImagePage.uploadStatus')}>
                <Progress
                  percent={uploadProgress}
                />
              </Form.Item>
              {
                !importStage ? null :
                  <Form.Item
                    label={t('AerialImagePage.serverProcessStatus')}
                    help={importStageMessage ? t(importStageMessage) : null}
                  >
                    <Progress
                      status={(100 / 5) * importStage < 100 ? 'active' : 'normal'}
                      percent={(100 / 5) * importStage}
                      format={() => `${importStage}/5`}
                    />
                  </Form.Item>
              }
            </div> :
            <SimpleButton
              disabled={!uploadEnabled}
              type="primary"
              onClick={this.startImport}
            >
              {t('AerialImagePage.startImport')}
            </SimpleButton>
          }
        </Form>
      </div>
    );
  }
}

export default AerialImagePage;
