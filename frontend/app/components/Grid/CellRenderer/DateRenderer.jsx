import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import 'moment/locale/de';
moment.locale('de');

export default class DateRenderer extends React.Component {

  static propTypes = {
    value: PropTypes.any
  };

  render() {
    const text = this.props.value ? moment.utc(this.props.value).format('L LTS') : '';
    return (
      <span style={{
        float: 'right'
      }}>
        {text}
      </span>
    );
  }
}
