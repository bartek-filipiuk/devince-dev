import * as migration_20260610_193458_init from './20260610_193458_init';
import * as migration_20260610_200122_courses_syllabus_model from './20260610_200122_courses_syllabus_model';
import * as migration_20260610_205758_phases_letter_field from './20260610_205758_phases_letter_field';
import * as migration_20260611_010838_apps_store_model from './20260611_010838_apps_store_model';
import * as migration_20260611_012513_grants_session_unique from './20260611_012513_grants_session_unique';
import * as migration_20260618_044219_i18n_localized_content from './20260618_044219_i18n_localized_content';
import * as migration_20260618_075115_add_withdrawal_consent from './20260618_075115_add_withdrawal_consent';
import * as migration_20260618_185500_reconcile_program_v_stripe from './20260618_185500_reconcile_program_v_stripe';
import * as migration_20260618_200715_program_price from './20260618_200715_program_price';
import * as migration_20260619_061612_course_landing from './20260619_061612_course_landing';
import * as migration_20260619_150906_claim_grants from './20260619_150906_claim_grants';
import * as migration_20260619_180416_lesson_progress from './20260619_180416_lesson_progress';
import * as migration_20260620_032835_program_featured from './20260620_032835_program_featured';
import * as migration_20260620_194217_products_tiers from './20260620_194217_products_tiers';
import * as migration_20260620_202922_products_tiers_i18n from './20260620_202922_products_tiers_i18n';
import * as migration_20260620_212722_tier_price_localized from './20260620_212722_tier_price_localized';
import * as migration_20260621_093105_grant_purchase_record from './20260621_093105_grant_purchase_record';
import * as migration_20260622_164046_roadmap_global from './20260622_164046_roadmap_global';
import * as migration_20260623_060439_product_screenshots from './20260623_060439_product_screenshots';
import * as migration_20260623_094459_email_tracking from './20260623_094459_email_tracking';
import * as migration_20260709_184011_build_log_hero from './20260709_184011_build_log_hero';
import * as migration_20260709_190834_features_variant from './20260709_190834_features_variant';
import * as migration_20260718_080019_cohort_mode from './20260718_080019_cohort_mode';
import * as migration_20260721_200312_checkout_consent_mode from './20260721_200312_checkout_consent_mode';

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
    name: '20260611_012513_grants_session_unique',
  },
  {
    up: migration_20260618_044219_i18n_localized_content.up,
    down: migration_20260618_044219_i18n_localized_content.down,
    name: '20260618_044219_i18n_localized_content',
  },
  {
    up: migration_20260618_075115_add_withdrawal_consent.up,
    down: migration_20260618_075115_add_withdrawal_consent.down,
    name: '20260618_075115_add_withdrawal_consent',
  },
  {
    up: migration_20260618_185500_reconcile_program_v_stripe.up,
    down: migration_20260618_185500_reconcile_program_v_stripe.down,
    name: '20260618_185500_reconcile_program_v_stripe',
  },
  {
    up: migration_20260618_200715_program_price.up,
    down: migration_20260618_200715_program_price.down,
    name: '20260618_200715_program_price',
  },
  {
    up: migration_20260619_061612_course_landing.up,
    down: migration_20260619_061612_course_landing.down,
    name: '20260619_061612_course_landing',
  },
  {
    up: migration_20260619_150906_claim_grants.up,
    down: migration_20260619_150906_claim_grants.down,
    name: '20260619_150906_claim_grants',
  },
  {
    up: migration_20260619_180416_lesson_progress.up,
    down: migration_20260619_180416_lesson_progress.down,
    name: '20260619_180416_lesson_progress',
  },
  {
    up: migration_20260620_032835_program_featured.up,
    down: migration_20260620_032835_program_featured.down,
    name: '20260620_032835_program_featured',
  },
  {
    up: migration_20260620_194217_products_tiers.up,
    down: migration_20260620_194217_products_tiers.down,
    name: '20260620_194217_products_tiers',
  },
  {
    up: migration_20260620_202922_products_tiers_i18n.up,
    down: migration_20260620_202922_products_tiers_i18n.down,
    name: '20260620_202922_products_tiers_i18n',
  },
  {
    up: migration_20260620_212722_tier_price_localized.up,
    down: migration_20260620_212722_tier_price_localized.down,
    name: '20260620_212722_tier_price_localized',
  },
  {
    up: migration_20260621_093105_grant_purchase_record.up,
    down: migration_20260621_093105_grant_purchase_record.down,
    name: '20260621_093105_grant_purchase_record',
  },
  {
    up: migration_20260622_164046_roadmap_global.up,
    down: migration_20260622_164046_roadmap_global.down,
    name: '20260622_164046_roadmap_global',
  },
  {
    up: migration_20260623_060439_product_screenshots.up,
    down: migration_20260623_060439_product_screenshots.down,
    name: '20260623_060439_product_screenshots',
  },
  {
    up: migration_20260623_094459_email_tracking.up,
    down: migration_20260623_094459_email_tracking.down,
    name: '20260623_094459_email_tracking',
  },
  {
    up: migration_20260709_184011_build_log_hero.up,
    down: migration_20260709_184011_build_log_hero.down,
    name: '20260709_184011_build_log_hero',
  },
  {
    up: migration_20260709_190834_features_variant.up,
    down: migration_20260709_190834_features_variant.down,
    name: '20260709_190834_features_variant',
  },
  {
    up: migration_20260718_080019_cohort_mode.up,
    down: migration_20260718_080019_cohort_mode.down,
    name: '20260718_080019_cohort_mode',
  },
  {
    up: migration_20260721_200312_checkout_consent_mode.up,
    down: migration_20260721_200312_checkout_consent_mode.down,
    name: '20260721_200312_checkout_consent_mode'
  },
];
