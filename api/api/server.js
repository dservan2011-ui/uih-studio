{
  "name": "uih-studio",
  "version": "1.0.0",
  "description": "UIH Marketing Studio — Dr. Luis Alfonso Servín",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev":   "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "sharp":   "^0.33.3",
    "openai":  "^4.47.0",
    "cors":    "^2.8.5",
    "dotenv":  "^16.4.5"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}