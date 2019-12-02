import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-i18next';
import { Modal } from 'antd';
import { SimpleButton } from '@terrestris/react-geo';

import { toggleImprint } from '../../../actions/AppAction';

import terrestrisLogoWithTitle from '../../../resources/img/logo_terrestris_title.png';

@connect((store) => {
  return {
    open: store.app.imprintVisible
  };
})
@translate()
class ImprintDialog extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    width: PropTypes.number,
    open: PropTypes.bool,
    t: PropTypes.func
  };

  onButtonPress = () => {
    this.props.dispatch(toggleImprint());
  }

  render() {
    const {
      t
    } = this.props;
    const actions = [
      <SimpleButton
        key="1"
        type="primary"
        onClick={this.onButtonPress}
      >
        {t('ImprintDialog.close')}
      </SimpleButton>
    ];

    return (
      <Modal
        title={t('ImprintDialog.imprint')}
        actions={actions}
        visible={this.props.open}
        onOk={this.onButtonPress}
        onCancel={this.onButtonPress}
        bodyStyle={{overflow: 'auto'}}
      >
        <address style={{
          padding: '5px',
          fontFamily: 'arial,sans-serif',
          lineHeight: '1.3em'
        }}>
          <p style={{margin: '10px',fontSize: '0.9em'}}>{t('ImprintDialog.technicalImplementation')}</p>
          <img style={{margin: '2px 0 2px 10px'}}
            src={terrestrisLogoWithTitle}/>
          <p style={{margin: '10px'}}>
            <span style={{fontSize: 'smaller'}}>
              terrestris GmbH &amp; Co. KG<br/>
              Kölnstraße 99<br/>
              53111 Bonn<br/>
              {t('ImprintDialog.phone')}: <a href="tel:+4922896289951">+49 228 – 962 899 51</a><br/>
              {t('ImprintDialog.fax')}: +49 228 – 962 899 57<br/>
              <a href="mailto:info@terrestris.de">info@terrestris.de</a><br/>
              <a target="_blank" rel="noopener noreferrer" href="http://www.terrestris.de">www.terrestris.de</a>
            </span>
          </p>
        </address>
      </Modal>
    );
  }
}

export default ImprintDialog;
