import React from 'react';
import PropTypes from 'prop-types';
import { translate } from 'react-i18next';

import { connect } from 'react-redux';

import {SimpleButton} from '@terrestris/react-geo';

import {toggleImprint} from '../../../actions/AppAction';

@connect()
@translate()
class ImprintButton extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    t: PropTypes.func
  };

  onButtonClick = () => {
    this.props.dispatch(toggleImprint());
  }

  render() {
    return (
      <SimpleButton
        className="headerbutton"
        type="primary"
        onClick={this.onButtonClick}
      >
        {this.props.t('ImprintButton.imprint')}
      </SimpleButton>
    );
  }
}

export default ImprintButton;
