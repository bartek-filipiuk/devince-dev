import * as migration_20260610_193458_init from './20260610_193458_init';
import * as migration_20260610_200122_courses_syllabus_model from './20260610_200122_courses_syllabus_model';
import * as migration_20260610_205758_phases_letter_field from './20260610_205758_phases_letter_field';
import * as migration_20260611_010838_apps_store_model from './20260611_010838_apps_store_model';
import * as migration_20260611_012513_grants_session_unique from './20260611_012513_grants_session_unique';

export const migrations = [
  {
    up: migration_20260610_193458_init.up,
    down: migration_20260610_193458_init.down,
    name: '20260610_193458_init',
  },
  {
    up: migration_20260610_200122_courses_syllabus_model.up,
    down: migration_20260610_200122_courses_syllabus_model.down,
    name: '20260610_200122_courses_syllabus_model',
  },
  {
    up: migration_20260610_205758_phases_letter_field.up,
    down: migration_20260610_205758_phases_letter_field.down,
    name: '20260610_205758_phases_letter_field',
  },
  {
    up: migration_20260611_010838_apps_store_model.up,
    down: migration_20260611_010838_apps_store_model.down,
    name: '20260611_010838_apps_store_model',
  },
  {
    up: migration_20260611_012513_grants_session_unique.up,
    down: migration_20260611_012513_grants_session_unique.down,
    name: '20260611_012513_grants_session_unique'
  },
];
