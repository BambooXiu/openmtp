/* eslint global-require: off */

import './services/sentry';

import React from 'react';
import { render } from 'react-dom';
import Root from './containers/App/Root';
import { history, store } from './store/configureStore';
import { settingsStorage } from './helpers/storageHelper';
import { copyJsonFileToSettings } from './containers/Settings/actions';
import { initializeI18n } from './i18n';
import { bootstrapAppLanguage } from './i18n/bootstrap';
import './styles/scss/app.global.scss';

const MOUNT_POINT = document.getElementById('root');

const storedSettings = settingsStorage.getItems(['appLanguage']) || {};

bootstrapAppLanguage({
  storedLanguage: storedSettings.appLanguage,
  hydrateLanguage: (appLanguage) => {
    store.dispatch(copyJsonFileToSettings({ appLanguage }));
  },
  initializeLanguage: initializeI18n,
});

render(<Root store={store} history={history} />, MOUNT_POINT);
