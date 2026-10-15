import joi from 'joi';
import React from 'react';
import { BuildOutlined } from '@ant-design/icons';
import cloneDeep from '@educandu/educandu/utils/clone-deep.js';
import { PLUGIN_GROUP } from '@educandu/educandu/domain/constants.js';
import { DEFAULT, METERS, VALUES, validBlocks } from './rhythm-model.js';

export const stateSchema = joi
  .object({
    meter: joi
      .string()
      .valid(...METERS)
      .required(),
    bars: joi.number().valid(1, 2, 4, 8).required(),
    tempo: joi.number().integer().min(40).max(200).required(),
    mix: joi.number().integer().min(0).max(100).required(),
    notes: joi.boolean().required(),
    dotted: joi.boolean().required(),
    beamed: joi.boolean().required(),
    loop: joi.boolean().required(),
    countIn: joi.boolean().required(),
    blocks: joi
      .array()
      .max(192)
      .items(
        joi.object({
          id: joi.number().integer().min(1).required(),
          start: joi.number().integer().min(0).required(),
          n: joi
            .number()
            .valid(...VALUES)
            .required()
        })
      )
      .required()
  })
  .custom((value, helpers) =>
    validBlocks(value) ? value : helpers.error('any.invalid')
  )
  .unknown(false)
  .required();

export default class TaktKlickToolInfo {
  static typeName = 'raphael-mayrhofer/educandu-plugin-takt-klick-tool';
  allowsInput = true;
  getDisplayName(t) {
    return t(`${TaktKlickToolInfo.typeName}:name`);
  }
  getIcon() {
    return <BuildOutlined />;
  }
  getGroups() {
    return [PLUGIN_GROUP.other];
  }
  async resolveDisplayComponent() {
    return (await import('./takt-klick-tool-display.js')).default;
  }
  async resolveEditorComponent() {
    return (await import('./takt-klick-tool-editor.js')).default;
  }
  getDefaultContent() {
    return cloneDeep(DEFAULT);
  }
  validateContent(content) {
    joi.attempt(content, stateSchema, {
      abortEarly: false,
      convert: false,
      noDefaults: true
    });
  }
  cloneContent(content) {
    return cloneDeep(content);
  }
}
