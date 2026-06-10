import * as migration_20260610_193458_init from './20260610_193458_init';
import * as migration_20260610_200122_courses_syllabus_model from './20260610_200122_courses_syllabus_model';

export const migrations = [
  {
    up: migration_20260610_193458_init.up,
    down: migration_20260610_193458_init.down,
    name: '20260610_193458_init',
  },
  {
    up: migration_20260610_200122_courses_syllabus_model.up,
    down: migration_20260610_200122_courses_syllabus_model.down,
    name: '20260610_200122_courses_syllabus_model'
  },
];
