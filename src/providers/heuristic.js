export class HeuristicProvider {
  constructor() {
    this.id = 'heuristic';
    this.model = 'deterministic-v1';
  }

  async generate() {
    throw new Error('HeuristicProvider does not implement generate(); the enhancer uses the local compiler.');
  }
}
