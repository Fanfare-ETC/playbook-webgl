'use strict';
import * as PIXI from 'pixi.js';
import 'pixi-action';
import EventEmitter from 'eventemitter3';

import PlaybookEvents,
  { FriendlyNames as PlaybookEventsFriendlyNames } from './lib/PlaybookEvents';

// The Playbook Bridge is supplied via addJavaScriptInterface() on the Java
// side of the code. In the absence of that, we need to mock one.
if (!global.PlaybookBridge) {
  /** @type {Object<string, function>} */
  global.PlaybookBridge = {
    /**
     * Returns the URL of the WebSocket server.
     * @returns {string}
     */
    getAPIUrl: function () {
      return 'ws://localhost:9001';
    },

    /**
     * Returns the URL of the Section API server.
     * @returns {string}
     */
    getSectionAPIUrl: function () {
      return 'http://localhost:9002';
    },

    /**
     * Returns the ID of the current player.
     * This is stubbed.
     * @returns {string}
     */
    getPlayerID: function () {
      return 1;
    },

    /**
     * Notifies the hosting application of the new state of the game.
     * This is a no-op for the mock bridge.
     * @type {string} stateJSON
     */
    notifyGameState: function (stateJSON) {
      console.log('Saving state: ' , stateJSON);
      localStorage.setItem('prediction', stateJSON);
    },

    /**
     * Notifies the hosting application that we have finished loading.
     * This is a no-op for the mock bridge.
     */
    notifyLoaded: function () {
      const restoredState = localStorage.getItem('prediction');
      console.log('Loading state: ', restoredState);
      if (restoredState != null) {
        state.fromJSON(restoredState);
      }
    }
  };
} else {
  // Receive messages from the hosting application.
  global.addEventListener('message', function (e) {
    const message = e.data;
    switch (message.action) {
      case 'RESTORE_GAME_STATE':
        console.log('Restoring state from hosting application: ');
        state.fromJSON(message.payload);
        break;
      case 'HANDLE_MESSAGE':
        console.log('Handling message from hosting application: ');
        handleIncomingMessage(message.payload);
        break;
    }
  });
}

const GameStages = {
  INITIAL: 'INITIAL',
  CONTINUE: 'CONTINUE',
  CONFIRMED: 'CONFIRMED'
};

const ScoreValues = {
  SHUTOUT_INNING: 4,
  RUN_SCORED: 4,
  FLY_OUT: 2,
  TRIPLE_PLAY: 1400,
  DOUBLE_PLAY: 20,
  GROUND_OUT: 2,
  STEAL: 5,
  PICK_OFF: 7,
  WALK: 3,
  BLOCKED_RUN: 10,
  STRIKEOUT: 2,
  HIT_BY_PITCH: 2,
  HOME_RUN: 10,
  PITCH_COUNT_16: 2,
  PITCH_COUNT_17: 2,
  SINGLE: 3,
  DOUBLE: 5,
  TRIPLE: 20,
  BATTER_COUNT_4: 2,
  BATTER_COUNT_5: 2,
  MOST_IN_LEFT_OUTFIELD: 2,
  MOST_IN_RIGHT_OUTFIELD: 2,
  MOST_IN_INFIELD: 2
};

/**
 * Game state.
 */
class GameState {
  constructor() {
    /** @type {Object.<string, number>} */
    this.predictionCounts = {};

    /** @type {string} */
    this._stage = GameStages.INITIAL;

    /** @type {Array<Ball>} */
    this.balls = new Array();

    /** @type {number} */
    this.score = 0;

    /** @type {EventEmitter} */
    this.emitter = new EventEmitter();
  }

  /**
   * @returns {string}
   */
  get stage() {
    return this._stage;
  }

  /**
   * @param {string} value
   */
  set stage(value) {
    const oldValue = this._stage;
    this._stage = value;
    console.log('stage->', value);
    this.emitter.emit(this.EVENT_STAGE_CHANGED, value, oldValue);
    PlaybookBridge.notifyGameState(this.toJSON());
  }

