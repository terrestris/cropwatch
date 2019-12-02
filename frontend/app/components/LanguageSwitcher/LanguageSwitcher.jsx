import React from 'react';
import PropTypes from 'prop-types';
import {translate} from 'react-i18next';
import {
  Dropdown,
  Menu,
  Icon
} from 'antd';
import i18n from '../../i18n';

@translate()
class LanguageSwitcher extends React.Component {

  static propTypes = {
    languages: PropTypes.array,
    language: PropTypes.string,
    dispatch: PropTypes.func,
    t: PropTypes.func
  }

  onChange = language => {
    i18n.changeLanguage(language);
  }

  getLanguageMenu = () => {
    const {
      languages,
      t
    } = this.props;
    const items = languages.map(language => {
      return <Menu.Item key={language}>
        <div
          onClick={()=> {this.onChange(language);}}
        >
          {t(`LanguageSwitcher.languages.${language}`)}
        </div>
      </Menu.Item>;
    });
    return (
      <Menu>
        {items}
      </Menu>
    );
  }

  render() {
    const {
      language,
      t
    } = this.props;

    return (
      <Dropdown overlay={this.getLanguageMenu()} trigger={['click']}>
        <span style={{ userSelect: 'none' }}>
          {t(`LanguageSwitcher.language`)} <Icon type="down" /> {language}
        </span>
      </Dropdown>
    );
  }
}

export default LanguageSwitcher;
