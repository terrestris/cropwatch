module.exports = {
  'presets': [
    '@babel/env',
    '@babel/react'
  ],
  'plugins': [
    '@babel/plugin-proposal-function-bind',
    '@babel/plugin-transform-modules-commonjs',
    '@babel/plugin-transform-react-jsx',
    ['@babel/plugin-proposal-decorators', { legacy: true }],
    ['@babel/plugin-proposal-class-properties', { 'loose': false }]
  ]
};
