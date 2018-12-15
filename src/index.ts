'use strict';

import * as path from 'path';

export const r2gSmokeTest = function () {
  // r2g command line app uses this exported function
  return true;
};


export const getCLIPath = () => {
  return require.resolve('./cli.js');
};

