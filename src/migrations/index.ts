import * as migration_20260610_193458_init from './20260610_193458_init';

export const migrations = [
  {
    up: migration_20260610_193458_init.up,
    down: migration_20260610_193458_init.down,
    name: '20260610_193458_init'
  },
];
