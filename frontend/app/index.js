import React from 'react';
import { HashRouter } from 'react-router-dom';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { I18nextProvider } from 'react-i18next';
import { MapProvider } from '@terrestris/react-geo';
import websocket from './websocket.js';

import Root from './components/Root/Root.jsx';

import store from './store/store';
import './index.less';
import i18n from './i18n';

import { LocaleProvider } from 'antd';
import german from '../node_modules/antd/lib/locale-provider/de_DE';
import { MapUtils } from './util/MapUtils';

/**
 * Get the map asynchronoulsy from the setupMap functionfrom the MapUtils.
 */
const mapPromise = new Promise((resolve) => {
  if (store.getState()) {
    const map = MapUtils.setupMap(store.getState());
    resolve(map);
  } else {
    const subScribtion = store.subscribe(() => {
      if (store.getState().asyncInitialState.loaded) {
        const map = MapUtils.setupMap(store.getState());
        resolve(map);
        subScribtion();
      }
    });
  }
});

websocket.onopen = () => {
  const jwt = localStorage.getItem('cropwatch_jwt');
  if (jwt) {
    websocket.send(JSON.stringify({
      jwt: localStorage.getItem('cropwatch_jwt'),
      message: 'connect'
    }));
  }
};

render(
  <I18nextProvider i18n={i18n}>
    <LocaleProvider locale={german}>
      <Provider store={store}>
        <MapProvider map={mapPromise}>
          <HashRouter>
            <Root />
          </HashRouter>
        </MapProvider>
      </Provider>
    </LocaleProvider>
  </I18nextProvider>
  ,
  document.getElementById('app')
);
