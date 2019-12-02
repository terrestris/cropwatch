import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import 'moment/locale/de';
moment.locale('de');

class TraitRenderer extends React.Component {

  static propTypes = {
    trait: PropTypes.object,
    value: PropTypes.any
  };

  getDisplaySpan = () => {
    const {
      trait: {
        type,
        unit
      },
      value
    } = this.props;

    let style = {};
    let displayValue = value;

    switch (type) {
      case 'INTEGER':
      case 'DOUBLE PRECISION':
        style.float = 'right';
        if (unit) {
          displayValue = `${value}`;
        }
        break;
      case 'DATE':
      case 'TIME':
      case 'TIMESTAMP':
        style.float = 'right';
        displayValue = moment.utc(value).format('L');
        break;
      case 'VARCHAR':
      default:
        break;
    }

    return <span style={style}>{displayValue}</span>;
  }

  render() {
    return this.getDisplaySpan();
  }
}

export default TraitRenderer;
