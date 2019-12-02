import React from 'react';
import PropTypes from 'prop-types';

export default class EntityRenderer extends React.Component {

  static propTypes = {
    value: PropTypes.any,
    displayNames: PropTypes.object
  };

  getDisplaySpan = () => {
    const {
      displayNames,
      value
    } = this.props;
    const displayValue = displayNames[value] ?
      `${displayNames[value]} (${value})` :
      value;
    return <span>{displayValue}</span>;
  }

  render() {
    return this.getDisplaySpan();
  }
}
