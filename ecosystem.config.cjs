module.exports = {
  apps: [
    {
      name: "wzd-agent",
      script: "server/index.js",
      cwd: "/opt/wzd-app",
      env: {
        NODE_ENV: "production",
        PORT: 8787
      }
    }
  ]
};