  /**
   * Returns the game state as JSON.
   * @returns {string}
   */
  toJSON() {
    const savedState = {
      stage: this._stage,
      score: this.score,
      balls: this.balls.map(ball => {
        return {
          selectedTarget: ball.selectedTarget ? ball.selectedTarget.name : null
        };
      })
    };

    return JSON.stringify(savedState);
  }

  /**
   * Restores the game state from JSON.
   * @param {string} state
   */
  fromJSON(state) {
    const restoredState = JSON.parse(state);

    const fieldOverlay = stage.getChildByName('fieldOverlay');
    restoredState.balls.forEach((ball, i) => {
      if (ball.selectedTarget !== null) {
        const area = fieldOverlay.getChildByName(ball.selectedTarget);
        this.balls[i].moveToField(area, false);
        makePrediction(this, area, this.balls[i]);
      }
    });

    // Restore this later because makePrediction changes the state.
    this.stage = restoredState.stage;
    this.score = restoredState.score;
  }
}

const connection = new WebSocket(PlaybookBridge.getAPIUrl());
const renderer = PIXI.autoDetectRenderer(1080, 1920, { resolution: window.devicePixelRatio });
const stage = new PIXI.Container();
const state = new GameState();

/**
 * Sets up the renderer. Adjusts the renderer according to the size of the
 * viewport, and adds it to the DOM tree.
 * @param {PIXI.WebGLRenderer} renderer
 */
function configureRenderer(renderer) {
  const resizeToFitWindow = function (renderer) {
    renderer.resize(window.innerWidth, window.innerHeight);
  };

  renderer.view.style.position = 'absolute';
  renderer.view.style.display = 'block';
  renderer.autoResize = true;
  resizeToFitWindow(renderer);
  document.body.appendChild(renderer.view);
  window.addEventListener('resize', resizeToFitWindow.bind(this, renderer));
};

/**
 * Sets up the WebSocket connection.
 * @param {WebSocket} connection
 */
function configureWebSocket(connection) {
  connection.addEventListener('open', function () {
    console.log(`Connected to ${connection.url}`);
  });

  connection.addEventListener('message', function (message) {
    message = JSON.parse(message.data);
    handleIncomingMessage(message);
  });
};

/**
 * Handles incoming messages.
 * @param {Object} message
 * @param {string} message.event
 * @param {*} message.data
 */
function handleIncomingMessage(message) {
  switch (message.event) {
    case 'server:playsCreated':
      handlePlaysCreated(message.data);
      break;
    case 'server:clearPredictions':
      handleClearPredictions();
      break;
    default:
  }
}

/**
 * Handles plays created event.
 * @param {Array.<number>} events
 */
function handlePlaysCreated(events) {
  if (state.stage === GameStages.CONFIRMED) {
    const plays = events.map(PlaybookEvents.getById);
    for (const play of plays) {
      state.score += ScoreValues[play];
      reportScore(ScoreValues[play]);
      const overlay = new PredictionCorrectOverlay(play);
      initPredictionCorrectOverlayEvents(overlay);
      stage.addChild(overlay);
      renderer.isDirty = true;
    }
  }
}

/**
 * Handle clear predictions event.
 */
function handleClearPredictions() {
  state.balls.forEach((ball, i) => {
    const fieldOverlay = stage.getChildByName('fieldOverlay');
    const ballSlot = stage.getChildByName('ballSlot');
    undoPrediction(state, ball.selectedTarget, ball);
    ball.moveToSlot(ballSlot, i);
  });

  state.stage = GameStages.INITIAL;
}

/**
 * Report a scoring event to the server.
 * @param {number} score
 */
function reportScore(score) {
  const request = new XMLHttpRequest();
  request.open('POST', `${PlaybookBridge.getSectionAPIUrl()}/updateScore`);
  request.setRequestHeader('Content-Type', 'application/json');
  request.send(JSON.stringify({
    cat: 'predict',
    predictScore: score,
    id: PlaybookBridge.getPlayerID()
  }));
}

/**
 * Prediction correct overlay.
 */
