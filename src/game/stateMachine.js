export const GAME_STATES = Object.freeze({
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  DROPPING: 'DROPPING',
  GRABBING: 'GRABBING',
  RETURNING: 'RETURNING',
  RESULT: 'RESULT',
  COLLECTION: 'COLLECTION'
});

export class StateMachine {
  constructor(initialState) {
    this.current = initialState;
    this.listeners = new Set();
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setState(nextState) {
    if (this.current === nextState) {
      return;
    }

    const previous = this.current;
    this.current = nextState;
    this.listeners.forEach((listener) => listener(nextState, previous));
  }

  is(state) {
    return this.current === state;
  }
}
