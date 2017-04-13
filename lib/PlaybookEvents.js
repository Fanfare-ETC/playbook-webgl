'use strict';
/**
 * @enum {string}
 */
const PlaybookEvents = {
  NO_RUNS: 'NO_RUNS',
  RUN_SCORED: 'RUN_SCORED',
  FLY_OUT: 'FLY_OUT',
  TRIPLE_PLAY: 'TRIPLE_PLAY',
  DOUBLE_PLAY: 'DOUBLE_PLAY',
  GROUND_OUT: 'GROUND_OUT',
  STEAL: 'STEAL',
  PICK_OFF: 'PICK_OFF',
  WALK: 'WALK',
  BLOCKED_RUN: 'BLOCKED_RUN',
  STRIKEOUT: 'STRIKEOUT',
  HIT_BY_PITCH: 'HIT_BY_PITCH',
  HOME_RUN: 'HOME_RUN',
  PITCH_COUNT_16: 'PITCH_COUNT_16',
  PITCH_COUNT_17: 'PITCH_COUNT_17',
  SINGLE: 'SINGLE',
  DOUBLE: 'DOUBLE',
  TRIPLE: 'TRIPLE',
  BATTER_COUNT_4: 'BATTER_COUNT_4',
  BATTER_COUNT_5: 'BATTER_COUNT_5',
  MOST_FIELDED_BY_LEFT: 'MOST_FIELDED_BY_LEFT',
  MOST_FIELDED_BY_RIGHT: 'MOST_FIELDED_BY_RIGHT',
  MOST_FIELDED_BY_INFIELDERS: 'MOST_FIELDED_BY_INFIELDERS',
  MOST_FIELDED_BY_CENTER: 'MOST_FIELDED_BY_CENTER',
  UNKNOWN: 'UNKNOWN',

  /**
   * Retrives a Playbook event by its serialized ID.
   * @param {number} id
   * @returns {string}
   */
  getById: function(id) {
    const events = [
      PlaybookEvents.NO_RUNS,
      PlaybookEvents.RUN_SCORED,
      PlaybookEvents.FLY_OUT,
      PlaybookEvents.TRIPLE_PLAY,
      PlaybookEvents.DOUBLE_PLAY,
      PlaybookEvents.GROUND_OUT,
      PlaybookEvents.STEAL,
      PlaybookEvents.PICK_OFF,
      PlaybookEvents.WALK,
      PlaybookEvents.BLOCKED_RUN,
      PlaybookEvents.STRIKEOUT,
      PlaybookEvents.HIT_BY_PITCH,
      PlaybookEvents.HOME_RUN,
      PlaybookEvents.PITCH_COUNT_16,
      PlaybookEvents.PITCH_COUNT_17,
      PlaybookEvents.SINGLE,
      PlaybookEvents.DOUBLE,
      PlaybookEvents.TRIPLE,
      PlaybookEvents.BATTER_COUNT_4,
      PlaybookEvents.BATTER_COUNT_5,
      PlaybookEvents.MOST_FIELDED_BY_LEFT,
      PlaybookEvents.MOST_FIELDED_BY_RIGHT,
      PlaybookEvents.MOST_FIELDED_BY_INFIELDERS,
      PlaybookEvents.MOST_FIELDED_BY_CENTER,
      PlaybookEvents.UNKNOWN
    ];

    return events[id];
  }
};

/** @type {Object.<string, string>} */
const FriendlyNames = {
  [PlaybookEvents.NO_RUNS]: 'No Runs',
  [PlaybookEvents.RUN_SCORED]: 'Run Scored',
  [PlaybookEvents.FLY_OUT]: 'Fly Out',
  [PlaybookEvents.TRIPLE_PLAY]: 'Triple Play',
  [PlaybookEvents.DOUBLE_PLAY]: 'Double Play',
  [PlaybookEvents.GROUND_OUT]: 'Ground Out',
  [PlaybookEvents.STEAL]: 'Steal',
  [PlaybookEvents.PICK_OFF]: 'Pick Off',
  [PlaybookEvents.WALK]: 'Walk',
  [PlaybookEvents.BLOCKED_RUN]: 'Blocked Run',
  [PlaybookEvents.STRIKEOUT]: 'Strikeout',
  [PlaybookEvents.HIT_BY_PITCH]: 'Hit By Pitch',
  [PlaybookEvents.HOME_RUN]: 'Home Run',
  [PlaybookEvents.PITCH_COUNT_16]: 'Pitch Count: 16 & Under',
  [PlaybookEvents.PITCH_COUNT_17]: 'Pitch Count: 17 & Over',
  [PlaybookEvents.SINGLE]: 'Single',
  [PlaybookEvents.DOUBLE]: 'Double',
  [PlaybookEvents.TRIPLE]: 'Triple',
  [PlaybookEvents.BATTER_COUNT_4]: 'Batter Count: 4 & Under',
  [PlaybookEvents.BATTER_COUNT_5]: 'Batter Count: 5 & Over',
  [PlaybookEvents.MOST_FIELDED_BY_LEFT]: 'Most Balls Fielded By: Left',
  [PlaybookEvents.MOST_FIELDED_BY_RIGHT]: 'Most Balls Fielded By: Right',
  [PlaybookEvents.MOST_FIELDED_BY_INFIELDERS]: 'Most Balls Fielded By: Infielders',
  [PlaybookEvents.MOST_FIELDED_BY_CENTER]: 'Most Balls Fielded By: Center',
  [PlaybookEvents.UNKNOWN]: 'UNKNOWN'
};

export default PlaybookEvents;
export { FriendlyNames };
