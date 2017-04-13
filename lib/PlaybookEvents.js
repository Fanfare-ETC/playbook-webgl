'use strict';
/**
 * @enum {string}
 */
const PlaybookEvents = {
  SHUTOUT_INNING: 'SHUTOUT_INNING',
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
  MOST_IN_LEFT_OUTFIELD: 'MOST_IN_LEFT_OUTFIELD',
  MOST_IN_RIGHT_OUTFIELD: 'MOST_IN_RIGHT_OUTFIELD',
  MOST_IN_INFIELD: 'MOST_IN_INFIELD',
  UNKNOWN: 'UNKNOWN',

  /**
   * Retrives a Playbook event by its serialized ID.
   * @param {number} id
   * @returns {string}
   */
  getById: function(id) {
    const events = [
      PlaybookEvents.SHUTOUT_INNING,
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
      PlaybookEvents.MOST_IN_LEFT_OUTFIELD,
      PlaybookEvents.MOST_IN_RIGHT_OUTFIELD,
      PlaybookEvents.MOST_IN_INFIELD,
      PlaybookEvents.UNKNOWN
    ];

    return events[id];
  }
};

/** @type {Object.<string, string>} */
const FriendlyNames = {
  SHUTOUT_INNING: 'Shutout Inning',
  RUN_SCORED: 'Run Scored',
  FLY_OUT: 'Fly Out',
  TRIPLE_PLAY: 'Triple Play',
  DOUBLE_PLAY: 'Double Play',
  GROUND_OUT: 'Ground Out',
  STEAL: 'Steal',
  PICK_OFF: 'Pick Off',
  WALK: 'Walk',
  BLOCKED_RUN: 'Blocked Run',
  STRIKEOUT: 'Strikeout',
  HIT_BY_PITCH: 'Hit By Pitch',
  HOME_RUN: 'Home Run',
  PITCH_COUNT_16: 'Pitch Count: 16 & Under',
  PITCH_COUNT_17: 'Pitch Count: 17 & Over',
  SINGLE: 'Single',
  DOUBLE: 'Double',
  TRIPLE: 'Triple',
  BATTER_COUNT_4: 'Batter Count: 4 & Under',
  BATTER_COUNT_5: 'Batter Count: 5 & Over',
  MOST_IN_LEFT_OUTFIELD: 'Most Balls: Left Outfield',
  MOST_IN_RIGHT_OUTFIELD: 'Most Balls: Right Outfield',
  MOST_IN_INFIELD: 'Most Balls: Infield',
  UNKNOWN: 'UNKNOWN',
};

export default PlaybookEvents;
export { FriendlyNames };
