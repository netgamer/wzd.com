module.exports = {
  apps: [
    {
      name: "wzd-agent",
      script: "server/index.js",
      cwd: process.env.APP_DIR || "/home/leejunho2638/wzd-app",
      env: {
        NODE_ENV: "production",
        PORT: 8787
      }
    }
  ]
};