class PredictionCorrectOverlay extends PIXI.Container {
  /**
   * @param {string} event
   */
  constructor(event) {
    super();

    /** @type {PIXI.Graphics} */
    this.background = new PIXI.Graphics();
    this.background.beginFill(0x000000, 0.75);
    this.background.drawRect(0, 0, window.innerWidth, window.innerHeight);
    this.background.endFill();
    this.addChild(this.background);

    /** @type {PIXI.Sprite} */
    this.ball = new PIXI.Sprite(PIXI.loader.resources['resources/Item-Ball-Rotated.png'].texture);
    const ballScale = window.innerWidth / this.ball.texture.width;
    this.ball.scale.set(ballScale, ballScale);
    this.ball.position.set(window.innerWidth / 2, window.innerHeight / 2);
    this.ball.anchor.set(0.5, 0.5);
    this.addChild(this.ball);

    /** @type {PIXI.Text} */
    this.text = new PIXI.Text();
    this.text.position.set(window.innerWidth / 2, window.innerHeight / 2);
    this.text.anchor.set(0.5, 0.5);
    this.text.text = `Prediction correct:\n ${PlaybookEventsFriendlyNames[event]}\n\nYour score is: ${state.score}`;
    this.text.style.fontFamily = 'proxima-nova';
    this.text.style.fontWeight = 'bold';
    this.text.style.fontSize = 24.0;
    this.text.style.align = 'center';
    this.addChild(this.text);
  }
}

/**
 * Field overlay.
 */
class FieldOverlay extends PIXI.Sprite {
  /**
   * Constructs the field overlay given the overlay areas.
   * The balls are needed to determine the drop targets.
   * @param {Object.<string, PIXI.Polygon>} areas
   * @param {Array.<Ball>} balls
   */
  constructor(areas, balls) {
    const texture = PIXI.loader.resources['resources/Prediction-Overlay.png'].texture;
    super(texture);

    /** @type {Array.<Ball>} */
    this._balls = balls;

    Object.keys(areas).forEach(event => {
      const points = areas[event].points.map((point, index) => {
        if (index % 2 === 0) {
          return point - texture.width / 2;
        } else {
          return point - texture.height / 2;
        }
      });

      const area = new FieldOverlayArea(new PIXI.Polygon(points));
      area.name = event;
      area.interactive = true;
      area.alpha = 0;
      area.beginFill(0x000000);
      area.drawPolygon(points);
      area.endFill();

      const moveNextBallToField = () => {
        const nextBall = balls.find(ball => ball.selectedTarget === null);
        if (nextBall !== undefined) {
          nextBall.moveToField(area);
          makePrediction(state, area, nextBall);
        }
      }

      area
        .on('touchstart', area.highlight)
        .on('tap', area.clearHighlight)
        .on('tap', moveNextBallToField)
        .on('touchendoutside', area.clearHighlight)
        .on('touchcanceled', area.clearHighlight);
      this.addChild(area);
    });
  }

  clearHighlightAreas() {
    this.children.forEach(child => child.clearHighlight());
  }

  /**
   * Retrieves an overlay area given a point in world space.
   * @param {PIXI.Point} point
   * @returns {FieldOverlayArea?}
   */
  getAreaByPoint(point) {
    return this.children.find(child => {
      const local = this.toLocal(point);
      return child.hitArea.contains(local.x, local.y);
    });
  }

  update() {
    // Unhighlight all field overlays.
    this.clearHighlightAreas();

    // Highlight areas where ball is above.
    this._balls.filter(ball => ball.isBeingDragged && ball.dragTarget)
      .forEach(ball => ball.dragTarget.highlight());
  }
}

/**
 * Field overlay highlighted area.
 */
class FieldOverlayArea extends PIXI.Graphics {
  /**
   * Constructs a field overlay area defined by the given polygon.
   * @param {PIXI.Polygon} area
   */
  constructor(area) {
    super();
    this.hitArea = area;

    /** @type {bool} */
    this._highlighted = false;
  }

  highlight() {
    this.alpha = 0.2;
    this._highlighted = true;
    renderer.isDirty = true;
  }

