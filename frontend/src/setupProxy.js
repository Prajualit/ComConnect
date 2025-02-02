const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const target = process.env.REACT_APP_IN_DOCKER 
    ? 'http://backend:5000' 
    : 'http://localhost:5000';

  app.use(
    ['/api', '/socket.io'],
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
    })
  );
};