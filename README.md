# cropwatch

### Requirements
  - npm > v8.3
  - Postgres-Database with schema `auswertung`
    - Configuration at `./backend/config/database.json`
  - Create `./backend/config/database.js` with the following content: And change the password for production!
  ```js
  /**
   * This file should not be pushed to public repositories as it contains database credentials!
   */
  const config = {
    "development": {
      "database": "cropwatch",
      "username": "cropwatch",
      "password": "cropwatch",
      "dialect": "postgres",
      "host": "localhost",
      "port": 5555,
      "protocol": "postgres",
      "schema": "auswertung",
      "logging": false
    },
    "production": {
      "database": "cropwatch",
      "username": "cropwatch",
      "password": "cropwatch",
      "dialect": "postgres",
      "host": "localhost",
      "port": 5432,
      "protocol": "postgres",
      "schema": "auswertung",
      "logging": false
    }
  };

  module.exports = config;
  ```

  - Create `./backend/config/passport.js` with the following content: And change the password!
  ```js
  /**
   * This file should not be pushed to public repositories as it contains the
   * jwt secret!
   */
  module.exports = {
    'secretOrKey': 'My5UPERsecr3tPassw0rd'
  }
  ```
  - Create `./backend/config/projectPassword.js` with the following content: And change the password!
  ```js
  /**
   * This file should not be pushed to public repositories as it contains the
   * project password!
   */
  module.exports = "PR0JECTPA55W0RD";
  ```
  - Create `./backend/config/upload.js` with the following content: And change the credentials!
  ```js
  /**
   * This file should not be pushed to public repositories as it contains the
   * geoserver credentials!
   */
  module.exports = {
    uploadPath: '/data/tractor_images',
    geoserverPath: 'http://USER:PASSWORD@localhost/geoserver/',
    geoserverWorkspace: 'import'
  }
  ```

### Setup
  - Run `npm install` in `./frontend` and `./backend`.

### Development
  - Development with VisualStudio Code (recommended)
    - Run backend in debug mode with `F5`
      - `debugger` can be used
      - Configuration at `./.vsccode/launch.json`
    - Run frontend with `Ctrl + Shift + B` --> `Start frontend`
  - Alternative:
    - Run `npm run start:dev`  in `./backend` and `./frontend`
      - No backend debugging