  clearHighlight() {
    this.alpha = 0;
    this._highlighted = false;
    renderer.isDirty = true;
  }

  isHighlighted() {
    return this._highlighted;
  }

  /**
   * Returns the centroid of the overlay area. The center is defined in terms
   * of the local space of the field overlay.
   *
   * Computed using: https://en.wikipedia.org/wiki/Centroid#Centroid_of_polygon
   *
   * @returns {PIXI.Point}
   */
  getCentroid() {
    const points = this.hitArea.points;
    const numPoints = points.length / 2;
    const getXAt = (i) => points[(i * 2)];
    const getYAt = (i) => points[(i * 2) + 1];

    // Compute the area. Note that this produces a negative result since we
    // have our points laid out in counter-clockwise fashion.
    let area = 0;
    for (let i = 0; i < numPoints; i++) {
      if (i === numPoints - 1) {
        area += (getXAt(i) * getYAt(0) - getXAt(0) * getYAt(i));
      } else {
        area += (getXAt(i) * getYAt(i + 1) - getXAt(i + 1) * getYAt(i));
      }
    }
    area /= 2;

    let centroid = new PIXI.Point();
    for (let i = 0; i < numPoints; i++) {
      if (i === numPoints - 1) {
        centroid.x += (getXAt(i) + getXAt(0)) * (getXAt(i) * getYAt(0) - getXAt(0) * getYAt(i));
        centroid.y += (getYAt(i) + getYAt(0)) * (getXAt(i) * getYAt(0) - getXAt(0) * getYAt(i));
      } else {
        centroid.x += (getXAt(i) + getXAt(i + 1)) * (getXAt(i) * getYAt(i + 1) - getXAt(i + 1) * getYAt(i));
        centroid.y += (getYAt(i) + getYAt(i + 1)) * (getXAt(i) * getYAt(i + 1) - getXAt(i + 1) * getYAt(i));
      }
    }
    centroid.x /= area * 6;
    centroid.y /= area * 6;
    return centroid;
  }
}

/**
 * Ball.
 */
class Ball {
  constructor() {
    /** @type {PIXI.Sprite?} */
    this.sprite = null;

    /** @type {bool} */
    this.isBeingDragged = false;

    /** @type {int?} */
    this.dragPointerId = null;

    /** @type {PIXI.Point?} */
    this.dragOffset = null;

    /** @type {PIXI.Point?} */
    this.dragOrigPosition = null;

    /** @type {FieldOverlayArea?} */
    this.dragTarget = null;

    /** @type {bool} */
    this.isAnimating = false;

    /** @type {FieldOverlayArea?} */
    this.selectedTarget = null;
  }

  /**
   * Moves this ball to a specific position in world space with animation.
   * @param {PIXI.Point} position
   * @return {PIXI.action.Sequence}
   */
  _moveToWithAnimation(position) {
    const moveTo = new PIXI.action.MoveTo(position.x, position.y, 0.25);
    const callFunc = new PIXI.action.CallFunc(() => this.isAnimating = false);
    const sequence = new PIXI.action.Sequence([moveTo, callFunc]);
    this.isAnimating = true;
    PIXI.actionManager.runAction(this.sprite, sequence);
    return sequence;
  }

  /**
   * Moves this ball to its original location.
   */
  moveToOrigPosition() {
    this._moveToWithAnimation(this.dragOrigPosition);
  }

  /**
   * Moves this ball to a specific slot.
   * @param {PIXI.Sprite} ballSlot
   * @param {number} slot
   */
  moveToSlot(ballSlot, slot) {
    this._moveToWithAnimation(getBallPositionForSlot(this.sprite.texture, ballSlot, slot));
  }

  /**
   * Moves this ball to the field.
   * @param {FieldOverlayArea} area
   * @param {bool} withAnimation
   */
  moveToField(area, withAnimation = true) {
    let center = area.parent.toGlobal(area.getCentroid());

    // Determine if we need to run an animation.
    if (withAnimation) {
      this._moveToWithAnimation(center);
    } else {
      this.sprite.position.set(center.x, center.y);
      renderer.isDirty = true;
    }
  }
}

