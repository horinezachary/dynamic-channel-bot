module.exports = {
  apps : [
      {
        name: "Dynamic VC Bot",
        script: "npm start",
        watch: true,
	ignore_watch : ["db"],
        env: {
          "NODE_ENV": "production"
	  "NODE_PATH": "/root/.nvm/versions/node/v15.2.1/bin/node"
       },
      }
  ]
}