/**
 * Sets up events for a ball.
 * @param {Ball} ball
 * @param {PIXI.Sprite} ballSlot
 * @param {FieldOverlay} fieldOverlay
 */
function initBallEvents(ball, ballSlot, fieldOverlay) {
  ball.sprite.interactive = true;
  ball.sprite.hitArea = new PIXI.Circle(0, 0, ball.sprite.texture.width / 2);

  // Listen for changes to state.
  state.emitter.on(state.EVENT_STAGE_CHANGED, function (value) {
    if (value === GameStages.CONFIRMED) {
      ball.sprite.interactive = false;
      ball.sprite.tint = 0x999999;
    } else {
      ball.sprite.interactive = true;
      ball.sprite.tint = 0xffffff;
    }
  });

  const onTouchStart = function (e) {
    // Don't allow interaction if ball is being animated.
    if (ball.isAnimating) { return; }

    ball.isBeingDragged = true;
    ball.dragPointerId = e.data.identifier;
    ball.dragOffset = e.data.getLocalPosition(ball.sprite);
    ball.dragOffset.x *= ball.sprite.scale.x;
    ball.dragOffset.y *= ball.sprite.scale.y;
    ball.dragOrigPosition = new PIXI.Point(
      ball.sprite.position.x,
      ball.sprite.position.y
    );
  };

  const onTouchMove = function (e) {
    if (ball.isBeingDragged &&
        ball.dragPointerId === e.data.identifier) {
      ball.sprite.position.set(
        e.data.global.x - ball.dragOffset.x,
        e.data.global.y - ball.dragOffset.y
      );

      // Check if we're above a field overlay.
      ball.dragTarget = fieldOverlay.getAreaByPoint(new PIXI.Point(
        e.data.global.x,
        e.data.global.y
      ));

      // Re-render the scene.
      renderer.isDirty = true;
    }
  };

  const onTouchEnd = function (e) {
    // Don't allow interaction if ball is being animated.
    if (ball.isAnimating || !ball.isBeingDragged) { return; }
    ball.isBeingDragged = false;

    // If there's a drag target, move the ball there.
    if (ball.dragTarget) {
      ball.moveToField(ball.dragTarget);
      makePrediction(state, ball.dragTarget, ball);
    } else if (ball.selectedTarget &&
               ballSlot.getBounds().contains(e.data.global.x, e.data.global.y)) {
      undoPrediction(state, ball.selectedTarget, ball);
      ball.moveToSlot(ballSlot, state.balls.indexOf(ball));
    } else {
      ball.moveToOrigPosition();
    }

    fieldOverlay.clearHighlightAreas();
  };

  ball.sprite
    .on('touchstart', onTouchStart)
    .on('touchmove', onTouchMove)
    .on('touchend', onTouchEnd)
    .on('touchendoutside', onTouchEnd)
    .on('touchcancel', onTouchEnd);
}

/**
 * Initializes events for the continue banner.
 * @param {PIXI.Sprite} continueBanner
 */
function initContinueBannerEvents(continueBanner) {
  state.emitter.on(state.EVENT_STAGE_CHANGED, function (stage) {
    continueBanner.visible = stage === GameStages.CONTINUE;
    renderer.isDirty = true;
  });

  continueBanner.interactive = true;
  continueBanner.on('tap', function () {
    state.stage = GameStages.CONFIRMED;
  });
}

/**
 * Initializes events for the prediction correct overlay.
 */
function initPredictionCorrectOverlayEvents(overlay) {
    overlay.interactive = true;
    overlay.on('tap', () => {
      overlay.destroy();
      renderer.isDirty = true;
    });
}

/**
 * Sets up the field overlay.
 * @param {Array.<Ball>} balls
 * @returns {FieldOverlay}
 */
function createFieldOverlay(balls) {
  const areas = {
    [PlaybookEvents.HOME_RUN]: new PIXI.Polygon([
      720.0, 1078.0,
      796.0, 1046.0,
      826.0, 970.0,
      796.0, 894.0,
      720.0, 862.0,
      644.0, 894.0,
      614.0, 970.0,
      644.0, 1046.0
    ]),
    [PlaybookEvents.TRIPLE]: new PIXI.Polygon([
      530.0, 1152.0,
      632.0, 1050.0,
      602.0, 970.0,
      632.0, 890.0,
      530.0, 788.0,
      476.0, 868.0,
      456.0, 970.0,
      476.0, 1072.0
    ]),
    [PlaybookEvents.DOUBLE]: new PIXI.Polygon([
      538.0, 780.0,
      640.0, 882.0,
      720.0, 854.0,
      800.0, 882.0,
      902.0, 780.0,
      824.0, 730.0,
      720.0, 708.0,
      616.0, 730.0
    ]),
    [PlaybookEvents.SINGLE]: new PIXI.Polygon([
      910.0, 1152.0,
      964.0, 1072.0,
      984.0, 970.0,
      964.0, 868.0,
      910.0, 788.0,
      808.0, 890.0,
      838.0, 970.0,
      808.0, 1050.0
    ]),
    [PlaybookEvents.STEAL]: new PIXI.Polygon([
      538.0, 1162.0,
      616.0, 1214.0,
      720.0, 1236.0,
      824.0, 1214.0,
      902.0, 1162.0,
      800.0, 1060.0,
      720.0, 1090.0,
      640.0, 1060.0
    ]),
    [PlaybookEvents.MOST_IN_INFIELD]: new PIXI.Polygon([
      12.0, 966.0,
      172.0, 966.0,
      720.0, 422.0,
      1268.0, 966.0,

      1428.0, 966.0,
      1398.0, 766.0,
      1306.0, 562.0,
      1202.0, 452.0,
      1120.0, 388.0,
      1026.0, 332.0,
      926.0, 296.0,
      720.0, 262.0,
      514.0, 296.0,
      414.0, 332.0,
      320.0, 388.0,
      238.0, 452.0,
      134.0, 562.0,
      42.0, 766.0
    ]),
    [PlaybookEvents.MOST_IN_RIGHT_OUTFIELD]: new PIXI.Polygon([
      1428.0, 830.0,
      1428.0, 12.0,
      728.0, 12.0,
      728.0, 252.0,
      900.0, 286.0,
      1126.0, 376.0,
      1328.0, 568.0
    ]),
    [PlaybookEvents.MOST_IN_LEFT_OUTFIELD]: new PIXI.Polygon([
      12.0, 830.0,
      112.0, 568.0,
      314.0, 376.0,
      500.0, 286.0,
      712.0, 252.0,
      712.0, 12.0,
      12.0, 12.0
    ]),
    [PlaybookEvents.SHUTOUT_INNING]: new PIXI.Polygon([
      726.0, 442.0,
      726.0, 696.0,
      916.0, 778.0,
      996.0, 966.0,
      1252.0, 966.0
    ]),
    [PlaybookEvents.RUN_SCORED]: new PIXI.Polygon([
      714.0, 442.0,
      188.0, 966.0,
      444.0, 966.0,
      524.0, 778.0,
      714.0, 696.0
    ]),
    [PlaybookEvents.FLY_OUT]: new PIXI.Polygon([
      726.0, 1526.0,
      1252.0, 978.0,
      1000.0, 978.0,
      920.0, 1168.0,
      726.0, 1250.0
    ]),
    [PlaybookEvents.GROUND_OUT]: new PIXI.Polygon([
      714.0, 1526.0,
      714.0, 1250.0,
      520.0, 1168.0,
      440.0, 978.0,
      188.0, 978.0
    ]),
    [PlaybookEvents.BATTER_COUNT_5]: new PIXI.Polygon([
      1010.0, 1242.0,
      1428.0, 1242.0,
      1428.0, 980.0,
      1270.0, 980.0
    ]),
    [PlaybookEvents.BATTER_COUNT_4]: new PIXI.Polygon([
      720.0, 1512.0,
      1428.0, 1512.0,
      1428.0, 1252.0,
      998.0, 1252.0
    ]),
    [PlaybookEvents.PITCH_COUNT_17]: new PIXI.Polygon([
      12.0, 1242.0,
      430.0, 1242.0,
      170.0, 980.0,
      12.0, 980.0
    ]),
    [PlaybookEvents.PITCH_COUNT_16]: new PIXI.Polygon([
      12.0, 1512.0,
      720.0, 1512.0,
      442.0, 1252.0,
      12.0, 1252.0
    ]),
    [PlaybookEvents.STRIKEOUT]: new PIXI.Polygon([
      12.0, 1738.0,
      1428.0, 1738.0,
      1428.0, 1526.0,
      12.0, 1526.0
    ])
  };

  return new FieldOverlay(areas, balls);
};

/**
 * Returns the world space position for a ball slot.
 * @param {PIXI.Texture} ballTexture
 * @param {PIXI.Sprite} ballSlot
 * @param {Number} i
 */
function getBallPositionForSlot(ballTexture, ballSlot, i) {
  const ballScale = ballSlot.texture.height / ballTexture.height / 1.5;
  return ballSlot.toGlobal(new PIXI.Point(
    120 + ballTexture.width * i * ballScale,
    ballSlot.texture.height / 2
  ));
};


/**
 * Makes a prediction using the specified ball.
 * @param {GameState} state
 * @param {FieldOverlayArea} area
 * @param {Ball} ball
 */
function makePrediction(state, area, ball) {
  if (ball.selectedTarget !== null) {
    undoPrediction(state, ball.selectedTarget, ball);
  }

  ball.selectedTarget = area;

  if (state.predictionCounts[area.name] === undefined) {
    state.predictionCounts[area.name] = 0;
  }

  state.predictionCounts[area.name]++;

  // Check if all the balls have selected targets.
  if (state.balls.every(ball => ball.selectedTarget)) {
    state.stage = GameStages.CONTINUE;
  } else {
    stage.stage = GameStages.INITIAL;
  }

  PlaybookBridge.notifyGameState(state.toJSON());
  console.log('makePrediction->', state.predictionCounts);
}

/**
 * Undoes a prediction using the specified ball.
 * @param {GameState} state
 * @param {FieldOverlayArea} name
 * @param {Ball} ball
 */
function undoPrediction(state, area, ball) {
  state.predictionCounts[area.name]--;
  if (state.predictionCounts[area.name] === 0) {
    delete state.predictionCounts[area.name];
  }

  ball.selectedTarget = null;

  // Check if all the balls have selected targets.
  if (state.stage === GameStages.CONTINUE) {
    state.stage = GameStages.INITIAL;
  }

  PlaybookBridge.notifyGameState(state.toJSON());
  console.log('undoPrediction->', state.predictionCounts);
}

function setup() {
  // Add grass to screen.
  const grassTexture = PIXI.loader.resources['resources/Prediction-BG-Grass.jpg'].texture;
  const grass = new PIXI.Sprite(grassTexture);
  grass.scale.x = window.innerWidth / grassTexture.width;
  grass.scale.y = window.innerHeight / grassTexture.height;
  grass.zOrder = 0;
  stage.addChild(grass);

  // Add banner on top to screen.
  const bannerTexture = PIXI.loader.resources['resources/Prediction-Banner.png'].texture
  const banner = new PIXI.Sprite(bannerTexture);
  const bannerScale = window.innerWidth / bannerTexture.width;
  const bannerHeight = bannerScale * bannerTexture.height;
  banner.scale.set(bannerScale, bannerScale);
  banner.zOrder = 1;
  stage.addChild(banner);

  // Add ball slot to screen.
  const ballSlotTexture = PIXI.loader.resources['resources/Prediction-Holder-BallsSlot.png'].texture;
  const ballSlot = new PIXI.Sprite(ballSlotTexture);
  const ballSlotScale = window.innerWidth / ballSlotTexture.width;
  const ballSlotHeight = ballSlotScale * ballSlotTexture.height;
  ballSlot.name = 'ballSlot';
  ballSlot.position.set(0, window.innerHeight - ballSlotHeight);
  ballSlot.scale.set(ballSlotScale, ballSlotScale);
  ballSlot.zOrder = 2;
  stage.addChild(ballSlot);

  // Add overlay to screen.
  const fieldOverlay = createFieldOverlay(state.balls);
  const fieldOverlayScaleX = window.innerWidth / fieldOverlay.texture.width;
  const fieldOverlayScaleY = (window.innerHeight - bannerHeight - ballSlotHeight) / fieldOverlay.texture.height;
  const fieldOverlayScale = Math.min(fieldOverlayScaleX, fieldOverlayScaleY);
  const fieldOverlayHeight = fieldOverlayScale * fieldOverlay.texture.height;
  fieldOverlay.name = 'fieldOverlay';
  fieldOverlay.position.set(
    window.innerWidth / 2,
    (window.innerHeight - bannerHeight - ballSlotHeight) / 2 + bannerHeight
  );
  fieldOverlay.scale.set(fieldOverlayScale, fieldOverlayScale);
  fieldOverlay.anchor.set(0.5, 0.5);
  fieldOverlay.zOrder = 2;
  stage.addChild(fieldOverlay);

  // Add balls to scene.
  for (let i = 0; i < 5; i++) {
    const ballTexture = PIXI.loader.resources['resources/Item-Ball.png'].texture;
    const ballSprite = new PIXI.Sprite(ballTexture);
    const ballScale = ballSlotHeight / ballTexture.height / 1.5;
    const ballPosition = getBallPositionForSlot(ballTexture, ballSlot, i);
    ballSprite.anchor.set(0.5, 0.5);
    ballSprite.scale.set(ballScale, ballScale);
    ballSprite.position.set(ballPosition.x, ballPosition.y);
    ballSprite.zOrder = 3;

    const ball = new Ball();
    ball.sprite = ballSprite;
    state.balls.push(ball);

    initBallEvents(ball, ballSlot, fieldOverlay);
    stage.addChild(ballSprite);
  }

  // Add continue banner.
  const continueBannerTexture = PIXI.loader.resources['resources/Prediction-Button-Continue.png'].texture;
  const continueBanner = new PIXI.Sprite(continueBannerTexture);
  const continueBannerScale = window.innerWidth / continueBannerTexture.width;
  const continueBannerHeight = continueBannerTexture.height * continueBannerScale;
  continueBanner.position.set(0, window.innerHeight - continueBannerHeight);
  continueBanner.scale.set(continueBannerScale, continueBannerScale);
  continueBanner.visible = false;
  initContinueBannerEvents(continueBanner);
  stage.addChild(continueBanner);

  /**
   * Begin the animation loop.
   * @param {DOMHighResTimeStamp} now
   */
  function beginDrawLoop(now) {
    const numPendingActions = Object.keys(PIXI.actionManager.actions).length;
    if (numPendingActions > 0) {
      renderer.isDirty = true;
    }

    // For mobile phones, we don't go full-blast at 60 fps.
    // Re-render only if dirty.
    if (renderer.isDirty) {
      PIXI.actionManager.update((now - lastRenderTime) / 1000);
      fieldOverlay.update();
      renderer.render(stage);
      renderer.isDirty = false;
      lastRenderTime = now;
    }

    requestAnimationFrame(beginDrawLoop);
  };

  let lastRenderTime = performance.now();
  renderer.isDirty = true;
  PlaybookBridge.notifyLoaded();
  beginDrawLoop(lastRenderTime);
};

// Create and configure the renderer.
configureRenderer(renderer);
configureWebSocket(connection);

// Load the sprites we need.
PIXI.loader
  .add('resources/Prediction-BG-Grass.jpg')
  .add('resources/Prediction-Banner.png')
  .add('resources/Prediction-Holder-BallsSlot.png')
  .add('resources/Prediction-Button-Continue.png')
  .add('resources/Prediction-Overlay.png')
  .add('resources/Item-Ball.png')
  .add('resources/Item-Ball-Rotated.png')
  .load(setup);